import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { SyncShapeProxy } from './proxy.js';

const workspaceIdSchema = z.uuid();
const protocolParameters = new Set([
  'offset',
  'handle',
  'live',
  'cursor',
  'expired_handle',
  'log',
  'cache-buster',
]);
const opaqueToken = /^[A-Za-z0-9._~-]{1,256}$/;

function error(reply: FastifyReply, request: FastifyRequest, status: number, code: string) {
  return reply
    .code(status)
    .header('cache-control', 'no-store, private')
    .header('pragma', 'no-cache')
    .send({
      error: {
        code,
        message: 'The synchronization request could not be completed.',
        requestId: request.id,
      },
    });
}

function readRequestParameters(request: FastifyRequest) {
  const url = new URL(request.url, 'http://windops.local');
  const values = new Map<string, string>();
  for (const [key, value] of url.searchParams) {
    if (key !== 'workspaceId' && !protocolParameters.has(key)) return null;
    if (values.has(key)) return null;
    values.set(key, value);
  }

  const workspaceId = workspaceIdSchema.safeParse(values.get('workspaceId'));
  if (!workspaceId.success) return null;
  const protocol = new Map<string, string>();
  for (const [key, value] of values) {
    if (key === 'workspaceId') continue;
    if (key === 'offset' && !/^(?:-1|0_inf|[0-9]+_[0-9]+)$/.test(value)) return null;
    if (key === 'handle' && !opaqueToken.test(value)) return null;
    if (key === 'live' && value !== 'true' && value !== 'false') return null;
    if (key === 'cursor' && value !== '' && !opaqueToken.test(value)) return null;
    if (key === 'expired_handle' && !opaqueToken.test(value)) return null;
    if (key === 'log' && value !== 'full' && value !== 'changes_only') return null;
    if (key === 'cache-buster' && !opaqueToken.test(value)) return null;
    protocol.set(key, value);
  }
  if (values.has('handle') && !values.has('offset')) return null;
  if (values.has('offset') && !values.has('handle') && values.get('offset') !== '-1') return null;
  if (!protocol.has('offset')) protocol.set('offset', '-1');
  return { workspaceId: workspaceId.data, protocol };
}

export async function registerSyncRoutes(app: FastifyInstance, proxy?: SyncShapeProxy) {
  app.get('/api/sync/:collection', async (request, reply) => {
    if (!proxy) return error(reply, request, 503, 'SYNC_NOT_IMPLEMENTED');

    const collection = (request.params as { collection: string }).collection;
    const parsed = readRequestParameters(request);
    if (!parsed) return error(reply, request, 400, 'INVALID_SYNC_REQUEST');

    const abortController = new AbortController();
    const abortForDisconnectedClient = () => abortController.abort();
    const abortForClosedResponse = () => {
      if (!reply.raw.writableEnded) abortController.abort();
    };
    request.raw.once('aborted', abortForDisconnectedClient);
    reply.raw.once('close', abortForClosedResponse);
    try {
      const result = await proxy.getShape({
        headers: request.headers,
        collection,
        workspaceId: parsed.workspaceId,
        protocol: parsed.protocol,
        signal: abortController.signal,
      });
      switch (result.status) {
        case 'unauthenticated':
          return error(reply, request, 401, 'SESSION_REQUIRED');
        case 'forbidden':
          return error(reply, request, 403, 'WORKSPACE_ACCESS_REQUIRED');
        case 'not_found':
          return error(reply, request, 404, 'SYNC_COLLECTION_NOT_FOUND');
        case 'invalid_handle':
          return error(reply, request, 400, 'SYNC_HANDLE_INVALID');
        case 'unavailable':
          return error(reply, request, 503, 'SYNC_UNAVAILABLE');
      }

      reply
        .code(result.statusCode)
        .header('cache-control', 'no-store, private')
        .header('pragma', 'no-cache')
        .header('expires', '0')
        .header('vary', 'Cookie');
      for (const [name, value] of Object.entries(result.headers)) {
        if (value !== undefined) reply.header(name, value);
      }
      return result.statusCode === 204 ? reply.send() : reply.send(result.body);
    } finally {
      request.raw.off('aborted', abortForDisconnectedClient);
      reply.raw.off('close', abortForClosedResponse);
    }
  });
}
