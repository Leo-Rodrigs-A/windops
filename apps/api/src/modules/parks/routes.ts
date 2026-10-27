import {
  createParkSchema,
  createTurbineSchema,
  equipmentLifecycleCommandSchema,
  errorSchema,
  parkLifecycleResultSchema,
  parkSchema,
  parksPageSchema,
  parksQuerySchema,
  turbineLifecycleResultSchema,
  turbineSchema,
  turbinesPageSchema,
  turbinesQuerySchema,
  updateParkSchema,
  updateTurbineSchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';
import type { ParksCatalogService, ParksIssueReferences } from './service.js';

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

function respondWriteError(
  reply: FastifyReply,
  request: FastifyRequest,
  status:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'revision_conflict'
    | 'idempotency_conflict'
    | 'open_issues'
    | 'not_archived',
): FastifyReply {
  const responses = {
    unauthenticated: [401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'],
    forbidden: [403, 'WORKSPACE_ACCESS_DENIED', 'Workspace access denied.'],
    not_found: [404, 'RESOURCE_NOT_FOUND', 'Resource not found.'],
    conflict: [409, 'CATALOG_CODE_TAKEN', 'A catalog code already exists in this scope.'],
    revision_conflict: [409, 'REVISION_CONFLICT', 'The catalog record changed. Reload and retry.'],
    idempotency_conflict: [
      409,
      'IDEMPOTENCY_CONFLICT',
      'The command key was used with different content.',
    ],
    open_issues: [
      409,
      'EQUIPMENT_HAS_OPEN_ISSUES',
      'Open issues prevent this equipment operation.',
    ],
    not_archived: [409, 'EQUIPMENT_NOT_ARCHIVED', 'The equipment is not archived.'],
  } as const;
  const [statusCode, code, message] = responses[status];
  return reply.code(statusCode).send({ error: { code, message, requestId: request.id } });
}

export function registerParksRoutes(
  app: FastifyInstance,
  authorization: WorkspaceAuthorizationService,
  catalog: ParksCatalogService,
  issues?: ParksIssueReferences,
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

  app.post(
    '/api/workspaces/:workspaceId/parks',
    {
      schema: {
        params: workspaceParamsSchema,
        body: createParkSchema,
        response: {
          201: parkSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParamsSchema.parse(request.params);
      const result = await catalog.createPark(
        request.headers,
        workspaceId,
        createParkSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
      return reply.code(201).send(result.value);
    },
  );

  app.patch(
    '/api/workspaces/:workspaceId/parks/:parkId',
    {
      schema: {
        params: parkPathParamsSchema,
        body: updateParkSchema,
        response: {
          200: parkSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
      const result = await catalog.updatePark(
        request.headers,
        workspaceId,
        parkId,
        updateParkSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/parks/:parkId/turbines',
    {
      schema: {
        params: parkPathParamsSchema,
        body: createTurbineSchema,
        response: {
          201: turbineSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
      const result = await catalog.createTurbine(
        request.headers,
        workspaceId,
        parkId,
        createTurbineSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
      return reply.code(201).send(result.value);
    },
  );

  if (issues) {
    app.delete(
      '/api/workspaces/:workspaceId/parks/:parkId',
      {
        schema: {
          params: parkPathParamsSchema,
          body: equipmentLifecycleCommandSchema,
          response: {
            200: parkLifecycleResultSchema,
            400: errorSchema,
            401: errorSchema,
            403: errorSchema,
            404: errorSchema,
            409: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
        const result = await catalog.deletePark(
          request.headers,
          workspaceId,
          parkId,
          equipmentLifecycleCommandSchema.parse(request.body),
          issues,
        );
        if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
        return reply.send(result.value);
      },
    );

    app.post(
      '/api/workspaces/:workspaceId/parks/:parkId/restore',
      {
        schema: {
          params: parkPathParamsSchema,
          body: equipmentLifecycleCommandSchema,
          response: {
            200: parkLifecycleResultSchema,
            400: errorSchema,
            401: errorSchema,
            403: errorSchema,
            404: errorSchema,
            409: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { workspaceId, parkId } = parkPathParamsSchema.parse(request.params);
        const result = await catalog.restorePark(
          request.headers,
          workspaceId,
          parkId,
          equipmentLifecycleCommandSchema.parse(request.body),
        );
        if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
        return reply.send(result.value);
      },
    );

    app.delete(
      '/api/workspaces/:workspaceId/parks/:parkId/turbines/:turbineId',
      {
        schema: {
          params: turbinePathParamsSchema,
          body: equipmentLifecycleCommandSchema,
          response: {
            200: turbineLifecycleResultSchema,
            400: errorSchema,
            401: errorSchema,
            403: errorSchema,
            404: errorSchema,
            409: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { workspaceId, parkId, turbineId } = turbinePathParamsSchema.parse(request.params);
        const result = await catalog.deleteTurbine(
          request.headers,
          workspaceId,
          parkId,
          turbineId,
          equipmentLifecycleCommandSchema.parse(request.body),
          issues,
        );
        if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
        return reply.send(result.value);
      },
    );

    app.post(
      '/api/workspaces/:workspaceId/parks/:parkId/turbines/:turbineId/restore',
      {
        schema: {
          params: turbinePathParamsSchema,
          body: equipmentLifecycleCommandSchema,
          response: {
            200: turbineLifecycleResultSchema,
            400: errorSchema,
            401: errorSchema,
            403: errorSchema,
            404: errorSchema,
            409: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { workspaceId, parkId, turbineId } = turbinePathParamsSchema.parse(request.params);
        const result = await catalog.restoreTurbine(
          request.headers,
          workspaceId,
          parkId,
          turbineId,
          equipmentLifecycleCommandSchema.parse(request.body),
        );
        if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
        return reply.send(result.value);
      },
    );
  }

  app.patch(
    '/api/workspaces/:workspaceId/parks/:parkId/turbines/:turbineId',
    {
      schema: {
        params: turbinePathParamsSchema,
        body: updateTurbineSchema,
        response: {
          200: turbineSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, parkId, turbineId } = turbinePathParamsSchema.parse(request.params);
      const result = await catalog.updateTurbine(
        request.headers,
        workspaceId,
        parkId,
        turbineId,
        updateTurbineSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );
}
