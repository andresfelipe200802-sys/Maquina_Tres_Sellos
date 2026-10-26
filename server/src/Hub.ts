import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { ServerConfig } from './config.js';
import { isAppError } from './errors.js';
import { BLOCK_REASONS, type RoundEvents, type RoundService } from './RoundService.js';
import type { Player, PublicPlayer, PublicRound, Round } from './types.js';

type Role = 'instructor' | 'player';

interface ClientConnection {
  socket: WebSocket;
  role: Role | null;
  instructorId: number | null;
  playerId: number | null;
  roundId: number | null;
  playerToken: string | null;
  alive: boolean;
  authTimer: NodeJS.Timeout;
}

interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

const MAX_MESSAGE_BYTES = 4096;
const AUTH_TIMEOUT_MS = 10_000;

/**
 * Canal en tiempo real. La autenticación viaja en el primer mensaje
 * (Bearer opaco), nunca en la URL, para no filtrar tokens en logs.
 */
export class Hub implements RoundEvents {
  private readonly wss: WebSocketServer;
  private readonly connections = new Set<ClientConnection>();
  private readonly playerSockets = new Map<number, Set<ClientConnection>>();
  private readonly instructorSockets = new Set<ClientConnection>();
  private readonly heartbeat: NodeJS.Timeout;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private readonly messageQueues = new WeakMap<ClientConnection, Promise<void>>();
  private closing = false;

