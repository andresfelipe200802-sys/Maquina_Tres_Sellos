import 'dotenv/config';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { Hub } from './Hub.js';
import { RoundService } from './RoundService.js';
import { MemoryStore } from './store/MemoryStore.js';
import { MySqlStore } from './store/MySqlStore.js';
import type { Store } from './store/Store.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const store: Store = config.databaseUrl
    ? new MySqlStore(config.databaseUrl, config.dbSsl)
    : new MemoryStore();

  await store.init();
  const service = new RoundService(store, config);
  await service.seedInstructor();

  const { server } = createApp(service, config);
  const hub = new Hub(server, service, config);

  const ticker = setInterval(() => {
    void service.tick().catch((error: unknown) => {
      console.error('[tick] error:', error);
    });
  }, 2_000);
  ticker.unref?.();

  server.listen(config.port, config.host, () => {
    const alcance =
      config.host === '127.0.0.1' || config.host === 'localhost'
        ? 'solo esta PC (127.0.0.1)'
        : `red local (${config.host})`;
    console.log(`[server] API en http://localhost:${config.port} · ${alcance}`);
    console.log(`[server] Almacenamiento: ${config.databaseUrl ? 'MySQL 8' : 'memoria (desarrollo)'}`);
    console.log(`[server] Orígenes CORS: ${config.clientOrigins.join(', ')}`);
    if (!config.databaseUrl) {
      console.warn('[server] AVISO: sin DATABASE_URL los datos se pierden al reiniciar.');
    }
    if (!config.isProduction) {
      console.warn(
        `[server] Credenciales de desarrollo activas: ${config.instructorUser} / (definida en INSTRUCTOR_PASSWORD).`,
      );
    }
  });

  let closing = false;
  const shutdown = (signal: string): void => {
    if (closing) return;
    closing = true;
    console.log(`[server] Cerrando por ${signal}...`);
    clearInterval(ticker);
    hub.close();
    service.close();
    server.close(() => {
      void store.close?.().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('[server] No fue posible iniciar:', error);
  process.exit(1);
});
