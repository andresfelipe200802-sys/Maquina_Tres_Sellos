export interface ServerConfig {
  port: number;
  host: string;
  clientOrigins: string[];
  instructorUser: string;
  instructorPassword: string;
  databaseUrl: string | null;
  dbSsl: boolean;
  maxPlayers: number;
  roundSeconds: number;
  disconnectGraceSeconds: number;
  isProduction: boolean;
  sessionTtlSeconds: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const isProduction = env['NODE_ENV'] === 'production';
  const instructorUser = env['INSTRUCTOR_USER']?.trim();
  const instructorPassword = env['INSTRUCTOR_PASSWORD'];

  if (isProduction && (!instructorUser || !instructorPassword)) {
    throw new Error('INSTRUCTOR_USER e INSTRUCTOR_PASSWORD son obligatorios en producción.');
  }

  return {
    port: Number(env['PORT'] ?? 3001),
    // Solo esta PC por defecto: el tráfico entra únicamente por el túnel.
    // '0.0.0.0' expondría el puerto a toda la red local (modo Wi-Fi del aula).
    host: env['HOST']?.trim() || '127.0.0.1',
    clientOrigins: (env['CLIENT_ORIGINS'] ?? 'http://localhost:5173,http://localhost:4173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    instructorUser: instructorUser || 'instructor',
    instructorPassword: instructorPassword || 'SENA2026*',
    databaseUrl: env['DATABASE_URL']?.trim() || null,
    dbSsl: env['DB_SSL'] === 'true',
    maxPlayers: Math.min(45, Math.max(1, Number(env['MAX_PLAYERS'] ?? 45))),
    roundSeconds: Math.max(60, Number(env['ROUND_SECONDS'] ?? 900)),
    disconnectGraceSeconds: Math.max(3, Number(env['DISCONNECT_GRACE_SECONDS'] ?? 10)),
    isProduction,
    sessionTtlSeconds: 8 * 60 * 60,
  };
}
