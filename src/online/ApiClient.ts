import { API_URL } from './config';
import type { OnlinePlayer, OnlineRound } from './protocol';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No fue posible contactar el servidor de la sala.');
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorBody = payload as
      | { error?: { code?: string; message?: string } }
      | null
      | undefined;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? `HTTP_${response.status}`,
      errorBody?.error?.message ?? 'La solicitud no pudo completarse.',
    );
  }

  return payload as T;
}

export interface RoundStateResponse {
  round: OnlineRound | null;
  joinable: boolean;
  serverNow: number;
}

export interface JoinResponse {
  token: string;
  player: OnlinePlayer;
  round: OnlineRound;
}

export interface PlayerMeResponse {
  player: OnlinePlayer;
  serverNow: number;
}

export interface LoginResponse {
  token: string;
  expiresAt: number;
  instructor: { id: number; username: string; displayName: string };
}

export interface DashboardResponse {
  instructor: { id: number; username: string; displayName: string };
  round: OnlineRound | null;
  players: OnlinePlayer[];
  serverNow: number;
}

export const api = {
  getRound(): Promise<RoundStateResponse> {
    return request<RoundStateResponse>('/api/round');
  },
  join(name: string): Promise<JoinResponse> {
    return request<JoinResponse>('/api/players/join', { method: 'POST', body: { name } });
  },
  getPlayer(token: string): Promise<PlayerMeResponse> {
    return request<PlayerMeResponse>('/api/players/me', { token });
  },
  login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/instructor/login', {
      method: 'POST',
      body: { username, password },
    });
  },
  me(token: string): Promise<DashboardResponse> {
    return request<DashboardResponse>('/api/instructor/me', { token });
  },
  createRound(token: string): Promise<{ round: OnlineRound }> {
    return request<{ round: OnlineRound }>('/api/instructor/rounds', {
      method: 'POST',
      token,
    });
  },
  startRound(token: string, roundId: number): Promise<{ round: OnlineRound }> {
    return request<{ round: OnlineRound }>(`/api/instructor/rounds/${roundId}/start`, {
      method: 'POST',
      token,
    });
  },
  freezeRound(
    token: string,
    roundId: number,
    frozen: boolean,
  ): Promise<{ round: OnlineRound }> {
    return request<{ round: OnlineRound }>(`/api/instructor/rounds/${roundId}/freeze`, {
      method: 'POST',
      token,
      body: { frozen },
    });
  },
  finishRound(token: string, roundId: number): Promise<{ round: OnlineRound }> {
    return request<{ round: OnlineRound }>(`/api/instructor/rounds/${roundId}/finish`, {
      method: 'POST',
      token,
    });
  },
  kickPlayer(token: string, playerId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/instructor/players/${playerId}/kick`, {
      method: 'POST',
      token,
    });
  },
  logout(token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/instructor/logout', { method: 'POST', token });
  },
};
