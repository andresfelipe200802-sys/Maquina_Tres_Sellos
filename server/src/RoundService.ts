import type { ServerConfig } from './config.js';
import { AppError } from './errors.js';
import { createOpaqueToken, createRoomCode, hashPassword, normalizeName, sha256, verifyPassword } from './security.js';
import { StoreConflict, type Store } from './store/Store.js';
import type {
  Instructor,
  Player,
  PublicPlayer,
  PublicRound,
  Round,
  TelemetryPayload,
} from './types.js';

/**
 * Motivos visibles para el aprendiz cuando el servidor cierra su participación.
 * Se envían por WebSocket y también quedan en el evento JUGADOR_BLOQUEADO.
 */
export const BLOCK_REASONS = {
  SCREEN_EXIT:
    'La terminal detectó que saliste de la pantalla: recargaste, cerraste, cambiaste de pestaña o minimizaste la ventana durante la ronda. Tu puesto fue bloqueado automáticamente y no podrás volver hasta una nueva ronda.',
  ATTEMPT_LIMIT:
    'Alcanzaste el límite de 3 análisis fallidos. En modo sala la purga está deshabilitada, así que tu participación en esta ronda terminó.',
  COUNTER_RESET:
    'La terminal detectó un reinicio no autorizado de la muestra o de los contadores de intentos. Tu puesto fue bloqueado automáticamente.',
  INVALID_TELEMETRY:
    'La terminal detectó datos de juego inválidos o manipulados. Tu puesto fue bloqueado automáticamente.',
  INVALID_SOLUTION:
    'La terminal detectó una validación de victoria no autorizada. Tu puesto fue bloqueado automáticamente.',
  DUPLICATE_SESSION:
    'Se abrió otra pestaña o conexión con tu sesión durante la partida. Solo se permite una pantalla por aprendiz; tu puesto fue bloqueado automáticamente.',
  NO_PRESENCE:
    'La terminal dejó de recibir tu señal de presencia durante la partida. Tu puesto fue bloqueado automáticamente.',
  ABSENT_AT_START:
    'No estabas conectado cuando inició la ronda. Tu puesto fue bloqueado automáticamente.',
  WAITING_TIMEOUT:
    'No volviste a la sala de espera dentro del tiempo permitido. Tu puesto fue bloqueado para esta ronda.',
  TIME_EXPIRED: 'Se agotó el tiempo de la ronda sin completar la calibración.',
  GENERIC: 'Tu puesto quedó bloqueado. Podrás volver cuando el instructor abra una nueva ronda.',
} as const;

/** Si no llega telemetría en este plazo, la pantalla dejó de estar presente. */
const PRESENCE_TIMEOUT_MS = 20_000;
const MAX_FAILS = 3;
const MAX_MATCHED = 16;
const TELEMETRY_STATES = new Set([
  'STANDBY',
  'MANIPULATING',
  'EVALUATING',
  'SOLVED',
  'RESUELTO',
  'LOCKED',
]);

export interface RoundEvents {
  roundChanged(round: Round): void;
  playersChanged(roundId: number): void;
  playerChanged(player: Player): void;
  playerKicked(player: Player): void;
}

const silentEvents: RoundEvents = {
  roundChanged: () => undefined,
  playersChanged: () => undefined,
  playerChanged: () => undefined,
  playerKicked: () => undefined,
};

export interface LoginResult {
  token: string;
  expiresAt: number;
  instructor: {
    id: number;
    username: string;
    displayName: string;
  };
}

export interface JoinResult {
  token: string;
  player: PublicPlayer;
  round: PublicRound;
}

export interface PlayerStateResult {
  player: PublicPlayer;
  round: PublicRound;
}

