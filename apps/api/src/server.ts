import { buildApp } from './app.js';
import { createIdentityProvider, createIdentityService } from './modules/identity/index.js';
import { createWorkspaceAuthorizationService } from './modules/workspaces/index.js';
import { loadEnvironment } from './platform/config.js';
import { createDatabase } from './platform/database/client.js';
import { createEmailSender } from './platform/email.js';

const env = loadEnvironment();
const { pool } = createDatabase(env.DATABASE_URL);
const identity =
  env.AUTH_ENABLED && env.BETTER_AUTH_SECRET
    ? createIdentityProvider(
        pool,
        env.APP_ORIGIN,
        env.BETTER_AUTH_SECRET,
        createEmailSender(env),
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
          : undefined,
      )
    : undefined;
const workspaceAuthorization = createWorkspaceAuthorizationService(
  pool,
  identity ? createIdentityService(identity) : { resolveAuthenticatedUser: async () => null },
);
const app = buildApp({
  logger: true,
  docs: env.NODE_ENV !== 'production',
  trustProxy: env.NODE_ENV === 'production',
  ...(identity ? { identity } : {}),
  workspaceAuthorization,
  authOrigin: env.APP_ORIGIN,
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
