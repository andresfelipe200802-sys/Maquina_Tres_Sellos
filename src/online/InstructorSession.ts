import { ApiError, api, type DashboardResponse, type LoginResponse } from './ApiClient';
import { WS_URL } from './config';
import type { ConnectionStatus, OnlinePlayer, OnlineRound } from './protocol';

export interface InstructorSessionEvents {
  onSnapshot(round: OnlineRound | null, players: OnlinePlayer[]): void;
  onStatus(status: ConnectionStatus): void;
  onError(error: ApiError): void;
  onAuthExpired(): void;
}

export class InstructorSession {
  private token: string | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private generation = 0;
  private loggedOut = false;

  public constructor(private readonly events: InstructorSessionEvents) {}

  public get isAuthenticated(): boolean {
    return this.token !== null;
  }

  public async login(username: string, password: string): Promise<LoginResponse> {
    const result = await api.login(username, password);
    this.token = result.token;
    this.loggedOut = false;
    this.reconnectAttempts = 0;
    this.connect();
    return result;
  }

  public connect(): void {
    if (!this.token || this.loggedOut) return;
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
      socket.send(JSON.stringify({ type: 'auth', role: 'instructor', token }));
    });

    socket.addEventListener('message', (event) => {
      if (generation !== this.generation) return;
      this.handleMessage(String(event.data));
    });

    socket.addEventListener('close', () => {
      if (generation !== this.generation) return;
      this.socket = null;
      if (this.loggedOut) return;
      this.events.onStatus('offline');
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (generation !== this.generation) return;
      this.events.onStatus('offline');
    });
  }

  public async refresh(): Promise<DashboardResponse> {
    const token = this.requireToken();
    return api.me(token);
  }

  public async createRound(): Promise<OnlineRound> {
    const token = this.requireToken();
    return (await api.createRound(token)).round;
  }

  public async startRound(roundId: number): Promise<OnlineRound> {
    const token = this.requireToken();
    return (await api.startRound(token, roundId)).round;
  }

  public async freezeRound(roundId: number, frozen: boolean): Promise<OnlineRound> {
    const token = this.requireToken();
    return (await api.freezeRound(token, roundId, frozen)).round;
  }

  public async finishRound(roundId: number): Promise<OnlineRound> {
    const token = this.requireToken();
    return (await api.finishRound(token, roundId)).round;
  }

  public async kickPlayer(playerId: number): Promise<void> {
    const token = this.requireToken();
    await api.kickPlayer(token, playerId);
  }

  public async logout(): Promise<void> {
    const token = this.token;
    this.loggedOut = true;
    this.clearReconnect();
    this.generation += 1;
    this.socket?.close(1000, 'Cierre de sesión');
    this.socket = null;
    this.token = null;
    if (token) {
      try {
        await api.logout(token);
      } catch {
        // La sesión local ya quedó cerrada; un fallo de red no debe bloquear.
      }
    }
    this.events.onStatus('offline');
  }

  public expireSession(): void {
    this.loggedOut = true;
    this.clearReconnect();
    this.generation += 1;
    this.socket?.close(4401, 'Sesión expirada');
    this.socket = null;
    this.token = null;
    this.events.onStatus('offline');
    this.events.onAuthExpired();
  }

  private handleMessage(raw: string): void {
    let message: {
      type?: string;
      round?: OnlineRound | null;
      players?: OnlinePlayer[];
      code?: string;
      message?: string;
    };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }

    if (message.type === 'auth.ok') {
      this.reconnectAttempts = 0;
      this.events.onStatus('online');
      return;
    }
    if (message.type === 'snapshot') {
      this.events.onSnapshot(message.round ?? null, message.players ?? []);
      return;
    }
    if (message.type === 'error') {
      if (message.code === 'SESSION_EXPIRED' || message.code === 'SESSION_INVALID') {
        this.expireSession();
        return;
      }
      this.events.onError(
        new ApiError(0, message.code ?? 'WS_ERROR', message.message ?? 'Error de conexión.'),
      );
    }
  }

  private requireToken(): string {
    if (!this.token) throw new ApiError(401, 'AUTH_REQUIRED', 'Inicia sesión como instructor.');
    return this.token;
  }

  private scheduleReconnect(): void {
    if (this.loggedOut || !this.token) return;
    if (this.reconnectAttempts >= 5) return;
    this.clearReconnect();
    const delay = Math.min(5_000, 900 * 2 ** this.reconnectAttempts);
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

export type { DashboardResponse, LoginResponse };
