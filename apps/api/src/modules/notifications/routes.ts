import {
  errorSchema,
  notificationSchema,
  notificationsPageSchema,
  notificationsQuerySchema,
  pushStatusSchema,
  pushSubscriptionInputSchema,
  pushSubscriptionResultSchema,
} from '@windops/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { WorkspaceRouteAccessService } from '../workspaces/index.js';
import type { NotificationsService } from './service.js';

const workspaceParams = z.object({ workspaceId: z.uuid() }).strict();
const notificationParams = z.object({ workspaceId: z.uuid(), notificationId: z.uuid() }).strict();
const deviceParams = z.object({ workspaceId: z.uuid(), deviceId: z.uuid() }).strict();

function accessError(reply: FastifyReply, request: FastifyRequest, status: 401 | 403) {
  return reply.code(status).send({
    error: {
      code: status === 401 ? 'AUTHENTICATION_REQUIRED' : 'WORKSPACE_ACCESS_DENIED',
      message: status === 401 ? 'Authentication required.' : 'Workspace access denied.',
      requestId: request.id,
    },
  });
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  authorization: WorkspaceRouteAccessService,
  notifications: NotificationsService,
) {
  app.get(
    '/api/workspaces/:workspaceId/notifications',
    {
      schema: {
        params: workspaceParams,
        querystring: notificationsQuerySchema,
        response: {
          200: notificationsPageSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const query = notificationsQuerySchema.parse(request.query);
      const principal = await authorization.authorizeWorkspace(request.headers, workspaceId);
      if (principal.status !== 'ok')
        return accessError(reply, request, principal.status === 'unauthenticated' ? 401 : 403);
      const page = await notifications.list(workspaceId, principal.value.user.id, query);
      if ('status' in page)
        return reply.code(400).send({
          error: {
            code: 'INVALID_CURSOR',
            message: 'The requested cursor is invalid.',
            requestId: request.id,
          },
        });
      return reply.send(page);
    },
  );

  app.post(
    '/api/workspaces/:workspaceId/notifications/:notificationId/read',
    {
      schema: {
        params: notificationParams,
        response: {
          200: notificationSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, notificationId } = notificationParams.parse(request.params);
      const result = await notifications.markRead(
        request.headers,
        authorization,
        workspaceId,
        notificationId,
      );
      if (result.status !== 'ok') {
        if (result.status === 'unauthenticated' || result.status === 'forbidden')
          return accessError(reply, request, result.status === 'unauthenticated' ? 401 : 403);
        return reply.code(404).send({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Notification not found.',
            requestId: request.id,
          },
        });
      }
      return reply.send(result.value);
    },
  );

  app.get(
    '/api/workspaces/:workspaceId/notifications/push/status',
    {
      schema: {
        params: workspaceParams,
        response: { 200: pushStatusSchema, 401: errorSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const principal = await authorization.authorizeWorkspace(request.headers, workspaceId);
      if (principal.status !== 'ok')
        return accessError(reply, request, principal.status === 'unauthenticated' ? 401 : 403);
      return reply.send(notifications.pushStatus());
    },
  );

  app.put(
    '/api/workspaces/:workspaceId/notifications/push-subscriptions',
    {
      schema: {
        params: workspaceParams,
        body: pushSubscriptionInputSchema,
        response: {
          200: pushSubscriptionResultSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { workspaceId } = workspaceParams.parse(request.params);
      const result = await notifications.subscribe(
        request.headers,
        authorization,
        workspaceId,
        pushSubscriptionInputSchema.parse(request.body),
      );
      if (result.status === 'unauthenticated' || result.status === 'forbidden')
        return accessError(reply, request, result.status === 'unauthenticated' ? 401 : 403);
      if (result.status === 'invalid_endpoint')
        return reply.code(400).send({
          error: {
            code: 'INVALID_PUSH_ENDPOINT',
            message: 'Unsupported push endpoint.',
            requestId: request.id,
          },
        });
      return reply.send({ status: 'subscribed' as const });
    },
  );

  app.delete(
    '/api/workspaces/:workspaceId/notifications/push-subscriptions/:deviceId',
    {
      schema: {
        params: deviceParams,
        response: { 204: z.null(), 401: errorSchema, 403: errorSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId, deviceId } = deviceParams.parse(request.params);
      const result = await notifications.unsubscribe(
        request.headers,
        authorization,
        workspaceId,
        deviceId,
      );
      if (result.status !== 'ok')
        return accessError(reply, request, result.status === 'unauthenticated' ? 401 : 403);
      return reply.code(204).send();
    },
  );
}
