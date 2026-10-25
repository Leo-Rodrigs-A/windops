import type { IncomingHttpHeaders } from 'node:http';
import type {
  AuthenticatedUser,
  WorkspaceDirectoryAccount,
  WorkspaceDirectoryPage,
} from '@windops/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { Pool } from 'pg';
import type { IdentityProvider } from './provider.js';

export interface DirectoryLookup {
  afterId?: string;
  excludeUserIds: string[];
  limit: number;
  search?: string;
}

export interface IdentityService {
  resolveAuthenticatedUser(headers: IncomingHttpHeaders): Promise<AuthenticatedUser | null>;
  getUsersByIds(userIds: string[]): Promise<AuthenticatedUser[]>;
  listVerifiedDirectoryAccounts(input: DirectoryLookup): Promise<WorkspaceDirectoryPage>;
}

export function createIdentityService(identity: IdentityProvider, pool: Pool): IdentityService {
  return {
    async resolveAuthenticatedUser(headers) {
      const providerSession = await identity.auth.api.getSession({
        headers: fromNodeHeaders(headers),
      });
      if (!providerSession) return null;
      const state = await identity.challenges.getState(providerSession.session.id);
      if (!state?.emailSecondStepAt) return null;
      return {
        id: state.userId,
        email: state.email,
        name: providerSession.user.name,
      };
    },

    async getUsersByIds(userIds) {
      if (userIds.length === 0) return [];
      const result = await pool.query<AuthenticatedUser>(
        `SELECT id, name, email FROM public.auth_users WHERE id = ANY($1::uuid[])`,
        [userIds],
      );
      return result.rows;
    },

    async listVerifiedDirectoryAccounts(input) {
      const search = input.search?.replace(/[\\%_]/g, '\\$&').toLowerCase() ?? null;
      const result = await pool.query<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
      }>(
        `SELECT id, name, email, created_at AS "createdAt"
         FROM public.auth_users
         WHERE email_verified = true
           AND NOT (id = ANY($1::uuid[]))
           AND ($2::uuid IS NULL OR id > $2::uuid)
           AND ($3::text IS NULL OR lower(name) LIKE '%' || $3 || '%' ESCAPE '\\'
                OR lower(email) LIKE '%' || $3 || '%' ESCAPE '\\')
         ORDER BY id
         LIMIT $4`,
        [input.excludeUserIds, input.afterId ?? null, search, input.limit + 1],
      );
      const hasMore = result.rows.length > input.limit;
      const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
      const items: WorkspaceDirectoryAccount[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      }));
      return {
        items,
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      };
    },
  };
}

export type { GoogleCredentials, IdentityProvider } from './provider.js';
export { createIdentityProvider } from './provider.js';
export { registerIdentityRoutes } from './routes.js';
