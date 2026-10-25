import { errorSchema, meSchema, workspaceContextSchema } from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceAuthorizationService } from './service.js';

const workspaceParams = z.object({ workspaceId: z.uuid() });

export function registerWorkspaceRoutes(
  app: FastifyInstance,
  authorization: WorkspaceAuthorizationService,
) {
  app.get(
    '/api/me',
    { schema: { response: { 200: meSchema, 401: errorSchema } } },
    async (request, reply) => {
      const result = await authorization.getMe(request.headers);
      if (result.status === 'unauthenticated')
        return authorizationError(reply, request, 401, 'AUTHENTICATION_REQUIRED');
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/context',
    {
      schema: {
        params: workspaceParams,
        response: { 200: workspaceContextSchema, 401: errorSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const result = await authorization.getContext(request.headers, workspaceId);
      if (result.status === 'unauthenticated')
        return authorizationError(reply, request, 401, 'AUTHENTICATION_REQUIRED');
      if (result.status === 'forbidden')
        return authorizationError(reply, request, 403, 'WORKSPACE_ACCESS_DENIED');
      return reply.send(result.value);
    },
  );
}

function authorizationError(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: 401 | 403,
  code: string,
) {
  return reply.code(statusCode).send({
    error: {
      code,
      message: statusCode === 401 ? 'Authentication required.' : 'Workspace access denied.',
      requestId: request.id,
    },
  });
}
