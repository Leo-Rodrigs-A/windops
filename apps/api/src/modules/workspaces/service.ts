import type { IncomingHttpHeaders } from 'node:http';
import type {
  AuthenticatedUser,
  AuthorizedWorkspace,
  Me,
  WorkspaceContext,
  WorkspaceDirectoryPage,
  WorkspaceListQuery,
  WorkspaceMembersPage,
  WorkspaceMembersQuery,
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
  getMembers(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    query: WorkspaceMembersQuery,
  ): Promise<AuthorizationResult<WorkspaceMembersPage>>;
  getDirectory(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    query: WorkspaceListQuery,
  ): Promise<AuthorizationResult<WorkspaceDirectoryPage>>;
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
      const authenticatedUser: AuthenticatedUser = user;
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

    async getMembers(headers, workspaceId, query) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId, ['admin']);
      if (authorization.status !== 'ok') return authorization;
      const result = await pool.query<{
        membershipId: string;
        userId: string;
        role: WorkspaceRole;
        createdAt: Date;
      }>(
        `SELECT id AS "membershipId", user_id AS "userId", role,
                created_at AS "createdAt"
         FROM public.workspace_members
         WHERE workspace_id = $1 AND revoked_at IS NULL
           AND ($2::uuid IS NULL OR id > $2::uuid)
         ORDER BY id
         LIMIT $3`,
        [workspaceId, query.cursor ?? null, query.limit + 1],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const users = await identity.getUsersByIds(rows.map((row) => row.userId));
      const usersById = new Map(users.map((user) => [user.id, user]));
      const items = rows.map((row) => {
        const user = usersById.get(row.userId);
        if (!user) throw new Error('Workspace member identity is missing.');
        return {
          membershipId: row.membershipId,
          user,
          role: row.role,
          createdAt: row.createdAt.toISOString(),
          revokedAt: null,
        };
      });
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.membershipId ?? null) : null },
      };
    },

    async getDirectory(headers, workspaceId, query) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId, ['admin']);
      if (authorization.status !== 'ok') return authorization;
      const activeMembers = await pool.query<{ userId: string }>(
        `SELECT DISTINCT user_id AS "userId"
         FROM public.workspace_members
         WHERE revoked_at IS NULL`,
      );
      const page = await identity.listVerifiedDirectoryAccounts({
        excludeUserIds: activeMembers.rows.map((row) => row.userId),
        limit: query.limit,
        ...(query.cursor ? { afterId: query.cursor } : {}),
        ...(query.search ? { search: query.search } : {}),
      });
      return { status: 'ok', value: page };
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
