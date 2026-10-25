import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { WorkspaceAuthorizationService } from './modules/workspaces/index.js';

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

it('documents protected identity and workspace context routes', async () => {
  const workspaceAuthorization: WorkspaceAuthorizationService = {
    async getMe() {
      return { status: 'unauthenticated' };
    },
    async authorizeWorkspace() {
      return { status: 'unauthenticated' };
    },
    async getContext() {
      return { status: 'unauthenticated' };
    },
  };
  const app = buildApp({ ready: async () => {}, workspaceAuthorization });
  try {
    const me = await app.inject('/api/me');
    expect(me.statusCode).toBe(401);
    expect(me.json().error.code).toBe('AUTHENTICATION_REQUIRED');
    const context = await app.inject(`/api/workspaces/${randomUUID()}/context`);
    expect(context.statusCode).toBe(401);
    expect(app.swagger().paths).toHaveProperty('/api/me');
    expect(app.swagger().paths).toHaveProperty('/api/workspaces/{workspaceId}/context');
  } finally {
    await app.close();
  }
});
