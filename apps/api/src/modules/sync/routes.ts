import type { FastifyInstance } from 'fastify';
// Fail closed: never forward arbitrary table/where parameters or Electric credentials.
export async function registerSyncRoutes(app: FastifyInstance) {
  app.get('/api/sync/:collection', async (request, reply) =>
    reply.code(503).send({
      error: {
        code: 'SYNC_NOT_IMPLEMENTED',
        message: 'Synchronization is not enabled.',
        requestId: request.id,
      },
    }),
  );
}
