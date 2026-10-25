import type { IncomingHttpHeaders } from 'node:http';
import type {
  AuthenticatedUser,
  AuthorizedWorkspace,
  Me,
  WorkspaceContext,
  WorkspaceRole,
} from '@windops/contracts';
import type { Pool } from 'pg';
import type { IdentityService } from '../identity/index.js';

export type AuthorizationResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };
export type IdentityResult<T> = { status: 'ok'; value: T } | { status: 'unauthenticated' };
export interface AuthorizedWorkspacePrincipal {
  user: AuthenticatedUser;
  workspace: { id: string; name: string; role: WorkspaceRole };
}

export interface WorkspaceAuthorizationService {
  getMe(headers: IncomingHttpHeaders): Promise<IdentityResult<Me>>;
  authorizeWorkspace(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    allowedRoles?: readonly WorkspaceRole[],
  ): Promise<AuthorizationResult<AuthorizedWorkspacePrincipal>>;
  getContext(
    headers: IncomingHttpHeaders,
    workspaceId: string,
  ): Promise<AuthorizationResult<WorkspaceContext>>;
}

export function createWorkspaceAuthorizationService(
  pool: Pool,
  identity: IdentityService,
): WorkspaceAuthorizationService {
  return {
    async getMe(headers) {
      const user = await identity.resolveAuthenticatedUser(headers);
      if (!user) return { status: 'unauthenticated' };
      const result = await pool.query<{
        id: string;
        name: string;
        role: WorkspaceRole;
      }>(
        `SELECT w.id, w.name, m.role
         FROM public.workspace_members m
         JOIN public.workspaces w ON w.id = m.workspace_id
         WHERE m.user_id = $1 AND m.revoked_at IS NULL
         ORDER BY m.created_at, w.id`,
        [user.id],
      );
      const workspaces: AuthorizedWorkspace[] = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
      }));
      const authenticatedUser: AuthenticatedUser = { id: user.id, email: user.email };
      return { status: 'ok', value: { user: authenticatedUser, workspaces } };
    },

    async getContext(headers, workspaceId) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId);
      if (authorization.status !== 'ok') return authorization;
      const { workspace } = authorization.value;
      return {
        status: 'ok',
        value: { workspace: { id: workspace.id, name: workspace.name }, role: workspace.role },
      };
    },

    async authorizeWorkspace(headers, workspaceId, allowedRoles) {
      const user = await identity.resolveAuthenticatedUser(headers);
      if (!user) return { status: 'unauthenticated' };
      const result = await pool.query<{
        id: string;
        name: string;
        role: WorkspaceRole;
      }>(
        `SELECT w.id, w.name, m.role
         FROM public.workspace_members m
         JOIN public.workspaces w ON w.id = m.workspace_id
         WHERE m.workspace_id = $1
           AND m.user_id = $2
           AND m.revoked_at IS NULL
         LIMIT 1`,
        [workspaceId, user.id],
      );
      const membership = result.rows[0];
      if (!membership) return { status: 'forbidden' };
      if (allowedRoles && !allowedRoles.includes(membership.role)) return { status: 'forbidden' };
      return {
        status: 'ok',
        value: {
          user,
          workspace: { id: membership.id, name: membership.name, role: membership.role },
        },
      };
    },
  };
}
