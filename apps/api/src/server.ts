import { buildApp } from './app.js';
import { loadEnvironment } from './platform/config.js';
import { createDatabase } from './platform/database/client.js';

const env = loadEnvironment();
const { pool } = createDatabase(env.DATABASE_URL);
const app = buildApp({
  logger: true,
  docs: env.NODE_ENV !== 'production',
  ready: async () => {
    await pool.query('SELECT 1');
    const response = await fetch(new URL('/v1/health', env.ELECTRIC_URL), {
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 200) throw new Error('Electric unavailable');
  },
});
app.addHook('onClose', async () => {
  await pool.end();
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, async () => {
    await app.close();
  });
try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch {
  app.log.error('Unable to start API; check configuration and port availability.');
  await app.close();
  process.exitCode = 1;
}
