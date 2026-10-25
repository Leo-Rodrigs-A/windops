import type { IncomingHttpHeaders } from 'node:http';
import type { AuthenticatedUser } from '@windops/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { IdentityProvider } from './provider.js';

export interface IdentityService {
  resolveAuthenticatedUser(headers: IncomingHttpHeaders): Promise<AuthenticatedUser | null>;
}

export function createIdentityService(identity: IdentityProvider): IdentityService {
  return {
    async resolveAuthenticatedUser(headers) {
      const providerSession = await identity.auth.api.getSession({
        headers: fromNodeHeaders(headers),
      });
      if (!providerSession) return null;
      const state = await identity.challenges.getState(providerSession.session.id);
      if (!state?.emailSecondStepAt) return null;
      return { id: state.userId, email: state.email };
    },
  };
}

export type { GoogleCredentials, IdentityProvider } from './provider.js';
export { createIdentityProvider } from './provider.js';
export { registerIdentityRoutes } from './routes.js';
