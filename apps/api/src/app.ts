import type { Writable } from 'node:stream';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import { errorSchema, healthSchema } from '@windops/contracts';
import Fastify, { type FastifyError } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { type IdentityProvider, registerIdentityRoutes } from './modules/identity/index.js';
import { type IssuesService, registerIssuesRoutes } from './modules/issues/index.js';
import {
  type NotificationsService,
  registerNotificationRoutes,
} from './modules/notifications/index.js';
import { type ParksCatalogService, registerParksRoutes } from './modules/parks/index.js';
import type { SyncShapeProxy } from './modules/sync/index.js';
import { registerSyncRoutes } from './modules/sync/routes.js';
import {
  registerWorkspaceRoutes,
  type WorkspaceAuthorizationService,
} from './modules/workspaces/index.js';
export function buildApp(options: {
  ready: () => Promise<void>;
  logger?: boolean | { stream?: Writable };
  docs?: boolean;
  trustProxy?: boolean;
  identity?: IdentityProvider;
  workspaceAuthorization?: WorkspaceAuthorizationService;
  parksCatalog?: ParksCatalogService;
  issues?: IssuesService;
  notifications?: NotificationsService;
  syncProxy?: SyncShapeProxy;
  authOrigin?: string;
}) {
  const app = Fastify({
    logger: options.logger
      ? {
          ...(typeof options.logger === 'object' && options.logger.stream
            ? { stream: options.logger.stream }
            : {}),
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
          serializers: {
            req(request) {
              const rawUrl = typeof request.url === 'string' ? request.url : '/';
              const path = rawUrl.split(/[?#]/, 1)[0] || '/';
              return {
                method: request.method,
                url: path,
                hostname: request.hostname,
              };
            },
          },
          level: 'info',
        }
      : false,
    bodyLimit: 1048576,
    trustProxy: options.trustProxy ?? false,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(swagger, {
    openapi: { info: { title: 'Wind Ops API', version: '0.1.0' } },
    transform: jsonSchemaTransform,
  });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const status = error.validation
      ? 400
      : error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;
    if (status === 500)
      request.log.error({ requestId: request.id, errorName: error.name }, 'Request failed');
    reply.code(status).send({
      error: {
        code: status === 400 ? 'VALIDATION_ERROR' : 'REQUEST_FAILED',
        message: status < 500 ? 'Invalid request.' : 'Internal server error.',
        requestId: request.id,
      },
    });
  });
  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: request.id } }),
  );
  app.after(() => {
    app.get('/api/health/live', { schema: { response: { 200: healthSchema } } }, async () => ({
      status: 'ok' as const,
      service: 'windops-api' as const,
    }));
    app.get(
      '/api/health/ready',
      { schema: { response: { 200: healthSchema, 503: errorSchema } } },
      async (request, reply) => {
        try {
          await options.ready();
          return { status: 'ok' as const, service: 'windops-api' as const };
        } catch {
          return reply.code(503).send({
            error: {
              code: 'NOT_READY',
              message: 'Dependencies unavailable.',
              requestId: request.id,
            },
          });
        }
      },
    );
    app.register(async (instance) => registerSyncRoutes(instance, options.syncProxy));
    if (options.identity && options.authOrigin)
      registerIdentityRoutes(app, options.identity, options.authOrigin);
    if (options.workspaceAuthorization)
      registerWorkspaceRoutes(app, options.workspaceAuthorization);
    if (options.workspaceAuthorization && options.parksCatalog)
      registerParksRoutes(
        app,
        options.workspaceAuthorization,
        options.parksCatalog,
        options.issues,
      );
    if (options.workspaceAuthorization && options.issues)
      registerIssuesRoutes(app, options.workspaceAuthorization, options.issues);
    if (options.workspaceAuthorization && options.notifications)
      registerNotificationRoutes(app, options.workspaceAuthorization, options.notifications);
    if (options.docs) app.register(scalar, { routePrefix: '/api/docs' });
  });
  return app;
}
