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
    async getMembers() {
      return { status: 'unauthenticated' };
    },
    async getDirectory() {
      return { status: 'unauthenticated' };
    },
    async createInvitation() {
      return { status: 'unauthenticated' };
    },
    async getInvitations() {
      return { status: 'unauthenticated' };
    },
    async resendInvitation() {
      return { status: 'unauthenticated' };
    },
    async acceptInvitation() {
      return { status: 'unauthenticated' };
    },
    async promoteMember() {
      return { status: 'unauthenticated' };
    },
    async revokeMember() {
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
    expect((await app.inject(`/api/workspaces/${randomUUID()}/members`)).statusCode).toBe(401);
    expect((await app.inject(`/api/workspaces/${randomUUID()}/directory`)).statusCode).toBe(401);
    expect(
      (await app.inject(`/api/workspaces/${randomUUID()}/directory?limit=1000`)).statusCode,
    ).toBe(400);
    expect(app.swagger().paths).toHaveProperty('/api/me');
    expect(app.swagger().paths).toHaveProperty('/api/workspaces/{workspaceId}/context');
    expect(app.swagger().paths).toHaveProperty('/api/workspaces/{workspaceId}/members');
    expect(app.swagger().paths).toHaveProperty(
      '/api/workspaces/{workspaceId}/members/{membershipId}/role',
    );
    expect(app.swagger().paths).toHaveProperty(
      '/api/workspaces/{workspaceId}/members/{membershipId}/revoke',
    );
    expect(app.swagger().paths).toHaveProperty('/api/workspaces/{workspaceId}/directory');
    expect(app.swagger().paths['/api/workspaces/{workspaceId}/invitations']).toMatchObject({
      get: expect.any(Object),
      post: expect.any(Object),
    });
    expect(app.swagger().paths).toHaveProperty(
      '/api/workspaces/{workspaceId}/invitations/{invitationId}/resend',
    );
    expect(app.swagger().paths).toHaveProperty('/api/invitations/accept');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/invitations/accept',
          payload: { token: 'short' },
        })
      ).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
  }
});
