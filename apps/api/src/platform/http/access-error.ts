import type { FastifyReply, FastifyRequest } from 'fastify';

export function respondAccessError(
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
