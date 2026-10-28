import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { createSyncShapeProxy } from './proxy.js';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const user = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Técnica de teste',
  email: 'sync@example.invalid',
};

function authorizationFor(status: 'ok' | 'unauthenticated' | 'forbidden' = 'ok') {
  const authorizeWorkspace = vi.fn(async () =>
    status === 'ok'
      ? {
          status: 'ok' as const,
          value: {
            user,
            membershipId: '30000000-0000-4000-8000-000000000001',
            workspace: { id: workspaceId, name: 'Teste', role: 'technician' as const },
          },
        }
      : { status },
  );
  return { authorizeWorkspace };
}

async function withApp(syncProxy: ReturnType<typeof createSyncShapeProxy>) {
  const app = buildApp({ ready: async () => {}, syncProxy });
  await app.ready();
  return app;
}

describe('proxy autorizado de shapes Electric', () => {
  it('fixa tabela, colunas e tenant no servidor e não encaminha cookie ao Electric', async () => {
    const authorization = authorizationFor();
    let upstreamUrl: URL | undefined;
    let upstreamHeaders: HeadersInit | undefined;
    const proxy = createSyncShapeProxy({
      authorization,
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch: async (input, init) => {
        upstreamUrl = new URL(String(input));
        upstreamHeaders = init?.headers;
        return new Response('[{"value":{"id":"issue"}}]', {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'electric-offset': '123_4',
            'electric-handle': 'shape-handle',
            'electric-schema': '{}',
            'content-encoding': 'gzip',
            'set-cookie': 'electric=private',
          },
        });
      },
    });
    const app = await withApp(proxy);
    try {
      const response = await app.inject({
        url: `/api/sync/issues?workspaceId=${workspaceId}&offset=-1`,
        headers: { cookie: 'session=secret' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('issue');
      expect(response.headers['cache-control']).toBe('no-store, private');
      expect(response.headers.vary).toBe('Cookie');
      expect(response.headers['electric-offset']).toBe('123_4');
      const scopedHandle = response.headers['electric-handle'];
      expect(scopedHandle).toMatch(/^v1\./);
      expect(scopedHandle).not.toBe('shape-handle');
      expect(response.headers['content-encoding']).toBeUndefined();
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(authorization.authorizeWorkspace).toHaveBeenCalledTimes(2);
      expect(upstreamUrl?.pathname).toBe('/v1/shape');
      expect(upstreamUrl?.searchParams.get('table')).toBe('public.issue_sync_rows');
      expect(upstreamUrl?.searchParams.get('columns')).toBe(
        'id,workspace_id,park_id,turbine_id,text,completion_report,archived_at,status,created_at,updated_at,revision',
      );
      expect(upstreamUrl?.searchParams.get('where')).toBe(
        "workspace_id = $1 AND archived_at IS NULL AND status IN ('pending', 'in_progress')",
      );
      await app.inject({
        url: `/api/sync/issue-events?workspaceId=${workspaceId}&offset=-1`,
        headers: { 'x-sync-user': user.id },
      });
      expect(upstreamUrl?.searchParams.get('where')).toBe(
        "workspace_id = $1 AND issue_id IN (SELECT id FROM public.issue_sync_rows WHERE workspace_id = $1 AND archived_at IS NULL AND status IN ('pending', 'in_progress'))",
      );
      await app.inject({
        url: `/api/sync/parks?workspaceId=${workspaceId}&offset=-1`,
        headers: { 'x-sync-user': user.id },
      });
      expect(upstreamUrl?.searchParams.get('where')).toBe('workspace_id = $1');
      expect(upstreamUrl?.searchParams.get('params[1]')).toBe(workspaceId);
      expect(upstreamUrl?.searchParams.get('secret')).toBe('server-only-secret');
      expect(upstreamUrl?.searchParams.get('offset')).toBe('-1');
      expect(upstreamHeaders).toEqual({ accept: 'application/json' });
      const handleWithoutOffset = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&handle=${encodeURIComponent(scopedHandle ?? '')}`,
      );
      expect(handleWithoutOffset.statusCode).toBe(400);

      const followup = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&offset=123_4&handle=${encodeURIComponent(scopedHandle ?? '')}`,
      );
      expect(followup.statusCode).toBe(200);
      expect(upstreamUrl?.searchParams.get('handle')).toBe('shape-handle');

      const handleFromAnotherTenant = await app.inject(
        `/api/sync/issues?workspaceId=40000000-0000-4000-8000-000000000001&offset=123_4&handle=${encodeURIComponent(scopedHandle ?? '')}`,
      );
      expect(handleFromAnotherTenant.statusCode).toBe(400);
      const rawExpiredHandle = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&expired_handle=shape-handle`,
      );
      expect(rawExpiredHandle.statusCode).toBe(400);
      expect(authorization.authorizeWorkspace).toHaveBeenCalledTimes(10);
    } finally {
      await app.close();
    }
  });

  it('rejeita filtros, parâmetros arbitrários e parâmetros de workspace duplicados', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const proxy = createSyncShapeProxy({
      authorization: authorizationFor(),
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch,
    });
    const app = await withApp(proxy);
    try {
      const filterInjection = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&where=workspace_id%20%3D%20other`,
      );
      const tableInjection = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&table=auth_users`,
      );
      const duplicateWorkspace = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&workspaceId=${workspaceId}`,
      );
      const offsetWithoutHandle = await app.inject(
        `/api/sync/issues?workspaceId=${workspaceId}&offset=123_4`,
      );
      expect(filterInjection.statusCode).toBe(400);
      expect(tableInjection.statusCode).toBe(400);
      expect(duplicateWorkspace.statusCode).toBe(400);
      expect(offsetWithoutHandle.statusCode).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('exige sessão completa e membership ativa antes de consultar Electric', async () => {
    for (const [status, expectedCode] of [
      ['unauthenticated', 401],
      ['forbidden', 403],
    ] as const) {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const proxy = createSyncShapeProxy({
        authorization: authorizationFor(status),
        electricUrl: 'http://electric.internal:3000',
        electricSecret: 'server-only-secret',
        fetch,
      });
      const app = await withApp(proxy);
      try {
        const response = await app.inject(`/api/sync/issues?workspaceId=${workspaceId}`);
        expect(response.statusCode).toBe(expectedCode);
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    }
  });

  it('revalida acesso após timeout/falha upstream e encerra o poll de membro revogado', async () => {
    const authorizeWorkspace = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'ok' as const,
        value: {
          user,
          membershipId: '30000000-0000-4000-8000-000000000001',
          workspace: { id: workspaceId, name: 'Teste', role: 'technician' as const },
        },
      })
      .mockResolvedValueOnce({ status: 'forbidden' as const });
    const proxy = createSyncShapeProxy({
      authorization: { authorizeWorkspace },
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch: async () => {
        throw new Error('upstream poll timed out');
      },
    });
    const app = await withApp(proxy);
    try {
      const response = await app.inject(`/api/sync/issues?workspaceId=${workspaceId}&live=true`);
      expect(response.statusCode).toBe(403);
      expect(authorizeWorkspace).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });

  it('não envia a resposta do shape se a membership for revogada durante o long poll', async () => {
    const authorizeWorkspace = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'ok' as const,
        value: {
          user,
          membershipId: '30000000-0000-4000-8000-000000000001',
          workspace: { id: workspaceId, name: 'Teste', role: 'technician' as const },
        },
      })
      .mockResolvedValueOnce({ status: 'forbidden' as const });
    const proxy = createSyncShapeProxy({
      authorization: { authorizeWorkspace },
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch: async () =>
        new Response('[{"value":{"text":"private after revoke"}}]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const app = await withApp(proxy);
    try {
      const response = await app.inject(`/api/sync/issues?workspaceId=${workspaceId}&live=true`);
      expect(response.statusCode).toBe(403);
      expect(response.body).not.toContain('private after revoke');
      expect(authorizeWorkspace).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });

  it('cancela a consulta upstream quando o chamador aborta', async () => {
    const authorization = authorizationFor();
    let upstreamSignal: AbortSignal | undefined;
    const proxy = createSyncShapeProxy({
      authorization,
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch: async (_input, init) => {
        upstreamSignal = init?.signal as AbortSignal;
        return await new Promise<Response>((_resolve, reject) => {
          upstreamSignal?.addEventListener('abort', () => reject(new Error('upstream aborted')), {
            once: true,
          });
        });
      },
    });
    const controller = new AbortController();
    const resultPromise = proxy.getShape({
      headers: {},
      collection: 'issues',
      workspaceId,
      protocol: new Map([['offset', '-1']]),
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());
    controller.abort();
    await expect(resultPromise).resolves.toEqual({ status: 'unavailable' });
  });

  it('limita o tamanho da resposta buffered do Electric', async () => {
    const proxy = createSyncShapeProxy({
      authorization: authorizationFor(),
      electricUrl: 'http://electric.internal:3000',
      electricSecret: 'server-only-secret',
      fetch: async () => new Response('x'.repeat(16 * 1024 * 1024 + 1)),
    });
    const app = await withApp(proxy);
    try {
      const response = await app.inject(`/api/sync/issues?workspaceId=${workspaceId}`);
      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain('xxxxxxxx');
    } finally {
      await app.close();
    }
  });
});
