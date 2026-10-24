export type RoundStatus = 'ABIERTA' | 'EN_JUEGO' | 'CONGELADA' | 'FINALIZADA';

export type PlayerStatus =
  | 'EN_ESPERA'
  | 'JUGANDO'
  | 'CALIBRADO'
  | 'BLOQUEADO'
  | 'DESCONECTADO'
  | 'EXPULSADO';

export interface OnlineRound {
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

export interface OnlinePlayer {
  id: number;
  name: string;
  status: PlayerStatus;
  moves: number;
  fails: number;
  matched: number;
  timeLeft: number;
  connected: boolean;
  kickedAt: number | null;
}

export interface TelemetryPayload {
  moves: number;
  fails: number;
  matched: number;
  timeLeft: number;
  state: string;
}

export type ConnectionStatus = 'connecting' | 'online' | 'offline';
