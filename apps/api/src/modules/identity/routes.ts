import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { IdentityProvider } from './provider.js';

const verifyBody = z.object({ code: z.string().regex(/^\d{8}$/) }).strict();
const signupStartBody = z.object({ email: z.email().max(320) }).strict();
const signupCompleteBody = z
  .object({
    token: z.string().min(32).max(128),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(12).max(128),
  })
  .strict();
const onboardingBody = z
  .object({ name: z.string().trim().min(1).max(120), password: z.string().min(12).max(128) })
  .strict();
const pendingAllowedPaths = new Set([
  '/sign-in/email',
  '/sign-in/social',
  '/sign-up/email',
  '/callback/google',
  '/verify-email',
  '/request-password-reset',
  '/reset-password',
  '/sign-out',
]);

function errorResponse(reply: FastifyReply, statusCode: number, code: string, requestId: string) {
  return reply.code(statusCode).send({
    error: { code, message: 'The request could not be completed.', requestId },
  });
}

export function registerIdentityRoutes(
  app: FastifyInstance,
  identity: IdentityProvider,
  origin: string,
) {
  const { auth, challenges } = identity;

  app.post('/api/auth/signup/email', async (request, reply) => {
    if (!hasSameOrigin(request, origin))
      return errorResponse(reply, 403, 'ORIGIN_NOT_ALLOWED', request.id);
    const parsed = signupStartBody.safeParse(request.body);
    if (!parsed.success) return errorResponse(reply, 400, 'INVALID_REQUEST', request.id);
    try {
      await challenges.consumeRateLimit('signup-email-ip', request.ip, 5, 60 * 60_000);
      await challenges.consumeRateLimit(
        'signup-email-address',
        parsed.data.email.trim().toLowerCase(),
        3,
        60 * 60_000,
      );
      await identity.beginEmailSignup(parsed.data.email, origin);
    } catch {
      // Keep registration enumeration-resistant and avoid exposing delivery/rate details.
    }
    return reply.send({ status: 'verification_sent' });
  });

  app.post('/api/auth/signup/complete', async (request, reply) => {
    if (!hasSameOrigin(request, origin))
      return errorResponse(reply, 403, 'ORIGIN_NOT_ALLOWED', request.id);
    const parsed = signupCompleteBody.safeParse(request.body);
    if (!parsed.success) return errorResponse(reply, 400, 'INVALID_REQUEST', request.id);
    try {
      await challenges.consumeRateLimit('signup-complete-ip', request.ip, 20, 60 * 60_000);
      const result = await identity.completeEmailSignup(parsed.data);
      if (result !== 'created') return errorResponse(reply, 400, 'SIGNUP_LINK_INVALID', request.id);
      return reply.send({ status: 'created' });
    } catch {
      return errorResponse(reply, 400, 'SIGNUP_LINK_INVALID', request.id);
    }
  });

  app.post('/api/auth/signup/google/complete', async (request, reply) => {
    if (!hasSameOrigin(request, origin))
      return errorResponse(reply, 403, 'ORIGIN_NOT_ALLOWED', request.id);
    const parsed = onboardingBody.safeParse(request.body);
    if (!parsed.success) return errorResponse(reply, 400, 'INVALID_REQUEST', request.id);
    try {
      const session = await getProviderSession(request, identity);
      if (!session) return errorResponse(reply, 401, 'SESSION_REQUIRED', request.id);
      const state = await challenges.getState(session.session.id);
      if (!state) return errorResponse(reply, 403, 'ONBOARDING_NOT_AVAILABLE', request.id);
      const onboardingStatus = await identity.onboardingStatus(state.userId);
      if (onboardingStatus !== 'needs_setup')
        return errorResponse(reply, 403, 'GOOGLE_VERIFICATION_REQUIRED', request.id);
      await auth.api.updateUser({
        headers: fromNodeHeaders(request.headers),
        body: { name: parsed.data.name },
      });
      await auth.api.setPassword({
        headers: fromNodeHeaders(request.headers),
        body: { newPassword: parsed.data.password },
      });
      return reply.send({ status: 'completed' });
    } catch {
      return errorResponse(reply, 400, 'ONBOARDING_FAILED', request.id);
    }
  });

  app.get('/api/auth/onboarding/status', async (request, reply) => {
    const session = await getProviderSession(request, identity);
    if (!session) return errorResponse(reply, 401, 'SESSION_REQUIRED', request.id);
    const state = await challenges.getState(session.session.id);
    if (!state) return errorResponse(reply, 403, 'ONBOARDING_NOT_AVAILABLE', request.id);
    return reply.send({ status: await identity.onboardingStatus(state.userId) });
  });

  app.get('/api/auth/providers', async (_request, reply) =>
    reply.send({ google: identity.googleEnabled }),
  );

  app.get('/api/auth/second-step/status', async (request, reply) => {
    const state = await getRequestState(request, identity);
    if (!state) return reply.send({ status: 'anonymous' });
    if (!state.emailSecondStepAt) {
      return reply.send({
        status: 'pending_email_second_step',
        expiresAt: state.expiresAt.toISOString(),
      });
    }
    return reply.send({
      status: 'authenticated',
      user: { id: state.userId, email: state.email },
    });
  });

  app.post('/api/auth/second-step/verify', async (request, reply) => {
    if (!hasSameOrigin(request, origin))
      return errorResponse(reply, 403, 'ORIGIN_NOT_ALLOWED', request.id);
    const parsed = verifyBody.safeParse(request.body);
    if (!parsed.success) return errorResponse(reply, 400, 'INVALID_REQUEST', request.id);
    const session = await getProviderSession(request, identity);
    if (!session) return errorResponse(reply, 401, 'SESSION_REQUIRED', request.id);
    const state = await challenges.getState(session.session.id);
    if (!state || state.emailSecondStepAt)
      return errorResponse(reply, 400, 'CHALLENGE_UNAVAILABLE', request.id);
    try {
      await challenges.consumeRateLimit('second-step-verify-ip', request.ip, 10, 60_000);
      await challenges.consumeRateLimit(
        'second-step-verify-account',
        state.userId,
        20,
        60 * 60_000,
      );
      await challenges.verify(session.session.id, parsed.data.code);
    } catch (error) {
      return challengeError(reply, request, error);
    }
    return reply.send({ status: 'authenticated' });
  });

  app.post('/api/auth/second-step/resend', async (request, reply) => {
    if (!hasSameOrigin(request, origin))
      return errorResponse(reply, 403, 'ORIGIN_NOT_ALLOWED', request.id);
    const session = await getProviderSession(request, identity);
    if (!session) return errorResponse(reply, 401, 'SESSION_REQUIRED', request.id);
    const state = await challenges.getState(session.session.id);
    if (!state || state.emailSecondStepAt)
      return errorResponse(reply, 400, 'CHALLENGE_UNAVAILABLE', request.id);
    try {
      await challenges.consumeRateLimit('second-step-resend-ip', request.ip, 5, 60 * 60_000);
      await challenges.consumeRateLimit('second-step-resend-account', state.userId, 5, 60 * 60_000);
      await challenges.resend(session.session.id);
    } catch (error) {
      return challengeError(reply, request, error);
    }
    return reply.send({ status: 'challenge_sent' });
  });

  app.route({
    method: ['GET', 'POST', 'OPTIONS'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
      const authPath = requestUrl.pathname.slice('/api/auth'.length) || '/';
      if (authPath === '/get-session') {
        const state = await getRequestState(request, identity);
        if (!state) return reply.send({ session: null, user: null, status: 'anonymous' });
        if (!state.emailSecondStepAt) {
          return reply.send({ session: null, user: null, status: 'pending_email_second_step' });
        }
        return reply.send({
          session: { emailSecondStepAt: state.emailSecondStepAt },
          user: { id: state.userId, email: state.email },
          status: 'authenticated',
        });
      }

      const state = await getRequestState(request, identity);
      if (authPath === '/sign-up/email')
        return errorResponse(reply, 403, 'SIGNUP_FLOW_REQUIRED', request.id);
      const pendingRouteAllowed =
        pendingAllowedPaths.has(authPath) || authPath.startsWith('/reset-password/');
      if (state && !state.emailSecondStepAt && !pendingRouteAllowed) {
        return errorResponse(reply, 403, 'SECOND_STEP_REQUIRED', request.id);
      }

      const headers = fromNodeHeaders(request.headers);
      headers.set('x-windops-client-ip', request.ip);
      const requestInit: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers,
      };
      if (request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined) {
        requestInit.body = JSON.stringify(request.body);
        requestInit.duplex = 'half';
      }
      let response: Response;
      try {
        response = await auth.handler(new Request(requestUrl, requestInit));
      } catch {
        return errorResponse(reply, 500, 'AUTH_REQUEST_FAILED', request.id);
      }

      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie' && key !== 'content-length' && key !== 'transfer-encoding')
          reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);

      if (authPath === '/sign-in/email' && response.ok) {
        await response.body?.cancel();
        return reply.code(response.status).send({ status: 'pending_email_second_step' });
      }
      const body = await response.text();
      return reply.code(response.status).send(body || null);
    },
  });
}

async function getRequestState(request: FastifyRequest, identity: IdentityProvider) {
  const session = await getProviderSession(request, identity);
  if (!session) return null;
  return identity.challenges.getState(session.session.id);
}

function getProviderSession(request: FastifyRequest, identity: IdentityProvider) {
  return identity.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
}

function hasSameOrigin(request: FastifyRequest, origin: string) {
  return request.headers.origin === origin;
}

function challengeError(reply: FastifyReply, request: FastifyRequest, error: unknown) {
  const reason = (error as { reason?: string }).reason;
  if (reason === 'cooldown' || reason === 'send_limit' || reason === 'rate_limit') {
    return errorResponse(reply, 429, 'RATE_LIMITED', request.id);
  }
  if (reason === 'delivery') return errorResponse(reply, 503, 'DELIVERY_UNAVAILABLE', request.id);
  if (reason === 'expired') return errorResponse(reply, 400, 'CHALLENGE_EXPIRED', request.id);
  return errorResponse(reply, 400, 'INVALID_CHALLENGE', request.id);
}
