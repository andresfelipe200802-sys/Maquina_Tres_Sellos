import { ApiError, api } from './ApiClient';
import { PLAYER_TOKEN_KEY, WS_URL } from './config';
import type {
  ConnectionStatus,
  OnlinePlayer,
  OnlineRound,
  TelemetryPayload,
} from './protocol';

export type LearnerSessionEnd = 'kicked' | 'blocked' | 'finished';

export interface LearnerSessionEvents {
  onRound(round: OnlineRound): void;
  onPlayer(player: OnlinePlayer): void;
  onStatus(status: ConnectionStatus): void;
  onSessionEnd(kind: LearnerSessionEnd, message: string): void;
  onError(error: ApiError): void;
  onTokenInvalid(): void;
}

interface AuthMessage {
  type: string;
  player?: OnlinePlayer;
  round?: OnlineRound;
  reason?: string;
  code?: string;
  message?: string;
}

export class LearnerSession {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private closedByUser = false;
  private ended = false;
  private generation = 0;

  public constructor(private readonly events: LearnerSessionEvents) {
    this.token = readStoredToken();
  }

  public hasStoredToken(): boolean {
    return this.token !== null;
  }

  public async join(name: string): Promise<void> {
    const result = await api.join(name);
    this.token = result.token;
    storeToken(result.token);
    this.ended = false;
    this.closedByUser = false;
    this.reconnectAttempts = 0;
    this.events.onPlayer(result.player);
    this.events.onRound(result.round);
    this.connect();
  }

  /** Reconecta una sesión existente; el primer mensaje WS devuelve el estado. */
  public resume(): boolean {
    if (!this.token) return false;
    this.ended = false;
    this.closedByUser = false;
    this.connect();
    return true;
  }

  public connect(): void {
    if (!this.token || this.ended || this.closedByUser) return;
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    const token = this.token;
    const generation = ++this.generation;
    this.events.onStatus('connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (generation !== this.generation) return;
      socket.send(JSON.stringify({ type: 'auth', role: 'player', token }));
    });

    socket.addEventListener('message', (event) => {
      if (generation !== this.generation) return;
      this.handleMessage(String(event.data));
    });

    socket.addEventListener('close', () => {
      if (generation !== this.generation) return;
      this.socket = null;
      if (this.closedByUser || this.ended) return;
      this.events.onStatus('offline');
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (generation !== this.generation) return;
      this.events.onStatus('offline');
    });
  }

  public sendTelemetry(payload: TelemetryPayload): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'telemetry', telemetry: payload }));
  }

  public disconnect(clear = false): void {
    this.closedByUser = true;
    this.clearReconnect();
    this.generation += 1;
    this.socket?.close(1000, 'Cierre local');
    this.socket = null;
    if (clear) this.clearToken();
    this.events.onStatus('offline');
  }

  public clearToken(): void {
    this.token = null;
    try {
      sessionStorage.removeItem(PLAYER_TOKEN_KEY);
    } catch {
      // sessionStorage puede estar deshabilitado; el token queda solo en memoria.
    }
  }

  public endLocally(kind: LearnerSessionEnd, message: string): void {
    this.ended = true;
    this.clearReconnect();
    this.clearToken();
    this.generation += 1;
    this.socket?.close(1000, kind);
    this.socket = null;
    this.events.onSessionEnd(kind, message);
  }

  private handleMessage(raw: string): void {
    let message: AuthMessage;
    try {
      message = JSON.parse(raw) as AuthMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'auth.ok':
        this.reconnectAttempts = 0;
        this.events.onStatus('online');
        if (message.player) this.events.onPlayer(message.player);
        if (message.round) {
          this.events.onRound(message.round);
          if (message.round.status === 'FINALIZADA') {
            this.endLocally('finished', 'La ronda terminó. Espera la próxima instrucción.');
          }
        }
        break;
      case 'round.state':
        if (message.round) {
          this.events.onRound(message.round);
          if (message.round.status === 'FINALIZADA') {
            this.endLocally('finished', 'La ronda terminó. Espera la próxima instrucción.');
          }
        }
        break;
      case 'round.finished':
        if (message.round) this.events.onRound(message.round);
        this.endLocally('finished', 'La ronda terminó. Espera la próxima instrucción.');
        break;
      case 'player.state':
        if (message.player) this.events.onPlayer(message.player);
        break;
      case 'player.kicked':
        this.endLocally(
          'kicked',
          message.reason ?? 'El instructor retiró tu acceso a esta ronda.',
        );
        break;
      case 'error':
        if (message.code === 'PLAYER_KICKED' || message.code === 'PLAYER_BLOCKED') {
          this.endLocally(
            message.code === 'PLAYER_KICKED' ? 'kicked' : 'blocked',
            message.message ?? 'Tu acceso a la ronda ya no está disponible.',
          );
        } else if (
          message.code === 'PLAYER_SESSION_INVALID' ||
          message.code === 'PLAYER_AUTH_REQUIRED'
        ) {
          this.clearToken();
          this.ended = true;
          this.clearReconnect();
          this.events.onTokenInvalid();
          this.socket?.close(4401, 'Token inválido');
        } else {
          this.events.onError(new ApiError(0, message.code ?? 'WS_ERROR', message.message ?? 'Error de conexión.'));
        }
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.ended || this.closedByUser || !this.token) return;
    if (this.reconnectAttempts >= 5) {
      this.events.onStatus('offline');
      return;
    }
    this.clearReconnect();
    const delay = Math.min(4_000, 800 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(PLAYER_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    sessionStorage.setItem(PLAYER_TOKEN_KEY, token);
  } catch {
    // Sin sessionStorage la sesión vive solo en memoria hasta recargar.
  }
}
