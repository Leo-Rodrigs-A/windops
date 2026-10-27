import {
  errorSchema,
  issueEventPageSchema,
  issueEventQuerySchema,
  issueSchema,
  issuesPageSchema,
  issuesQuerySchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';
import type { IssuesService } from './service.js';

const workspaceParamsSchema = z.object({ workspaceId: z.uuid() }).strict();
const issuePathParamsSchema = z.object({ workspaceId: z.uuid(), issueId: z.uuid() }).strict();

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

function respondIssueReadError(
  reply: FastifyReply,
  request: FastifyRequest,
  status: 'not_found' | 'invalid_cursor',
): FastifyReply {
  return reply.code(status === 'not_found' ? 404 : 400).send({
    error: {
      code: status === 'not_found' ? 'RESOURCE_NOT_FOUND' : 'INVALID_CURSOR',
      message: status === 'not_found' ? 'Resource not found.' : 'The requested cursor is invalid.',
      requestId: request.id,
    },
  });
}

export function registerIssuesRoutes(
  app: FastifyInstance,
  authorization: WorkspaceAuthorizationService,
  issues: IssuesService,
) {
  app.get(
    '/api/workspaces/:workspaceId/issues',
    {
      schema: {
        params: workspaceParamsSchema,
        querystring: issuesQuerySchema,
        response: { 200: issuesPageSchema, 400: errorSchema, 401: errorSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParamsSchema.parse(request.params);
      const permission = await authorization.authorizeWorkspace(request.headers, workspaceId);
      if (permission.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          permission.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await issues.listIssues(workspaceId, issuesQuerySchema.parse(request.query));
      if (result.status !== 'ok') return respondIssueReadError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/issues/:issueId',
    {
      schema: {
        params: issuePathParamsSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const permission = await authorization.authorizeWorkspace(request.headers, workspaceId);
      if (permission.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          permission.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await issues.getIssue(workspaceId, issueId);
      if (result.status !== 'ok') return respondIssueReadError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/issues/:issueId/events',
    {
      schema: {
        params: issuePathParamsSchema,
        querystring: issueEventQuerySchema,
        response: {
          200: issueEventPageSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const permission = await authorization.authorizeWorkspace(request.headers, workspaceId);
      if (permission.status !== 'ok')
        return respondAccessError(
          reply,
          request,
          permission.status === 'unauthenticated' ? 401 : 403,
        );
      const result = await issues.listIssueEvents(
        workspaceId,
        issueId,
        issueEventQuerySchema.parse(request.query),
      );
      if (result.status !== 'ok') return respondIssueReadError(reply, request, result.status);
      return reply.send(result.value);
    },
  );
}
