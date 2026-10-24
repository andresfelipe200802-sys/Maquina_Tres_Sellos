const rawApiUrl = (import.meta.env['VITE_API_URL'] as string | undefined)?.trim() ?? '';

/** URL base del API sin barra final. Cadena vacía = modo local sin backend. */
export const API_URL = rawApiUrl.replace(/\/+$/, '');

export const ONLINE_ENABLED = API_URL.length > 0;

export const WS_URL = ONLINE_ENABLED ? `${API_URL.replace(/^http/i, 'ws')}/ws` : '';

export const PLAYER_TOKEN_KEY = 'sena_water_player_token';
