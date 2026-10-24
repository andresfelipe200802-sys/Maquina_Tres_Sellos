import type {
  GameEvent,
  GameEventType,
  Instructor,
  InstructorSession,
  Player,
  Round,
} from '../types.js';

export class StoreConflict extends Error {
  public readonly code: string;
  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface CreatePlayerInput {
  roundId: number;
  name: string;
  nameKey: string;
  tokenHash: string;
  now: number;
}

export interface CreateRoundInput {
  code: string;
  instructorId: number;
  maxPlayers: number;
  durationSeconds: number;
  now: number;
}

export interface Store {
  init(): Promise<void>;

  seedInstructor(username: string, passwordHash: string, displayName: string): Promise<Instructor>;
  findInstructorByUsername(username: string): Promise<Instructor | null>;
  findInstructorById(id: number): Promise<Instructor | null>;
  updateInstructorLastAccess(id: number, at: number): Promise<void>;

  createInstructorSession(
    instructorId: number,
    tokenHash: string,
    expiresAt: number,
  ): Promise<InstructorSession>;
  findInstructorSessionByHash(tokenHash: string): Promise<InstructorSession | null>;
  revokeInstructorSession(id: number): Promise<void>;

  createRound(input: CreateRoundInput): Promise<Round>;
  getActiveRound(): Promise<Round | null>;
  getLatestRound(): Promise<Round | null>;
  getRoundById(id: number): Promise<Round | null>;
  updateRound(round: Round): Promise<void>;

  createPlayer(input: CreatePlayerInput): Promise<Player>;
  findPlayerById(id: number): Promise<Player | null>;
  findPlayerByTokenHash(tokenHash: string): Promise<Player | null>;
  listPlayers(roundId: number): Promise<Player[]>;
  updatePlayer(player: Player): Promise<void>;

  appendEvent(
    roundId: number,
    playerId: number | null,
    type: GameEventType,
    detail: Record<string, unknown> | null,
    now: number,
  ): Promise<GameEvent>;

  close?(): Promise<void>;
}
