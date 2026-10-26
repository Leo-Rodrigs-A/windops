import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceInvitationSchema,
  errorSchema,
  meSchema,
  revokeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
  workspaceContextSchema,
  workspaceDirectoryPageSchema,
  workspaceInvitationSchema,
  workspaceInvitationsPageSchema,
  workspaceListQuerySchema,
  workspaceMemberMutationSchema,
  workspaceMembersPageSchema,
  workspaceMembersQuerySchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceAuthorizationService } from './service.js';

const workspaceParams = z.object({ workspaceId: z.uuid() });
const invitationParams = z.object({ workspaceId: z.uuid(), invitationId: z.uuid() });
const memberParams = z.object({ workspaceId: z.uuid(), membershipId: z.uuid() });

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

  app.get(
    '/api/workspaces/:workspaceId/members',
    {
      schema: {
        params: workspaceParams,
        querystring: workspaceMembersQuerySchema,
        response: {
          200: workspaceMembersPageSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const query = workspaceMembersQuerySchema.parse(request.query);
      const result = await authorization.getMembers(request.headers, workspaceId, query);
      if (result.status === 'unauthenticated')
        return authorizationError(reply, request, 401, 'AUTHENTICATION_REQUIRED');
      if (result.status === 'forbidden')
        return authorizationError(reply, request, 403, 'WORKSPACE_ACCESS_DENIED');
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/directory',
    {
      schema: {
        params: workspaceParams,
        querystring: workspaceListQuerySchema,
        response: {
          200: workspaceDirectoryPageSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const query = workspaceListQuerySchema.parse(request.query);
      const result = await authorization.getDirectory(request.headers, workspaceId, query);
      if (result.status === 'unauthenticated')
        return authorizationError(reply, request, 401, 'AUTHENTICATION_REQUIRED');
      if (result.status === 'forbidden')
        return authorizationError(reply, request, 403, 'WORKSPACE_ACCESS_DENIED');
      return reply.send(result.value);
    },
  );

  app.patch(
    '/api/workspaces/:workspaceId/members/:membershipId/role',
    {
      schema: {
        params: memberParams,
        body: updateWorkspaceMemberRoleSchema,
        response: {
          200: workspaceMemberMutationSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, membershipId } = memberParams.parse(request.params);
      const { role, expectedRevision } = updateWorkspaceMemberRoleSchema.parse(request.body);
      const result = await authorization.updateMemberRole(
        request.headers,
        workspaceId,
        membershipId,
        role,
        expectedRevision,
      );
      if (result.status !== 'ok') return operationError(reply, request, result.status, 'member');
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/members/:membershipId/revoke',
    {
      schema: {
        params: memberParams,
        body: revokeWorkspaceMemberSchema,
        response: {
          200: workspaceMemberMutationSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, membershipId } = memberParams.parse(request.params);
      const { expectedRevision } = revokeWorkspaceMemberSchema.parse(request.body);
      const result = await authorization.revokeMember(
        request.headers,
        workspaceId,
        membershipId,
        expectedRevision,
      );
      if (result.status !== 'ok') return operationError(reply, request, result.status, 'member');
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/invitations',
    {
      schema: {
        params: workspaceParams,
        body: createWorkspaceInvitationSchema,
        response: {
          201: workspaceInvitationSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
          429: errorSchema,
          502: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const input = createWorkspaceInvitationSchema.parse(request.body);
      const result = await authorization.createInvitation(request.headers, workspaceId, input);
      if (result.status !== 'ok') return operationError(reply, request, result.status);
      return reply.code(201).send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/invitations',
    {
      schema: {
        params: workspaceParams,
        querystring: workspaceMembersQuerySchema,
        response: {
          200: workspaceInvitationsPageSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const query = workspaceMembersQuerySchema.parse(request.query);
      const result = await authorization.getInvitations(request.headers, workspaceId, query);
      if (result.status === 'unauthenticated')
        return authorizationError(reply, request, 401, 'AUTHENTICATION_REQUIRED');
      if (result.status === 'forbidden')
        return authorizationError(reply, request, 403, 'WORKSPACE_ACCESS_DENIED');
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/invitations/:invitationId/resend',
    {
      schema: {
        params: invitationParams,
        response: {
          200: workspaceInvitationSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          429: errorSchema,
          502: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, invitationId } = invitationParams.parse(request.params);
      const result = await authorization.resendInvitation(
        request.headers,
        workspaceId,
        invitationId,
      );
      if (result.status !== 'ok') return operationError(reply, request, result.status);
      return reply.send(result.value);
    },
  );

  app.post(
    '/api/invitations/accept',
    {
      schema: {
        body: acceptWorkspaceInvitationSchema,
        response: {
          200: workspaceContextSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          410: errorSchema,
          422: errorSchema,
          429: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { token } = acceptWorkspaceInvitationSchema.parse(request.body);
      const result = await authorization.acceptInvitation(request.headers, token, request.ip);
      if (result.status !== 'ok') return operationError(reply, request, result.status);
      return reply.send(result.value);
    },
  );
}

function operationError(
  reply: FastifyReply,
  request: FastifyRequest,
  status:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'expired'
    | 'email_mismatch'
    | 'email_unverified'
    | 'rate_limited'
    | 'delivery_failed',
  resource: 'invitation' | 'member' = 'invitation',
) {
  if (resource === 'member' && status === 'not_found')
    return reply.code(404).send({
      error: {
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found.',
        requestId: request.id,
      },
    });
  if (resource === 'member' && status === 'conflict')
    return reply.code(409).send({
      error: {
        code: 'MEMBERSHIP_CONFLICT',
        message: 'Membership changed or cannot be modified.',
        requestId: request.id,
      },
    });
  const errors = {
    unauthenticated: [401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'],
    forbidden: [403, 'WORKSPACE_ACCESS_DENIED', 'Workspace access denied.'],
    not_found: [404, 'INVITATION_NOT_FOUND', 'Invitation not found.'],
    conflict: [409, 'INVITATION_CONFLICT', 'Invitation is no longer available.'],
    expired: [410, 'INVITATION_EXPIRED', 'Invitation has expired.'],
    email_mismatch: [422, 'INVITATION_EMAIL_MISMATCH', 'Sign in with the invited email.'],
    email_unverified: [403, 'EMAIL_NOT_VERIFIED', 'Verify your email before accepting.'],
    rate_limited: [429, 'RATE_LIMITED', 'Too many attempts. Try again later.'],
    delivery_failed: [502, 'EMAIL_DELIVERY_FAILED', 'Invitation email could not be delivered.'],
  } as const;
  const [statusCode, code, message] = errors[status];
  return reply.code(statusCode).send({
    error: { code, message, requestId: request.id },
  });
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
