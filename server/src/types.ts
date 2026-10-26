export type RoundStatus = 'ABIERTA' | 'EN_JUEGO' | 'CONGELADA' | 'FINALIZADA';

export type PlayerStatus =
  | 'EN_ESPERA'
  | 'JUGANDO'
  | 'CALIBRADO'
  | 'BLOQUEADO'
  | 'DESCONECTADO'
  | 'EXPULSADO';

export type GameEventType =
  | 'RONDA_CREADA'
  | 'RONDA_INICIADA'
  | 'RONDA_CONGELADA'
  | 'RONDA_REANUDADA'
  | 'RONDA_FINALIZADA'
  | 'JUGADOR_INGRESO'
  | 'JUGADOR_RECONECTO'
  | 'JUGADOR_DESCONECTO'
  | 'JUGADOR_BLOQUEADO'
  | 'JUGADOR_EXPULSADO'
  | 'TELEMETRIA'
  | 'TIEMPO_AGOTADO';

export interface Instructor {
  id: number;
  username: string;
  passwordHash: string;
  displayName: string;
  status: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}

export interface InstructorSession {
  id: number;
  instructorId: number;
  tokenHash: string;
  expiresAt: number;
  revoked: boolean;
}

export interface Round {
  id: number;
  code: string;
  instructorId: number;
  status: RoundStatus;
  maxPlayers: number;
  durationSeconds: number;
  createdAt: number;
  startedAt: number | null;
  deadlineAt: number | null;
  frozenAt: number | null;
  finishedAt: number | null;
}

export interface Player {
  id: number;
  roundId: number;
  name: string;
  nameKey: string;
  tokenHash: string;
  status: PlayerStatus;
  moves: number;
  fails: number;
  matched: number;
  timeLeft: number;
  connectedAt: number | null;
  lastSeen: number | null;
  disconnectedAt: number | null;
  kickedAt: number | null;
  blockedReason: string | null;
  createdAt: number;
}

export interface GameEvent {
  id: number;
  roundId: number;
  playerId: number | null;
  type: GameEventType;
  detail: Record<string, unknown> | null;
  createdAt: number;
}

export interface PublicRound {
  id: number;
  code: string;
  status: RoundStatus;
  maxPlayers: number;
  durationSeconds: number;
  startedAt: number | null;
  deadlineAt: number | null;
  frozenAt: number | null;
  playerCount: number;
}

export interface PublicPlayer {
  id: number;
  name: string;
  status: PlayerStatus;
  moves: number;
  fails: number;
  matched: number;
  timeLeft: number;
  connected: boolean;
  kickedAt: number | null;
  blockedReason: string | null;
}

export interface TelemetryPayload {
  moves: number;
  fails: number;
  matched: number;
  timeLeft: number;
  state: string;
  resets?: number;
}
