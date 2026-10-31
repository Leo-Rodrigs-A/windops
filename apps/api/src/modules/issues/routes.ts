import {
  completeIssueSchema,
  createIssueSchema,
  errorSchema,
  issueEventPageSchema,
  issueEventQuerySchema,
  issueLifecycleCommandSchema,
  issueSchema,
  issuesPageSchema,
  issuesQuerySchema,
  releaseIssueSchema,
  returnIssueSchema,
  startIssueSchema,
  updateIssueSchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { respondAccessError } from '../../platform/http/access-error.js';
import type { WorkspaceRequestAuthorizer } from '../workspaces/index.js';
import type { IssuesService } from './service.js';

const workspaceParamsSchema = z.object({ workspaceId: z.uuid() }).strict();
const issuePathParamsSchema = z.object({ workspaceId: z.uuid(), issueId: z.uuid() }).strict();

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

function respondIssueWriteError(
  reply: FastifyReply,
  request: FastifyRequest,
  status:
    | 'unauthenticated'
    | 'forbidden'
    | 'action_forbidden'
    | 'creator_wait'
    | 'not_found'
    | 'conflict'
    | 'idempotency_conflict'
    | 'revision_conflict'
    | 'not_editable'
    | 'equipment_unavailable'
    | 'state_conflict',
): FastifyReply {
  const responses = {
    unauthenticated: [401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'],
    forbidden: [403, 'WORKSPACE_ACCESS_DENIED', 'Workspace access denied.'],
    action_forbidden: [403, 'ISSUE_ACTION_FORBIDDEN', 'This action is not allowed for this issue.'],
    creator_wait: [403, 'ISSUE_CREATOR_WAIT', 'The creator may start this issue after one hour.'],
    not_found: [404, 'RESOURCE_NOT_FOUND', 'Resource not found.'],
    conflict: [409, 'ISSUE_CONFLICT', 'The issue could not be created with these identifiers.'],
    idempotency_conflict: [
      409,
      'IDEMPOTENCY_CONFLICT',
      'The command key was used with different content.',
    ],
    revision_conflict: [409, 'REVISION_CONFLICT', 'The issue changed. Reload and retry.'],
    not_editable: [409, 'ISSUE_NOT_EDITABLE', 'The issue can no longer be edited.'],
    equipment_unavailable: [409, 'EQUIPMENT_UNAVAILABLE', 'The selected equipment is unavailable.'],
    state_conflict: [409, 'ISSUE_STATE_CONFLICT', 'The issue is not in a state for this action.'],
  } as const;
  const [statusCode, code, message] = responses[status];
  return reply.code(statusCode).send({ error: { code, message, requestId: request.id } });
}

export function registerIssuesRoutes(
  app: FastifyInstance,
  authorization: WorkspaceRequestAuthorizer,
  issues: IssuesService,
) {
  const lifecycleActions = [
    ['reopen', 'reopenIssue'],
    ['archive', 'archiveIssue'],
    ['reactivate', 'reactivateIssue'],
  ] as const;
  for (const [action, method] of lifecycleActions) {
    app.post(
      `/api/workspaces/:workspaceId/issues/:issueId/${action}`,
      {
        schema: {
          params: issuePathParamsSchema,
          body: issueLifecycleCommandSchema,
          response: {
            200: issueSchema,
            400: errorSchema,
            401: errorSchema,
            403: errorSchema,
            404: errorSchema,
            409: errorSchema,
          },
        },
      },
      async (request, reply) => {
        const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
        const result = await issues[method](
          request.headers,
          workspaceId,
          issueId,
          issueLifecycleCommandSchema.parse(request.body),
        );
        if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
        return reply.send(result.value);
      },
    );
  }

  app.post(
    '/api/workspaces/:workspaceId/issues/:issueId/complete',
    {
      schema: {
        params: issuePathParamsSchema,
        body: completeIssueSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const result = await issues.completeIssue(
        request.headers,
        workspaceId,
        issueId,
        completeIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/issues',
    {
      schema: {
        params: workspaceParamsSchema,
        body: createIssueSchema,
        response: {
          201: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParamsSchema.parse(request.params);
      const result = await issues.createIssue(
        request.headers,
        workspaceId,
        createIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.code(201).send(result.value);
    },
  );

  app.patch(
    '/api/workspaces/:workspaceId/issues/:issueId',
    {
      schema: {
        params: issuePathParamsSchema,
        body: updateIssueSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const result = await issues.editIssue(
        request.headers,
        workspaceId,
        issueId,
        updateIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/issues/:issueId/start',
    {
      schema: {
        params: issuePathParamsSchema,
        body: startIssueSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const result = await issues.startIssue(
        request.headers,
        workspaceId,
        issueId,
        startIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/issues/:issueId/return',
    {
      schema: {
        params: issuePathParamsSchema,
        body: returnIssueSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const result = await issues.returnIssue(
        request.headers,
        workspaceId,
        issueId,
        returnIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/issues/:issueId/release',
    {
      schema: {
        params: issuePathParamsSchema,
        body: releaseIssueSchema,
        response: {
          200: issueSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, issueId } = issuePathParamsSchema.parse(request.params);
      const result = await issues.releaseIssue(
        request.headers,
        workspaceId,
        issueId,
        releaseIssueSchema.parse(request.body),
      );
      if (result.status !== 'ok') return respondIssueWriteError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

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
