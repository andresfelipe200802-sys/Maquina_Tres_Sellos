import type {
  GameEvent,
  GameEventType,
  Instructor,
  InstructorSession,
  Player,
  Round,
} from '../types.js';
import type { CreatePlayerInput, CreateRoundInput, Store } from './Store.js';
import { StoreConflict } from './Store.js';

/**
 * Almacén en memoria para desarrollo y pruebas.
 * No persiste entre reinicios; el servidor lo advierte al arrancar.
 */
export class MemoryStore implements Store {
  private instructorId = 0;
  private sessionId = 0;
  private roundId = 0;
  private playerId = 0;
  private eventId = 0;
  private readonly instructors = new Map<number, Instructor>();
  private readonly sessions = new Map<number, InstructorSession>();
  private readonly rounds = new Map<number, Round>();
  private readonly players = new Map<number, Player>();
  private readonly events: GameEvent[] = [];

  public async init(): Promise<void> {
    return Promise.resolve();
  }

  public async seedInstructor(
    username: string,
    passwordHash: string,
    displayName: string,
  ): Promise<Instructor> {
    const existing = [...this.instructors.values()].find((item) => item.username === username);
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.displayName = displayName;
      return { ...existing };
    }
    this.instructorId += 1;
    const instructor: Instructor = {
      id: this.instructorId,
      username,
      passwordHash,
      displayName,
      status: 'ACTIVO',
    };
    this.instructors.set(instructor.id, instructor);
    return { ...instructor };
  }

  public async findInstructorByUsername(username: string): Promise<Instructor | null> {
    const found = [...this.instructors.values()].find((item) => item.username === username);
    return found ? { ...found } : null;
  }

  public async findInstructorById(id: number): Promise<Instructor | null> {
    const found = this.instructors.get(id);
    return found ? { ...found } : null;
  }

  public async updateInstructorLastAccess(_id: number, _at: number): Promise<void> {
    return Promise.resolve();
  }

  public async createInstructorSession(
    instructorId: number,
    tokenHash: string,
    expiresAt: number,
  ): Promise<InstructorSession> {
    this.sessionId += 1;
    const session: InstructorSession = {
      id: this.sessionId,
      instructorId,
      tokenHash,
      expiresAt,
      revoked: false,
    };
    this.sessions.set(session.id, session);
    return { ...session };
  }

  public async findInstructorSessionByHash(tokenHash: string): Promise<InstructorSession | null> {
    const found = [...this.sessions.values()].find((item) => item.tokenHash === tokenHash);
    return found ? { ...found } : null;
  }

  public async revokeInstructorSession(id: number): Promise<void> {
    const session = this.sessions.get(id);
    if (session) session.revoked = true;
  }

  public async createRound(input: CreateRoundInput): Promise<Round> {
    if ([...this.rounds.values()].some((round) => round.code === input.code)) {
      throw new StoreConflict('ROOM_CODE_TAKEN', 'El código de sala ya existe.');
    }
    this.roundId += 1;
    const round: Round = {
      id: this.roundId,
      code: input.code,
      instructorId: input.instructorId,
      status: 'ABIERTA',
      maxPlayers: input.maxPlayers,
      durationSeconds: input.durationSeconds,
      createdAt: input.now,
      startedAt: null,
      deadlineAt: null,
      frozenAt: null,
      finishedAt: null,
    };
    this.rounds.set(round.id, round);
    return { ...round };
  }

  public async getActiveRound(): Promise<Round | null> {
    const active = [...this.rounds.values()]
      .filter((round) => round.status !== 'FINALIZADA')
      .sort((a, b) => b.id - a.id)[0];
    return active ? { ...active } : null;
  }

  public async getLatestRound(): Promise<Round | null> {
    const latest = [...this.rounds.values()].sort((a, b) => b.id - a.id)[0];
    return latest ? { ...latest } : null;
  }

  public async getRoundById(id: number): Promise<Round | null> {
    const round = this.rounds.get(id);
    return round ? { ...round } : null;
  }

  public async updateRound(round: Round): Promise<void> {
    this.rounds.set(round.id, { ...round });
  }

  public async createPlayer(input: CreatePlayerInput): Promise<Player> {
    const duplicate = [...this.players.values()].some(
      (player) => player.roundId === input.roundId && player.nameKey === input.nameKey,
    );
    if (duplicate) {
      throw new StoreConflict('NAME_TAKEN', 'Ese nombre ya está en uso en esta ronda.');
    }
    const count = [...this.players.values()].filter(
      (player) => player.roundId === input.roundId,
    ).length;
    const round = this.rounds.get(input.roundId);
    if (round && count >= round.maxPlayers) {
      throw new StoreConflict('ROOM_FULL', 'La sala alcanzó el cupo máximo.');
    }

    this.playerId += 1;
    const player: Player = {
      id: this.playerId,
      roundId: input.roundId,
      name: input.name,
      nameKey: input.nameKey,
      tokenHash: input.tokenHash,
      status: 'EN_ESPERA',
      moves: 0,
      fails: 0,
      matched: 0,
      timeLeft: round?.durationSeconds ?? 900,
      connectedAt: input.now,
      lastSeen: input.now,
      disconnectedAt: null,
      kickedAt: null,
      createdAt: input.now,
    };
    this.players.set(player.id, player);
    return { ...player };
  }

  public async findPlayerById(id: number): Promise<Player | null> {
    const player = this.players.get(id);
    return player ? { ...player } : null;
  }

  public async findPlayerByTokenHash(tokenHash: string): Promise<Player | null> {
    const found = [...this.players.values()].find((player) => player.tokenHash === tokenHash);
    return found ? { ...found } : null;
  }

  public async listPlayers(roundId: number): Promise<Player[]> {
    return [...this.players.values()]
      .filter((player) => player.roundId === roundId)
      .sort((a, b) => a.id - b.id)
      .map((player) => ({ ...player }));
  }

  public async updatePlayer(player: Player): Promise<void> {
    this.players.set(player.id, { ...player });
  }

  public async appendEvent(
    roundId: number,
    playerId: number | null,
    type: GameEventType,
    detail: Record<string, unknown> | null,
    now: number,
  ): Promise<GameEvent> {
    this.eventId += 1;
    const event: GameEvent = {
      id: this.eventId,
      roundId,
      playerId,
      type,
      detail,
      createdAt: now,
    };
    this.events.push(event);
    return { ...event };
  }
}
