import {
  errorSchema,
  parkSchema,
  parksPageSchema,
  parksQuerySchema,
  turbineSchema,
  turbinesPageSchema,
  turbinesQuerySchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';
import type { ParksCatalogService } from './service.js';

const workspaceParamsSchema = z.object({ workspaceId: z.uuid() }).strict();
const parkPathParamsSchema = z.object({ workspaceId: z.uuid(), parkId: z.uuid() }).strict();
const turbinePathParamsSchema = z
  .object({ workspaceId: z.uuid(), parkId: z.uuid(), turbineId: z.uuid() })
  .strict();

function respondAccessError(
  reply: FastifyReply,
  request: FastifyRequest,
  status: 401 | 403,
): FastifyReply {
  return reply.code(status).send({
    error: {
      code: status === 401 ? 'AUTHENTICATION_REQUIRED' : 'WORKSPACE_ACCESS_DENIED',
      message: status === 401 ? 'Authentication required.' : 'Workspace access denied.',
      requestId: request.id,
    },
  });
}

function respondCatalogError(
  reply: FastifyReply,
  request: FastifyRequest,
  status: 400 | 404,
): FastifyReply {
  return reply.code(status).send({
    error: {
      code: status === 400 ? 'INVALID_CURSOR' : 'RESOURCE_NOT_FOUND',
      message: status === 400 ? 'The requested cursor is invalid.' : 'Resource not found.',
      requestId: request.id,
    },
  });
}

export function registerParksRoutes(
  app: FastifyInstance,
  authorization: WorkspaceAuthorizationService,
  catalog: ParksCatalogService,
) {
  app.get(
    '/api/workspaces/:workspaceId/parks',
    {
      schema: {
        params: workspaceParamsSchema,
        querystring: parksQuerySchema,
        response: {
          200: parksPageSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParamsSchema.parse(request.params);
      const authorizationResult = await authorization.authorizeWorkspace(
        request.headers,
        workspaceId,
      );
      if (authorizationResult.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          authorizationResult.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await catalog.listParks(workspaceId, parksQuerySchema.parse(request.query));
      if (result.status === 'invalid_cursor') return respondCatalogError(reply, request, 400);
      if (result.status === 'not_found') return respondCatalogError(reply, request, 404);
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/parks/:parkId',
    {
      schema: {
        params: parkPathParamsSchema,
        response: { 200: parkSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
      const authorizationResult = await authorization.authorizeWorkspace(
        request.headers,
        workspaceId,
      );
      if (authorizationResult.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          authorizationResult.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await catalog.getPark(workspaceId, parkId);
      if (result.status === 'not_found') return respondCatalogError(reply, request, 404);
      if (result.status === 'invalid_cursor') return respondCatalogError(reply, request, 400);
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/parks/:parkId/turbines',
    {
      schema: {
        params: parkPathParamsSchema,
        querystring: turbinesQuerySchema,
        response: {
          200: turbinesPageSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
      const authorizationResult = await authorization.authorizeWorkspace(
        request.headers,
        workspaceId,
      );
      if (authorizationResult.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          authorizationResult.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await catalog.listTurbines(
        workspaceId,
        parkId,
        turbinesQuerySchema.parse(request.query),
      );
      if (result.status === 'not_found') return respondCatalogError(reply, request, 404);
      if (result.status === 'invalid_cursor') return respondCatalogError(reply, request, 400);
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/parks/:parkId/turbines/:turbineId',
    {
      schema: {
        params: turbinePathParamsSchema,
        response: { 200: turbineSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId, turbineId } = turbinePathParamsSchema.parse(request.params);
      const authorizationResult = await authorization.authorizeWorkspace(
        request.headers,
        workspaceId,
      );
      if (authorizationResult.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          authorizationResult.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await catalog.getTurbine(workspaceId, parkId, turbineId);
      if (result.status === 'not_found') return respondCatalogError(reply, request, 404);
      if (result.status === 'invalid_cursor') return respondCatalogError(reply, request, 400);
      return reply.send(result.value);
    },
  );
}