  public constructor(
    private readonly server: HttpServer,
    private readonly service: RoundService,
    private readonly config: ServerConfig,
  ) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
    server.on('upgrade', (request, socket, head) => this.handleUpgrade(request, socket, head));
    this.wss.on('connection', (socket) => this.handleConnection(socket));
    this.heartbeat = setInterval(() => this.pingAll(), 30_000);
    this.heartbeat.unref?.();
    this.service.setEvents(this);
  }

  public close(): void {
    this.closing = true;
    clearInterval(this.heartbeat);
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    for (const connection of this.connections) {
      connection.socket.close(1001, 'Servidor detenido');
    }
    this.wss.close();
  }

  public roundChanged(round: Round): void {
    void this.broadcastRound(round);
    this.scheduleInstructorSnapshot();
  }

  public playersChanged(_roundId: number): void {
    this.scheduleInstructorSnapshot();
  }

  public playerChanged(player: Player): void {
    const payload: ServerMessage = {
      type: 'player.state',
      player: toClientPlayer(player),
      serverNow: Date.now(),
    };
    for (const connection of this.playerSockets.get(player.id) ?? []) {
      this.send(connection.socket, payload);
    }
    this.scheduleInstructorSnapshot();
  }

  public playerKicked(player: Player): void {
    const payload: ServerMessage = {
      type: 'player.kicked',
      reason: 'El instructor retiró tu acceso a esta ronda.',
      serverNow: Date.now(),
    };
    for (const connection of this.playerSockets.get(player.id) ?? []) {
      this.send(connection.socket, payload);
      setTimeout(() => connection.socket.close(4403, 'Expulsado'), 120);
    }
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const origin = request.headers.origin;
    if (origin && !this.config.clientOrigins.includes(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    this.wss.handleUpgrade(request, socket, head, (webSocket) => {
      this.wss.emit('connection', webSocket, request);
    });
  }

  private handleConnection(socket: WebSocket): void {
    const connection: ClientConnection = {
      socket,
      role: null,
      instructorId: null,
      playerId: null,
      roundId: null,
      playerToken: null,
      alive: true,
      authTimer: setTimeout(() => {
        if (!connection.role) socket.close(4401, 'Autenticación requerida');
      }, AUTH_TIMEOUT_MS),
    };
    connection.authTimer.unref?.();
    this.connections.add(connection);

    socket.on('pong', () => {
      connection.alive = true;
    });
    socket.on('message', (data) => {
      // Los mensajes de una misma conexión se procesan en orden. Sin esta
      // cola, dos telemetrías concurrentes podían leer el mismo contador y la
      // más vieja sobrescribir a la nueva (pérdida silenciosa de fallos).
      const previous = this.messageQueues.get(connection) ?? Promise.resolve();
      const next = previous
        .then(
          () => this.handleMessage(connection, data),
          () => this.handleMessage(connection, data),
        )
        .catch((error: unknown) => {
          console.error('[ws] error procesando mensaje:', error);
          this.sendError(connection.socket, 'INTERNAL_ERROR', 'Error interno del servidor.');
        });
      this.messageQueues.set(connection, next);
    });
    socket.on('close', () => {
      clearTimeout(connection.authTimer);
      this.connections.delete(connection);
      if (connection.role === 'instructor') this.instructorSockets.delete(connection);
      if (connection.role === 'player' && connection.playerId !== null) {
        const set = this.playerSockets.get(connection.playerId);
        set?.delete(connection);
        if (set && set.size === 0) {
          this.playerSockets.delete(connection.playerId);
          if (connection.playerId && !this.closing) {
            void this.service.markDisconnected(connection.playerId).catch((error: unknown) => {
              console.error('[ws] no se pudo registrar la desconexión:', error);
            });
          }
        }
      }
    });
    socket.on('error', () => {
      socket.terminate();
    });
  }

  private async handleMessage(connection: ClientConnection, raw: RawData): Promise<void> {
    const size = Array.isArray(raw)
      ? raw.reduce((total, chunk) => total + chunk.byteLength, 0)
      : raw.byteLength;
    if (size > MAX_MESSAGE_BYTES) {
      connection.socket.close(4409, 'Mensaje demasiado grande');
      return;
    }

    let message: ServerMessage;
    try {
      const parsed: unknown = JSON.parse(raw.toString('utf8'));
      if (!isRecord(parsed) || typeof parsed['type'] !== 'string') throw new Error('bad');
      message = parsed as ServerMessage;
    } catch {
      this.sendError(connection.socket, 'BAD_MESSAGE', 'Mensaje inválido.');
      return;
    }

    if (message.type === 'ping') {
      this.send(connection.socket, { type: 'pong', t: message['t'] ?? null, serverNow: Date.now() });
      return;
    }

    if (message.type === 'auth') {
      await this.authenticate(connection, message);
      return;
    }

    if (!connection.role) {
      this.sendError(connection.socket, 'AUTH_REQUIRED', 'Autentícate primero.');
      connection.socket.close(4401, 'Autenticación requerida');
      return;
    }

    if (connection.role === 'player' && message.type === 'telemetry') {
      const telemetry = message['telemetry'];
      if (!isRecord(telemetry) || !connection.playerToken) return;
      try {
        await this.service.telemetry(connection.playerToken, {
          moves: Number(telemetry['moves'] ?? 0),
          fails: Number(telemetry['fails'] ?? 0),
          matched: Number(telemetry['matched'] ?? 0),
          timeLeft: Number(telemetry['timeLeft'] ?? 0),
          state: String(telemetry['state'] ?? 'DESCONOCIDO'),
          resets: Number(telemetry['resets'] ?? 0),
        });
      } catch (error) {
        this.handleServiceError(connection, error);
      }
      return;
    }

    if (connection.role === 'player' && message.type === 'presence') {
      if (message['hidden'] === true && connection.playerToken) {
        try {
          await this.service.reportScreenExit(connection.playerToken);
        } catch (error) {
          this.handleServiceError(connection, error);
        }
      }
      return;
    }

    if (connection.role === 'instructor' && message.type === 'refresh') {
      await this.sendInstructorSnapshot(connection);
      return;
    }

    this.sendError(connection.socket, 'UNKNOWN_MESSAGE', 'Acción no reconocida.');
  }

  private async authenticate(connection: ClientConnection, message: ServerMessage): Promise<void> {
    if (connection.role) {
      this.sendError(connection.socket, 'ALREADY_AUTHENTICATED', 'La conexión ya está autenticada.');
      return;
    }
    const token = typeof message['token'] === 'string' ? message['token'] : '';
    const role = message['role'] === 'instructor' ? 'instructor' : 'player';
    if (!token) {
      connection.socket.close(4401, 'Token requerido');
      return;
    }

    try {
      if (role === 'instructor') {
        const { instructor } = await this.service.authenticate(token);
        connection.role = 'instructor';
        connection.instructorId = instructor.id;
        clearTimeout(connection.authTimer);
        this.instructorSockets.add(connection);
        this.send(connection.socket, {
          type: 'auth.ok',
          role: 'instructor',
          instructor: {
            id: instructor.id,
            username: instructor.username,
            displayName: instructor.displayName,
          },
        });
        await this.sendInstructorSnapshot(connection);
        return;
      }

      const state = await this.service.markConnected(token);
      const previousSockets = this.playerSockets.get(state.player.id);
      const isLive = state.round.status === 'EN_JUEGO' || state.round.status === 'CONGELADA';

      // Durante la partida solo puede existir una pantalla por aprendiz. Si
      // llega una segunda conexión (otra pestaña o una recarga que se adelantó
      // al cierre de la anterior), se bloquea el puesto de inmediato.
      if (isLive && previousSockets && previousSockets.size > 0) {
        await this.service.blockPlayer(
          state.player.id,
          BLOCK_REASONS.DUPLICATE_SESSION,
          { codigo: 'SESION_DUPLICADA' },
        );
        this.sendError(connection.socket, 'PLAYER_BLOCKED', BLOCK_REASONS.DUPLICATE_SESSION);
        connection.socket.close(4403, 'PLAYER_BLOCKED');
        return;
      }

      connection.role = 'player';
      connection.playerToken = token;
      connection.playerId = state.player.id;
      connection.roundId = state.round.id;
      clearTimeout(connection.authTimer);
      const set = previousSockets ?? new Set<ClientConnection>();
      set.add(connection);
      this.playerSockets.set(state.player.id, set);

      // En la sala de espera una nueva pestaña reemplaza a la anterior sin
      // bloquear; al añadir primero la nueva, el cierre de la vieja no dispara
      // una desconexión del jugador.
      for (const previous of previousSockets ?? []) {
        if (previous === connection) continue;
        this.send(previous.socket, {
          type: 'player.superseded',
          reason:
            'Esta pestaña fue reemplazada por otra conexión del mismo aprendiz. Solo la pestaña más reciente permanece activa.',
          serverNow: Date.now(),
        });
        previous.socket.close(4000, 'Sesión reemplazada');
      }

      this.send(connection.socket, {
        type: 'auth.ok',
        role: 'player',
        player: state.player,
        round: state.round,
        serverNow: Date.now(),
      });
    } catch (error) {
      if (isAppError(error)) {
        this.sendError(connection.socket, error.code, error.message);
        connection.socket.close(4403, error.code);
      } else {
        this.sendError(connection.socket, 'AUTH_FAILED', 'No fue posible autenticar la conexión.');
        connection.socket.close(1011, 'Error interno');
      }
    }
  }

  private async broadcastRound(round: Round): Promise<void> {
    const publicRound = await this.service.getPublicRound(round.id);
    if (!publicRound) return;
    const payload: ServerMessage = {
      type: round.status === 'FINALIZADA' ? 'round.finished' : 'round.state',
      round: publicRound,
      serverNow: Date.now(),
    };
    for (const connection of this.connections) {
      if (connection.role !== 'player' || connection.roundId !== round.id) continue;
      this.send(connection.socket, payload);
    }
    if (round.status === 'FINALIZADA') {
      setTimeout(() => {
        for (const connection of this.connections) {
          if (connection.role === 'player' && connection.roundId === round.id) {
            connection.socket.close(4000, 'Ronda finalizada');
          }
        }
      }, 3_000).unref?.();
    }
  }

  private scheduleInstructorSnapshot(): void {
    if (this.snapshotTimer) return;
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      void Promise.all(
        [...this.instructorSockets].map((connection) => this.sendInstructorSnapshot(connection)),
      );
    }, 250);
    this.snapshotTimer.unref?.();
  }

  private async sendInstructorSnapshot(connection: ClientConnection): Promise<void> {
    if (connection.instructorId === null) return;
    try {
      const dashboard = await this.service.dashboard(connection.instructorId);
      this.send(connection.socket, {
        type: 'snapshot',
        round: dashboard.round,
        players: dashboard.players,
        serverNow: Date.now(),
      });
    } catch (error) {
      this.handleServiceError(connection, error);
    }
  }

  private pingAll(): void {
    for (const connection of this.connections) {
      if (!connection.alive) {
        connection.socket.terminate();
        continue;
      }
      connection.alive = false;
      connection.socket.ping();
    }
  }

  private send(socket: WebSocket, payload: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  private sendError(socket: WebSocket, code: string, message: string): void {
    this.send(socket, { type: 'error', code, message, serverNow: Date.now() });
  }

  private handleServiceError(connection: ClientConnection, error: unknown): void {
    if (isAppError(error)) {
      this.sendError(connection.socket, error.code, error.message);
      if (error.code === 'PLAYER_KICKED' || error.code === 'PLAYER_BLOCKED') {
        connection.socket.close(4403, error.code);
      }
    } else {
      this.sendError(connection.socket, 'INTERNAL_ERROR', 'Error interno del servidor.');
    }
  }
}

function toClientPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    status: player.status,
    moves: player.moves,
    fails: player.fails,
    matched: player.matched,
    timeLeft: player.timeLeft,
    connected:
      player.status !== 'DESCONECTADO' &&
      player.status !== 'EXPULSADO' &&
      player.status !== 'BLOQUEADO',
    kickedAt: player.kickedAt,
    blockedReason: player.blockedReason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type { PublicRound };