export function toPublicPlayer(player: Player): PublicPlayer {
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

export function toPublicRound(round: Round, players: Player[]): PublicRound {
  return {
    id: round.id,
    code: round.code,
    status: round.status,
    maxPlayers: round.maxPlayers,
    durationSeconds: round.durationSeconds,
    startedAt: round.startedAt,
    deadlineAt: round.deadlineAt,
    frozenAt: round.frozenAt,
    playerCount: players.length,
  };
}

export class RoundService {
  private events: RoundEvents = silentEvents;
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();
  private readonly blockReasons = new Map<number, string>();

  public constructor(
    private readonly store: Store,
    private readonly config: ServerConfig,
  ) {}

  public setEvents(events: RoundEvents): void {
    this.events = events;
  }

  public async seedInstructor(): Promise<Instructor> {
    const passwordHash = await hashPassword(this.config.instructorPassword);
    return this.store.seedInstructor(
      this.config.instructorUser,
      passwordHash,
      'Instructor SENA',
    );
  }

  public async login(username: string, password: string): Promise<LoginResult> {
    const normalized = username.trim().toLowerCase();
    const instructor = await this.store.findInstructorByUsername(normalized);
    const valid = instructor
      ? await verifyPassword(instructor.passwordHash, password)
      : await verifyPassword(
          '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$3f9F5r0dYt6Xb5Q1x0oFvYvH7gP9wJ5zP2n1sQ4mK8E',
          password,
        );

    if (!instructor || !valid || instructor.status !== 'ACTIVO') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
    }

    const now = Date.now();
    const token = createOpaqueToken();
    const expiresAt = now + this.config.sessionTtlSeconds * 1000;
    await this.store.createInstructorSession(instructor.id, sha256(token), expiresAt);
    await this.store.updateInstructorLastAccess(instructor.id, now);

    return {
      token,
      expiresAt,
      instructor: {
        id: instructor.id,
        username: instructor.username,
        displayName: instructor.displayName,
      },
    };
  }

  public async authenticate(token: string): Promise<{ instructor: Instructor; sessionId: number }> {
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Sesión requerida.');
    const session = await this.store.findInstructorSessionByHash(sha256(token));
    if (!session || session.revoked || session.expiresAt <= Date.now()) {
      throw new AppError(401, 'SESSION_EXPIRED', 'La sesión expiró. Vuelve a iniciar sesión.');
    }
    const instructor = await this.store.findInstructorById(session.instructorId);
    if (!instructor || instructor.status !== 'ACTIVO') {
      throw new AppError(401, 'SESSION_INVALID', 'La sesión no es válida.');
    }
    return { instructor, sessionId: session.id };
  }

  public async logout(token: string): Promise<void> {
    if (!token) return;
    const session = await this.store.findInstructorSessionByHash(sha256(token));
    if (session) await this.store.revokeInstructorSession(session.id);
  }

  public async dashboard(instructorId: number): Promise<{
    round: PublicRound | null;
    players: PublicPlayer[];
  }> {
    const round = await this.store.getActiveRound();
    if (!round || round.instructorId !== instructorId) {
      const latest = await this.store.getLatestRound();
      if (!latest || latest.instructorId !== instructorId) {
        return { round: null, players: [] };
      }
      const players = await this.store.listPlayers(latest.id);
      return {
        round: toPublicRound(latest, players),
        players: players.map((player) => toPublicPlayer(this.withBlockReason(player))),
      };
    }
    const players = await this.store.listPlayers(round.id);
    return {
      round: toPublicRound(round, players),
      players: players.map((player) => toPublicPlayer(this.withBlockReason(player))),
    };
  }

  public async activeRoundPublic(): Promise<PublicRound | null> {
    const round = await this.store.getActiveRound();
    if (!round) return null;
    const players = await this.store.listPlayers(round.id);
    return toPublicRound(round, players);
  }

  public async getPublicRound(roundId: number): Promise<PublicRound | null> {
    const round = await this.store.getRoundById(roundId);
    if (!round) return null;
    const players = await this.store.listPlayers(round.id);
    return toPublicRound(round, players);
  }

  public async createRound(instructorId: number): Promise<PublicRound> {
    const active = await this.store.getActiveRound();
    if (active) {
      throw new AppError(409, 'ROUND_ACTIVE', 'Ya existe una ronda activa. Finalízala primero.');
    }

    const now = Date.now();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const round = await this.store.createRound({
          code: createRoomCode(),
          instructorId,
          maxPlayers: this.config.maxPlayers,
          durationSeconds: this.config.roundSeconds,
          now,
        });
        await this.store.appendEvent(round.id, null, 'RONDA_CREADA', { codigo: round.code }, now);
        const players = await this.store.listPlayers(round.id);
        this.events.roundChanged(round);
        this.events.playersChanged(round.id);
        return toPublicRound(round, players);
      } catch (error) {
        if (error instanceof StoreConflict && error.code === 'ROOM_CODE_TAKEN') continue;
        throw error;
      }
    }
    throw new AppError(500, 'ROOM_CODE_FAILED', 'No fue posible generar el código de sala.');
  }

  public async startRound(roundId: number, instructorId: number): Promise<PublicRound> {
    const round = await this.ownedRound(roundId, instructorId);
    if (round.status === 'EN_JUEGO') {
      const players = await this.store.listPlayers(round.id);
      return toPublicRound(round, players);
    }
    if (round.status !== 'ABIERTA') {
      throw new AppError(409, 'ROUND_NOT_OPEN', 'La ronda no está abierta para iniciar.');
    }

    const now = Date.now();
    const players = await this.store.listPlayers(round.id);
    round.status = 'EN_JUEGO';
    round.startedAt = now;
    round.deadlineAt = now + round.durationSeconds * 1000;
    round.frozenAt = null;
    await this.store.updateRound(round);

    for (const player of players) {
      if (player.status === 'EN_ESPERA') {
        player.status = 'JUGANDO';
        player.timeLeft = round.durationSeconds;
        player.lastSeen = now;
        player.disconnectedAt = null;
        player.blockedReason = null;
      } else if (player.status === 'DESCONECTADO') {
        // No se puede empezar a jugar desde una pantalla ausente: la ventana
        // de gracia de la sala de espera no se extiende a la partida.
        player.status = 'BLOQUEADO';
        player.blockedReason = BLOCK_REASONS.ABSENT_AT_START;
        player.disconnectedAt = player.disconnectedAt ?? now;
        this.blockReasons.set(player.id, BLOCK_REASONS.ABSENT_AT_START);
        await this.store.appendEvent(round.id, player.id, 'JUGADOR_BLOQUEADO', {
          motivo: BLOCK_REASONS.ABSENT_AT_START,
          codigo: 'AUSENTE_AL_INICIAR',
        }, now);
      }
      await this.store.updatePlayer(player);
    }
    await this.store.appendEvent(round.id, null, 'RONDA_INICIADA', { jugadores: players.length }, now);
    this.events.roundChanged(round);
    this.events.playersChanged(round.id);
    for (const player of players) this.events.playerChanged(player);
    return toPublicRound(round, players);
  }

  public async setFrozen(
    roundId: number,
    instructorId: number,
    frozen: boolean,
  ): Promise<PublicRound> {
    const round = await this.ownedRound(roundId, instructorId);
    const now = Date.now();

    if (frozen) {
      if (round.status !== 'EN_JUEGO') {
        throw new AppError(409, 'ROUND_NOT_LIVE', 'Solo se puede congelar una ronda en juego.');
      }
      round.status = 'CONGELADA';
      round.frozenAt = now;
      await this.store.updateRound(round);
      await this.store.appendEvent(round.id, null, 'RONDA_CONGELADA', null, now);
    } else {
      if (round.status !== 'CONGELADA') {
        throw new AppError(409, 'ROUND_NOT_FROZEN', 'La ronda no está congelada.');
      }
      const pausedMs = round.frozenAt ? Math.max(0, now - round.frozenAt) : 0;
      round.status = 'EN_JUEGO';
      round.frozenAt = null;
      round.deadlineAt = (round.deadlineAt ?? now) + pausedMs;
      await this.store.updateRound(round);
      await this.store.appendEvent(round.id, null, 'RONDA_REANUDADA', { pausaMs: pausedMs }, now);
    }

    const players = await this.store.listPlayers(round.id);
    if (!frozen) {
      // Al reanudar, la pantalla vuelve a estar activa: se reinicia el reloj
      // de presencia para no confundir la pausa con una salida del aprendiz.
      for (const player of players) {
        if (player.status !== 'JUGANDO') continue;
        player.lastSeen = now;
        await this.store.updatePlayer(player);
      }
    }
    this.events.roundChanged(round);
    this.events.playersChanged(round.id);
    return toPublicRound(round, players);
  }

  public async finishRound(roundId: number, instructorId: number): Promise<PublicRound> {
    const round = await this.ownedRound(roundId, instructorId);
    if (round.status === 'FINALIZADA') {
      const players = await this.store.listPlayers(round.id);
      return toPublicRound(round, players);
    }
    const now = Date.now();
    round.status = 'FINALIZADA';
    round.finishedAt = now;
    round.frozenAt = null;
    await this.store.updateRound(round);
    await this.store.appendEvent(round.id, null, 'RONDA_FINALIZADA', null, now);
    const players = await this.store.listPlayers(round.id);
    this.events.roundChanged(round);
    this.events.playersChanged(round.id);
    return toPublicRound(round, players);
  }

  public async kickPlayer(playerId: number, instructorId: number): Promise<void> {
    const player = await this.store.findPlayerById(playerId);
    if (!player) throw new AppError(404, 'PLAYER_NOT_FOUND', 'El aprendiz no existe.');
    const round = await this.ownedRound(player.roundId, instructorId);
    if (round.status === 'FINALIZADA') {
      throw new AppError(409, 'ROUND_FINISHED', 'La ronda ya finalizó.');
    }
    if (player.status === 'EXPULSADO') return;

    this.clearGraceTimer(player.id);
    const now = Date.now();
    player.status = 'EXPULSADO';
    player.kickedAt = now;
    player.disconnectedAt = now;
    await this.store.updatePlayer(player);
    await this.store.appendEvent(round.id, player.id, 'JUGADOR_EXPULSADO', null, now);
    this.events.playerKicked(player);
    this.events.playersChanged(round.id);
  }

  public async join(rawName: string): Promise<JoinResult> {
    const round = await this.store.getActiveRound();
    if (!round) {
      throw new AppError(404, 'NO_ROUND', 'No hay una ronda abierta. Espera al instructor.');
    }
    if (round.status !== 'ABIERTA') {
      throw new AppError(409, 'ROUND_STARTED', 'La ronda ya inició; no se admiten nuevos ingresos.');
    }

    const normalized = normalizeName(rawName);
    if (!normalized) {
      throw new AppError(
        400,
        'INVALID_NAME',
        'Escribe un nombre de 2 a 40 caracteres (letras, espacios, punto, guion o apóstrofo).',
      );
    }

    const token = createOpaqueToken();
    try {
      const player = await this.store.createPlayer({
        roundId: round.id,
        name: normalized.name,
        nameKey: normalized.nameKey,
        tokenHash: sha256(token),
        now: Date.now(),
      });
      await this.store.appendEvent(round.id, player.id, 'JUGADOR_INGRESO', null, Date.now());
      const players = await this.store.listPlayers(round.id);
      this.events.playersChanged(round.id);
      return {
        token,
        player: toPublicPlayer(player),
        round: toPublicRound(round, players),
      };
    } catch (error) {
      if (error instanceof StoreConflict) {
        const status = error.code === 'ROOM_FULL' ? 409 : 409;
        throw new AppError(status, error.code, error.message);
      }
      throw error;
    }
  }

  public async playerState(token: string): Promise<PlayerStateResult> {
    const player = await this.playerByToken(token);
    const round = await this.store.getRoundById(player.roundId);
    if (!round) throw new AppError(404, 'ROUND_NOT_FOUND', 'La ronda no existe.');
    const players = await this.store.listPlayers(round.id);
    return { player: toPublicPlayer(player), round: toPublicRound(round, players) };
  }

  /** Marca al jugador como conectado (autenticación de WebSocket o recarga). */
  public async markConnected(token: string): Promise<PlayerStateResult> {
    const player = await this.playerByToken(token);
    this.assertPlayerActive(player);
    const round = await this.store.getRoundById(player.roundId);
    if (!round) throw new AppError(404, 'ROUND_NOT_FOUND', 'La ronda no existe.');

    // Durante la partida no existe reconexión: si la pantalla se desconectó,
    // el jugador ya quedó bloqueado. Esto también cubre datos persistidos por
    // una versión anterior del servidor.
    if (round.status === 'EN_JUEGO' || round.status === 'CONGELADA') {
      if (player.status === 'DESCONECTADO' || player.disconnectedAt !== null) {
        await this.applyBlock(
          player,
          round,
          BLOCK_REASONS.SCREEN_EXIT,
          { codigo: 'SALIDA_PANTALLA' },
        );
        throw new AppError(403, 'PLAYER_BLOCKED', BLOCK_REASONS.SCREEN_EXIT);
      }
    }

    this.clearGraceTimer(player.id);
    const now = Date.now();
    player.connectedAt = now;
    player.lastSeen = now;
    player.disconnectedAt = null;
    if (round.status !== 'FINALIZADA' && player.status === 'DESCONECTADO') {
      player.status = round.status === 'ABIERTA' ? 'EN_ESPERA' : 'JUGANDO';
    }
    player.timeLeft = this.computeTimeLeft(round, now);
    await this.store.updatePlayer(player);
    await this.store.appendEvent(round.id, player.id, 'JUGADOR_RECONECTO', null, now);
    this.events.playerChanged(player);
    this.events.playersChanged(round.id);
    const players = await this.store.listPlayers(round.id);
    return { player: toPublicPlayer(player), round: toPublicRound(round, players) };
  }

  public async markDisconnected(playerId: number): Promise<void> {
    const player = await this.store.findPlayerById(playerId);
    if (!player) return;
    if (player.status === 'EXPULSADO' || player.status === 'CALIBRADO' || player.status === 'BLOQUEADO') {
      return;
    }
    const round = await this.store.getRoundById(player.roundId);
    if (!round || round.status === 'FINALIZADA') return;

    if (round.status === 'EN_JUEGO' || round.status === 'CONGELADA') {
      // Regla de sala: salir/recargar durante la partida bloquea el puesto de
      // inmediato. La ventana de gracia queda reservada para la sala de espera.
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.SCREEN_EXIT,
        { codigo: 'SALIDA_PANTALLA' },
      );
      return;
    }

    const now = Date.now();
    player.status = 'DESCONECTADO';
    player.disconnectedAt = now;
    player.lastSeen = now;
    await this.store.updatePlayer(player);
    await this.store.appendEvent(round.id, player.id, 'JUGADOR_DESCONECTO', null, now);
    this.events.playerChanged(player);
    this.events.playersChanged(round.id);

    this.clearGraceTimer(player.id);
    const timer = setTimeout(() => {
      this.graceTimers.delete(player.id);
      void this.blockIfStillGone(player.id);
    }, this.config.disconnectGraceSeconds * 1000);
    timer.unref?.();
    this.graceTimers.set(player.id, timer);
  }

  /**
   * Bloqueo explícito solicitado por el canal (pestaña duplicada) o por una
   * violación de integridad. Es idempotente y no toca jugadores ya calificados.
   */
  public async blockPlayer(
    playerId: number,
    reason: string,
    detail: Record<string, unknown> | null = null,
  ): Promise<void> {
    const player = await this.store.findPlayerById(playerId);
    if (!player) return;
    if (
      player.status === 'EXPULSADO' ||
      player.status === 'CALIBRADO' ||
      player.status === 'BLOQUEADO'
    ) {
      return;
    }
    const round = await this.store.getRoundById(player.roundId);
    if (!round || round.status === 'FINALIZADA') return;
    const enriched = this.withBlockReason(player);
    await this.applyBlock(enriched, round, reason, detail);
  }

  /** La pestaña pasó a segundo plano, se minimizó o se abandonó. */
  public async reportScreenExit(token: string): Promise<void> {
    const player = await this.playerByToken(token);
    const round = await this.store.getRoundById(player.roundId);
    if (!round || (round.status !== 'EN_JUEGO' && round.status !== 'CONGELADA')) return;
    if (player.status !== 'JUGANDO') return;
    await this.applyBlock(
      player,
      round,
      BLOCK_REASONS.SCREEN_EXIT,
      { codigo: 'PANTALLA_OCULTA' },
    );
  }

  public async telemetry(token: string, payload: TelemetryPayload): Promise<void> {
    const player = await this.playerByToken(token);
    this.assertPlayerActive(player);
    const round = await this.store.getRoundById(player.roundId);
    if (!round) throw new AppError(404, 'ROUND_NOT_FOUND', 'La ronda no existe.');
    if (round.status === 'ABIERTA' || round.status === 'FINALIZADA') return;
    if (player.status === 'CALIBRADO') return;

    const now = Date.now();
    const moves = parseCounter(payload.moves);
    const fails = parseCounter(payload.fails);
    const matched = parseCounter(payload.matched);
    const resets = parseCounter(payload.resets ?? 0);
    const state = typeof payload.state === 'string' ? payload.state : '';

    if (
      moves === null ||
      fails === null ||
      matched === null ||
      resets === null ||
      matched > MAX_MATCHED ||
      !TELEMETRY_STATES.has(state)
    ) {
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.INVALID_TELEMETRY,
        { codigo: 'TELEMETRIA_INVALIDA' },
      );
      return;
    }

    // Una purga local reinicia la muestra y los fallos. Aunque el aprendiz
    // vuelva a superar los contadores anteriores antes del siguiente latido,
    // el contador de reseteos delata la maniobra.
    if (resets > 0) {
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.COUNTER_RESET,
        { codigo: 'PURGA_DETECTADA', reseteos: resets },
      );
      return;
    }

    // En modo sala los contadores solo pueden crecer. Un descenso solo es
    // posible si se ejecutó una purga o se manipuló el cliente.
    if (moves < player.moves || fails < player.fails) {
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.COUNTER_RESET,
        { codigo: 'CONTADOR_REINICIADO', movimientos: moves, fallos: fails },
      );
      return;
    }

    player.lastSeen = now;
    player.moves = Math.max(player.moves, moves);
    player.fails = Math.max(player.fails, fails);
    player.matched = Math.max(player.matched, matched);
    player.timeLeft = this.computeTimeLeft(round, now);

    if (player.fails >= MAX_FAILS) {
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.ATTEMPT_LIMIT,
        { codigo: 'LIMITE_FALLOS', fallos: player.fails },
      );
      return;
    }

    if (state === 'SOLVED' || state === 'RESUELTO') {
      if (matched !== MAX_MATCHED) {
        await this.applyBlock(
          player,
          round,
          BLOCK_REASONS.INVALID_SOLUTION,
          { codigo: 'VICTORIA_INVALIDA', coincidencias: matched },
        );
        return;
      }
      player.status = 'CALIBRADO';
      player.blockedReason = null;
      await this.store.appendEvent(
        round.id,
        player.id,
        'TELEMETRIA',
        { estado: 'CALIBRADO', movimientos: player.moves, fallos: player.fails },
        now,
      );
    } else if (player.status === 'DESCONECTADO') {
      player.status = 'JUGANDO';
      player.disconnectedAt = null;
    }

    await this.store.updatePlayer(player);
    this.events.playerChanged(player);
    this.events.playersChanged(round.id);
  }

  public async tick(now = Date.now()): Promise<void> {
    const round = await this.store.getActiveRound();
    if (!round) return;

    if (round.status === 'EN_JUEGO' && round.deadlineAt !== null && now >= round.deadlineAt) {
      round.status = 'FINALIZADA';
      round.finishedAt = now;
      round.frozenAt = null;
      await this.store.updateRound(round);
      await this.store.appendEvent(round.id, null, 'TIEMPO_AGOTADO', null, now);

      const players = await this.store.listPlayers(round.id);
      for (const player of players) {
        if (player.status === 'CALIBRADO' || player.status === 'EXPULSADO' || player.status === 'BLOQUEADO') {
          continue;
        }
        player.timeLeft = 0;
        await this.applyBlock(
          player,
          round,
          BLOCK_REASONS.TIME_EXPIRED,
          { codigo: 'TIEMPO_AGOTADO' },
        );
      }
      this.events.roundChanged(round);
      this.events.playersChanged(round.id);
      return;
    }

    if (round.status === 'FINALIZADA') return;
    const players = await this.store.listPlayers(round.id);

    if (round.status === 'EN_JUEGO') {
      for (const player of players) {
        if (player.status !== 'JUGANDO' || player.lastSeen === null) continue;
        if (now - player.lastSeen < PRESENCE_TIMEOUT_MS) continue;
        await this.applyBlock(
          player,
          round,
          BLOCK_REASONS.NO_PRESENCE,
          { codigo: 'SIN_PRESENCIA', ultimoLatido: player.lastSeen },
        );
      }
    }

    for (const player of players) {
      if (player.status !== 'DESCONECTADO' || player.disconnectedAt === null) continue;
      if (now - player.disconnectedAt >= this.config.disconnectGraceSeconds * 1000) {
        await this.blockIfStillGone(player.id, now);
      }
    }
  }

  public close(): void {
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.graceTimers.clear();
  }

  private async blockIfStillGone(playerId: number, now = Date.now()): Promise<void> {
    const player = await this.store.findPlayerById(playerId);
    if (!player || player.status !== 'DESCONECTADO') return;
    const round = await this.store.getRoundById(player.roundId);
    if (!round || round.status === 'FINALIZADA') return;
    if (round.status === 'EN_JUEGO' || round.status === 'CONGELADA') {
      await this.applyBlock(
        player,
        round,
        BLOCK_REASONS.SCREEN_EXIT,
        { codigo: 'SALIDA_PANTALLA' },
        now,
      );
      return;
    }
    if (player.disconnectedAt !== null && now - player.disconnectedAt < this.config.disconnectGraceSeconds * 1000) {
      return;
    }

    await this.applyBlock(
      player,
      round,
      BLOCK_REASONS.WAITING_TIMEOUT,
      { codigo: 'SIN_RECONEXION' },
      now,
    );
  }

  private async applyBlock(
    player: Player,
    round: Round,
    reason: string,
    detail: Record<string, unknown> | null = null,
    now = Date.now(),
  ): Promise<void> {
    if (
      player.status === 'EXPULSADO' ||
      player.status === 'CALIBRADO' ||
      player.status === 'BLOQUEADO'
    ) {
      return;
    }
    this.clearGraceTimer(player.id);
    player.status = 'BLOQUEADO';
    player.blockedReason = reason;
    player.disconnectedAt = player.disconnectedAt ?? now;
    this.blockReasons.set(player.id, reason);
    await this.store.updatePlayer(player);
    await this.store.appendEvent(
      round.id,
      player.id,
      'JUGADOR_BLOQUEADO',
      { motivo: reason, ...(detail ?? {}) },
      now,
    );
    this.events.playerChanged(player);
    this.events.playersChanged(round.id);
  }

  private withBlockReason(player: Player): Player {
    if (player.status === 'BLOQUEADO' && !player.blockedReason) {
      player.blockedReason = this.blockReasons.get(player.id) ?? BLOCK_REASONS.GENERIC;
    }
    return player;
  }

  private async ownedRound(roundId: number, instructorId: number): Promise<Round> {
    const round = await this.store.getRoundById(roundId);
    if (!round) throw new AppError(404, 'ROUND_NOT_FOUND', 'La ronda no existe.');
    if (round.instructorId !== instructorId) {
      throw new AppError(403, 'ROUND_FORBIDDEN', 'No tienes control sobre esta ronda.');
    }
    return round;
  }

  private async playerByToken(token: string): Promise<Player> {
    if (!token) throw new AppError(401, 'PLAYER_AUTH_REQUIRED', 'Token de aprendiz requerido.');
    const player = await this.store.findPlayerByTokenHash(sha256(token));
    if (!player) throw new AppError(401, 'PLAYER_SESSION_INVALID', 'El acceso no es válido.');
    if (player.status === 'BLOQUEADO' && !player.blockedReason) {
      player.blockedReason = this.blockReasons.get(player.id) ?? BLOCK_REASONS.GENERIC;
    }
    return player;
  }

  private assertPlayerActive(player: Player): void {
    if (player.status === 'EXPULSADO') {
      throw new AppError(403, 'PLAYER_KICKED', 'El instructor retiró tu acceso a esta ronda.');
    }
    if (player.status === 'BLOQUEADO') {
      throw new AppError(
        403,
        'PLAYER_BLOCKED',
        player.blockedReason ?? BLOCK_REASONS.GENERIC,
      );
    }
  }

  private computeTimeLeft(round: Round, now: number): number {
    if (round.status === 'ABIERTA') return round.durationSeconds;
    if (round.deadlineAt === null) return 0;
    const reference = round.status === 'CONGELADA' && round.frozenAt !== null ? round.frozenAt : now;
    return Math.max(0, Math.ceil((round.deadlineAt - reference) / 1000));
  }

  private clearGraceTimer(playerId: number): void {
    const timer = this.graceTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(playerId);
    }
  }
}

function parseCounter(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.min(100_000, Math.floor(parsed));
}
