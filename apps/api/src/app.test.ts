import { expect, it } from 'vitest';
import { buildApp } from './app.js';

it('separates liveness and readiness without leaking secrets', async () => {
  const app = buildApp({
    ready: async () => {
      throw new Error('postgres://secret');
    },
  });
  try {
    expect((await app.inject('/api/health/live')).statusCode).toBe(200);
    const response = await app.inject('/api/health/ready');
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('secret');
    expect(response.json().error.requestId).toBeTruthy();
  } finally {
    await app.close();
  }
});
it('reports ready and generates OpenAPI', async () => {
  const app = buildApp({ ready: async () => {}, docs: true });
  try {
    expect((await app.inject('/api/health/ready')).statusCode).toBe(200);
    expect((await app.inject('/api/docs/')).statusCode).toBe(200);
    expect(app.swagger().paths).toHaveProperty('/api/health/live');
  } finally {
    await app.close();
  }
});
it('keeps sync and auth closed before authorization is implemented', async () => {
  const app = buildApp({ ready: async () => {} });
  try {
    expect((await app.inject('/api/sync/issues?table=users')).statusCode).toBe(503);
    expect((await app.inject('/api/auth/session')).statusCode).toBe(404);
  } finally {
    await app.close();
  }
});
