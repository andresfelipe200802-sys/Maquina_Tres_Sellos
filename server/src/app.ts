import { createServer, type Server } from 'node:http';
import cors, { type CorsOptions } from 'cors';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { ServerConfig } from './config.js';
import { AppError, isAppError } from './errors.js';
import type { RoundService } from './RoundService.js';

export interface AppBundle {
  app: express.Express;
  server: Server;
}

function parseId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_ID', 'Identificador inválido.');
  }
  return id;
}

function rateLimitHandler(_request: Request, response: Response): void {
  response.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Espera un momento.' },
  });
}

export function createApp(service: RoundService, config: ServerConfig): AppBundle {
  const app = express();
  const server = createServer(app);

  if (config.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS_ORIGIN_NOT_ALLOWED'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
    credentials: false,
  };

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '16kb' }));

  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 3_000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
  const joinLimiter = rateLimit({
    // Una sala completa (45) puede compartir la misma IP por NAT del aula.
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
  app.use('/api/', globalLimiter);
  // /health queda fuera de /api/: se limita también para que nadie lo sature
  // desde el túnel (el script de auto-prueba solo lo consulta un par de veces).
  app.use('/health', globalLimiter);

  const requireInstructor: RequestHandler = (request, response, next) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new AppError(401, 'AUTH_REQUIRED', 'Inicia sesión como instructor.'));
      return;
    }
    service
      .authenticate(header.slice('Bearer '.length).trim())
      .then(({ instructor }) => {
        response.locals['instructorId'] = instructor.id;
        response.locals['instructor'] = instructor;
        next();
      })
      .catch(next);
  };

  const requirePlayer: RequestHandler = (request, response, next) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next(new AppError(401, 'PLAYER_AUTH_REQUIRED', 'Acceso de aprendiz requerido.'));
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    service
      .playerState(token)
      .then((state) => {
        response.locals['playerToken'] = token;
        response.locals['player'] = state.player;
        next();
      })
      .catch(next);
  };

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'sena-water-sample-control',
      time: Date.now(),
      storage: config.databaseUrl ? 'mysql' : 'memory',
    });
  });

  app.get('/api/round', async (_request, response) => {
    const round = await service.activeRoundPublic();
    response.json({
      round,
      joinable:
        round !== null && round.status === 'ABIERTA' && round.playerCount < round.maxPlayers,
      serverNow: Date.now(),
    });
  });

  app.post('/api/instructor/login', loginLimiter, async (request, response) => {
    const body = request.body as Record<string, unknown> | undefined;
    const username = typeof body?.['username'] === 'string' ? body['username'] : '';
    const password = typeof body?.['password'] === 'string' ? body['password'] : '';
    if (!username || !password || username.length > 80 || password.length > 200) {
      throw new AppError(400, 'INVALID_LOGIN', 'Usuario y contraseña son obligatorios.');
    }
    const result = await service.login(username, password);
    response.json(result);
  });

  app.post('/api/instructor/logout', requireInstructor, async (request, response) => {
    const header = request.headers.authorization ?? '';
    await service.logout(header.slice('Bearer '.length).trim());
    response.json({ ok: true });
  });

  app.get('/api/instructor/me', requireInstructor, async (_request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    const instructor = response.locals['instructor'] as {
      id: number;
      username: string;
      displayName: string;
    };
    const dashboard = await service.dashboard(instructorId);
    response.json({ instructor, ...dashboard, serverNow: Date.now() });
  });

  app.post('/api/instructor/rounds', requireInstructor, async (_request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    const round = await service.createRound(instructorId);
    response.status(201).json({ round, serverNow: Date.now() });
  });

  app.post('/api/instructor/rounds/:id/start', requireInstructor, async (request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    const round = await service.startRound(parseId(request.params['id']), instructorId);
    response.json({ round, serverNow: Date.now() });
  });

  app.post('/api/instructor/rounds/:id/freeze', requireInstructor, async (request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    const body = request.body as Record<string, unknown> | undefined;
    const frozen = body?.['frozen'] !== false;
    const round = await service.setFrozen(parseId(request.params['id']), instructorId, frozen);
    response.json({ round, serverNow: Date.now() });
  });

  app.post('/api/instructor/rounds/:id/finish', requireInstructor, async (request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    const round = await service.finishRound(parseId(request.params['id']), instructorId);
    response.json({ round, serverNow: Date.now() });
  });

  app.post('/api/instructor/players/:id/kick', requireInstructor, async (request, response) => {
    const instructorId = response.locals['instructorId'] as number;
    await service.kickPlayer(parseId(request.params['id']), instructorId);
    response.json({ ok: true });
  });

  app.post('/api/players/join', joinLimiter, async (request, response) => {
    const body = request.body as Record<string, unknown> | undefined;
    const name = typeof body?.['name'] === 'string' ? body['name'] : '';
    const result = await service.join(name);
    response.status(201).json(result);
  });

  app.get('/api/players/me', requirePlayer, (_request, response) => {
    response.json({
      player: response.locals['player'],
      serverNow: Date.now(),
    });
  });

  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Ruta no encontrada.'));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (isAppError(error)) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error instanceof SyntaxError) {
      response
        .status(400)
        .json({ error: { code: 'BAD_JSON', message: 'El cuerpo de la solicitud no es JSON válido.' } });
      return;
    }
    if (error instanceof Error && error.message === 'CORS_ORIGIN_NOT_ALLOWED') {
      response
        .status(403)
        .json({ error: { code: 'CORS_FORBIDDEN', message: 'Origen no autorizado.' } });
      return;
    }
    console.error('[api] error no controlado:', error);
    response
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  });

  return { app, server };
}

export function requireInstructorToken(request: Request): string {
  const header = request.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}
