import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type {
  AcceptWorkspaceInvitation,
  AuthenticatedUser,
  AuthorizedWorkspace,
  CreateWorkspaceInvitation,
  Me,
  WorkspaceContext,
  WorkspaceDirectoryPage,
  WorkspaceInvitation,
  WorkspaceInvitationsPage,
  WorkspaceListQuery,
  WorkspaceMemberMutation,
  WorkspaceMembersPage,
  WorkspaceMembersQuery,
  WorkspaceRole,
} from '@windops/contracts';
import type { Pool, PoolClient } from 'pg';
import type { EmailSender } from '../../platform/email.js';
import type { IdentityService } from '../identity/index.js';

export type AuthorizationResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };
export type IdentityResult<T> = { status: 'ok'; value: T } | { status: 'unauthenticated' };
export type WorkspaceOperationResult<T> =
  | AuthorizationResult<T>
  | {
      status:
        | 'not_found'
        | 'conflict'
        | 'expired'
        | 'email_mismatch'
        | 'email_unverified'
        | 'rate_limited'
        | 'delivery_failed';
    };
export interface AuthorizedWorkspacePrincipal {
  user: AuthenticatedUser;
  workspace: { id: string; name: string; role: WorkspaceRole };
}

interface InvitationRow {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  tokenHash: Buffer;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  supersededByInvitationId: string | null;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  sentAt: Date | null;
  deliveryFailedAt: Date | null;
}

function toInvitationDto(row: InvitationRow): WorkspaceInvitation {
  const now = Date.now();
  const status = row.acceptedAt
    ? 'accepted'
    : row.supersededByInvitationId
      ? 'superseded'
      : row.revokedAt
        ? row.deliveryStatus === 'failed'
          ? 'delivery_failed'
          : 'revoked'
        : row.expiresAt.getTime() <= now
          ? 'expired'
          : 'pending';
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status,
    deliveryStatus: row.deliveryStatus,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

const invitationColumns = `id, workspace_id AS "workspaceId", email, role, token_hash AS "tokenHash",
  created_at AS "createdAt", expires_at AS "expiresAt", accepted_at AS "acceptedAt",
  revoked_at AS "revokedAt", superseded_by_invitation_id AS "supersededByInvitationId",
  delivery_status AS "deliveryStatus", sent_at AS "sentAt", delivery_failed_at AS "deliveryFailedAt"`;

async function lockWorkspaceForAdmin(
  client: PoolClient,
  workspaceId: string,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const workspace = await client.query<{ id: string; name: string }>(
    'SELECT id, name FROM public.workspaces WHERE id = $1 FOR UPDATE',
    [workspaceId],
  );
  const row = workspace.rows[0];
  if (!row) return null;
  const membership = await client.query(
    `SELECT id FROM public.workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND role = 'admin' AND revoked_at IS NULL
     FOR UPDATE`,
    [workspaceId, userId],
  );
  return membership.rowCount ? row : null;
}

async function deliverInvitation(
  pool: Pool,
  emailSender: EmailSender,
  appOrigin: string,
  invitation: InvitationRow,
  token: string,
): Promise<WorkspaceOperationResult<WorkspaceInvitation>> {
  const link = new URL('/invite/accept', appOrigin);
  link.hash = new URLSearchParams({ token }).toString();
  try {
    await emailSender.send({
      to: invitation.email,
      subject: 'Convite para o Wind Ops',
      text: `Você foi convidado para entrar no workspace do Wind Ops.\n\nAbra este link para continuar: ${link.toString()}\n\nO convite expira em 48 horas. Se você não esperava este convite, ignore esta mensagem.`,
    });
  } catch {
    await pool.query(
      `UPDATE public.workspace_invitations
       SET delivery_status = 'failed', delivery_failed_at = clock_timestamp(),
           revoked_at = clock_timestamp()
       WHERE id = $1 AND delivery_status = 'pending'
         AND accepted_at IS NULL AND revoked_at IS NULL
         AND superseded_by_invitation_id IS NULL`,
      [invitation.id],
    );
    return { status: 'delivery_failed' };
  }
  const sent = await pool.query<InvitationRow>(
    `UPDATE public.workspace_invitations
     SET delivery_status = 'sent', sent_at = clock_timestamp()
     WHERE id = $1 AND delivery_status = 'pending'
       AND accepted_at IS NULL AND revoked_at IS NULL
       AND superseded_by_invitation_id IS NULL
     RETURNING ${invitationColumns}`,
    [invitation.id],
  );
  const row = sent.rows[0];
  return row ? { status: 'ok', value: toInvitationDto(row) } : { status: 'conflict' };
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
  createInvitation(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    input: CreateWorkspaceInvitation,
  ): Promise<WorkspaceOperationResult<WorkspaceInvitation>>;
  resendInvitation(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceOperationResult<WorkspaceInvitation>>;
  getInvitations(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    query: WorkspaceMembersQuery,
  ): Promise<AuthorizationResult<WorkspaceInvitationsPage>>;
  acceptInvitation(
    headers: IncomingHttpHeaders,
    token: AcceptWorkspaceInvitation['token'],
    clientIp: string,
  ): Promise<WorkspaceOperationResult<WorkspaceContext>>;
  promoteMember(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    membershipId: string,
    expectedRevision: number,
  ): Promise<WorkspaceOperationResult<WorkspaceMemberMutation>>;
  revokeMember(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    membershipId: string,
    expectedRevision: number,
  ): Promise<WorkspaceOperationResult<WorkspaceMemberMutation>>;
}

export function createWorkspaceAuthorizationService(
  pool: Pool,
  identity: IdentityService,
  emailSender: EmailSender,
  appOrigin: string,
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
      const items: WorkspaceMembersPage['items'] = [];
      let cursor = query.cursor ?? null;
      let nextCursor: string | null = null;
      let hasMoreRows = true;
      while (hasMoreRows) {
        const result = await pool.query<{
          membershipId: string;
          userId: string;
          role: WorkspaceRole;
          createdAt: Date;
          revision: number;
        }>(
          `SELECT id AS "membershipId", user_id AS "userId", role,
                  created_at AS "createdAt", revision
           FROM public.workspace_members
           WHERE workspace_id = $1 AND revoked_at IS NULL
             AND ($2::uuid IS NULL OR id > $2::uuid)
           ORDER BY id
           LIMIT 101`,
          [workspaceId, cursor],
        );
        hasMoreRows = result.rows.length > 100;
        const rows = hasMoreRows ? result.rows.slice(0, 100) : result.rows;
        if (rows.length === 0) break;
        const users = await identity.getUsersByIds(rows.map((row) => row.userId));
        const usersById = new Map(users.map((user) => [user.id, user]));
        for (const row of rows) {
          const user = usersById.get(row.userId);
          if (!user) throw new Error('Workspace member identity is missing.');
          const matchesSearch =
            !query.search ||
            `${user.name} ${user.email}`
              .toLocaleLowerCase()
              .includes(query.search.toLocaleLowerCase());
          if (!matchesSearch) continue;
          items.push({
            membershipId: row.membershipId,
            user,
            role: row.role,
            createdAt: row.createdAt.toISOString(),
            revokedAt: null,
            revision: row.revision,
          });
          if (items.length > query.limit) {
            items.pop();
            nextCursor = items.at(-1)?.membershipId ?? null;
            hasMoreRows = false;
            break;
          }
        }
        cursor = rows.at(-1)?.membershipId ?? cursor;
      }
      return {
        status: 'ok',
        value: { items, nextCursor },
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

    async getInvitations(headers, workspaceId, query) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId, ['admin']);
      if (authorization.status !== 'ok') return authorization;
      const result = await pool.query<InvitationRow>(
        `SELECT ${invitationColumns}
         FROM public.workspace_invitations
         WHERE workspace_id = $1 AND ($2::uuid IS NULL OR id < $2)
         ORDER BY id DESC
         LIMIT $3`,
        [workspaceId, query.cursor ?? null, query.limit + 1],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const items = rows.map(toInvitationDto);
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null },
      };
    },

    async createInvitation(headers, workspaceId, input) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId, ['admin']);
      if (authorization.status !== 'ok') return authorization;
      const actorId = authorization.value.user.id;
      if (!(await identity.consumeInvitationRateLimit('delivery', actorId)))
        return { status: 'rate_limited' };

      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest();
      const invitationId = randomUUID();
      const client = await pool.connect();
      let invitation: InvitationRow | undefined;
      try {
        await client.query('BEGIN');
        if (!(await lockWorkspaceForAdmin(client, workspaceId, actorId))) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }
        const sentRecently = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM public.workspace_invitations
           WHERE workspace_id = $1 AND email = $2
             AND created_at >= clock_timestamp() - interval '24 hours'`,
          [workspaceId, input.email],
        );
        if (Number(sentRecently.rows[0]?.count ?? 0) >= 5) {
          await client.query('ROLLBACK');
          return { status: 'rate_limited' };
        }
        const existing = await client.query(
          `SELECT id FROM public.workspace_invitations
           WHERE workspace_id = $1 AND email = $2
             AND accepted_at IS NULL AND revoked_at IS NULL
             AND superseded_by_invitation_id IS NULL`,
          [workspaceId, input.email],
        );
        if (existing.rowCount) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const inserted = await client.query<InvitationRow>(
          `INSERT INTO public.workspace_invitations
             (id, workspace_id, email, role, invited_by_user_id, token_hash, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp(), clock_timestamp() + interval '48 hours')
           RETURNING ${invitationColumns}`,
          [invitationId, workspaceId, input.email, input.role, actorId, tokenHash],
        );
        invitation = inserted.rows[0];
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        if ((error as { code?: string }).code === '23505') return { status: 'conflict' };
        throw error;
      } finally {
        client.release();
      }
      if (!invitation) throw new Error('Invitation creation returned no row.');
      return deliverInvitation(pool, emailSender, appOrigin, invitation, token);
    },

    async resendInvitation(headers, workspaceId, invitationId) {
      const authorization = await this.authorizeWorkspace(headers, workspaceId, ['admin']);
      if (authorization.status !== 'ok') return authorization;
      const actorId = authorization.value.user.id;
      if (!(await identity.consumeInvitationRateLimit('delivery', actorId)))
        return { status: 'rate_limited' };

      const client = await pool.connect();
      let invitation: InvitationRow | undefined;
      let token = '';
      try {
        await client.query('BEGIN');
        if (!(await lockWorkspaceForAdmin(client, workspaceId, actorId))) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }
        const previousResult = await client.query<InvitationRow>(
          `SELECT ${invitationColumns} FROM public.workspace_invitations
           WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
          [invitationId, workspaceId],
        );
        const previous = previousResult.rows[0];
        if (!previous) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        if (previous.acceptedAt || previous.revokedAt || previous.supersededByInvitationId) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const sentRecently = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM public.workspace_invitations
           WHERE workspace_id = $1 AND email = $2
             AND created_at >= clock_timestamp() - interval '24 hours'`,
          [workspaceId, previous.email],
        );
        if (Number(sentRecently.rows[0]?.count ?? 0) >= 5) {
          await client.query('ROLLBACK');
          return { status: 'rate_limited' };
        }

        token = randomBytes(32).toString('base64url');
        const replacementId = randomUUID();
        const tokenHash = createHash('sha256').update(token).digest();
        await client.query(
          `UPDATE public.workspace_invitations SET revoked_at = clock_timestamp()
           WHERE id = $1`,
          [previous.id],
        );
        const inserted = await client.query<InvitationRow>(
          `INSERT INTO public.workspace_invitations
             (id, workspace_id, email, role, invited_by_user_id, token_hash, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp(), clock_timestamp() + interval '48 hours')
           RETURNING ${invitationColumns}`,
          [replacementId, workspaceId, previous.email, previous.role, actorId, tokenHash],
        );
        await client.query(
          `UPDATE public.workspace_invitations
           SET revoked_at = NULL, superseded_by_invitation_id = $2 WHERE id = $1`,
          [previous.id, replacementId],
        );
        invitation = inserted.rows[0];
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        if ((error as { code?: string }).code === '23505') return { status: 'conflict' };
        throw error;
      } finally {
        client.release();
      }
      if (!invitation) throw new Error('Invitation resend returned no row.');
      return deliverInvitation(pool, emailSender, appOrigin, invitation, token);
    },

    async acceptInvitation(headers, token, clientIp) {
      const acceptor = await identity.resolveInvitationAcceptor(headers);
      if (!acceptor) return { status: 'unauthenticated' };
      if (!acceptor.emailVerified) return { status: 'email_unverified' };
      if (!(await identity.consumeInvitationRateLimit('accept', clientIp)))
        return { status: 'rate_limited' };
      const tokenHash = createHash('sha256').update(token).digest();
      const location = await pool.query<{ workspaceId: string }>(
        `SELECT workspace_id AS "workspaceId" FROM public.workspace_invitations WHERE token_hash = $1`,
        [tokenHash],
      );
      const workspaceId = location.rows[0]?.workspaceId;
      if (!workspaceId) return { status: 'not_found' };

      const client = await pool.connect();
      let workspace: { id: string; name: string } | undefined;
      let role: WorkspaceRole | undefined;
      try {
        await client.query('BEGIN');
        const workspaceResult = await client.query<{ id: string; name: string }>(
          'SELECT id, name FROM public.workspaces WHERE id = $1 FOR UPDATE',
          [workspaceId],
        );
        workspace = workspaceResult.rows[0];
        if (!workspace) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        const invitationResult = await client.query<InvitationRow>(
          `SELECT ${invitationColumns} FROM public.workspace_invitations
           WHERE token_hash = $1 AND workspace_id = $2 FOR UPDATE`,
          [tokenHash, workspaceId],
        );
        const invitation = invitationResult.rows[0];
        if (!invitation) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        if (
          invitation.acceptedAt ||
          invitation.revokedAt ||
          invitation.supersededByInvitationId ||
          invitation.deliveryStatus !== 'sent'
        ) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const nowResult = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
        const now = nowResult.rows[0]?.now;
        if (!now) throw new Error('Database clock unavailable.');
        if (invitation.expiresAt <= now) {
          await client.query('ROLLBACK');
          return { status: 'expired' };
        }
        const invitationEmail = await identity.validateInvitationEmail(
          client,
          acceptor.user.id,
          invitation.email,
        );
        if (invitationEmail === 'unverified') {
          await client.query('ROLLBACK');
          return { status: 'email_unverified' };
        }
        if (invitationEmail !== 'verified') {
          await client.query('ROLLBACK');
          return { status: 'email_mismatch' };
        }

        const membershipResult = await client.query<{
          id: string;
          role: WorkspaceRole;
          revision: number;
          revokedAt: Date | null;
        }>(
          `SELECT id, role, revision, revoked_at AS "revokedAt" FROM public.workspace_members
           WHERE workspace_id = $1 AND user_id = $2 FOR UPDATE`,
          [workspaceId, acceptor.user.id],
        );
        const membership = membershipResult.rows[0];
        if (membership && !membership.revokedAt) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        if (membership?.revokedAt && membership.revokedAt >= invitation.createdAt) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        if (membership) {
          await client.query(
            `UPDATE public.workspace_members SET role = $2, revoked_at = NULL, revision = revision + 1
             WHERE id = $1 AND revoked_at IS NOT NULL`,
            [membership.id, invitation.role],
          );
        } else {
          await client.query(
            `INSERT INTO public.workspace_members (id, workspace_id, user_id, role, created_at, revision)
             VALUES ($1, $2, $3, $4, clock_timestamp(), 1)`,
            [randomUUID(), workspaceId, acceptor.user.id, invitation.role],
          );
        }
        await client.query(
          `UPDATE public.workspace_invitations
           SET accepted_at = clock_timestamp(), accepted_by_user_id = $2
           WHERE id = $1`,
          [invitation.id, acceptor.user.id],
        );
        role = invitation.role;
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
      if (!workspace || !role) throw new Error('Invitation acceptance returned no context.');
      return {
        status: 'ok',
        value: { workspace: { id: workspace.id, name: workspace.name }, role },
      };
    },

    async promoteMember(headers, workspaceId, membershipId, expectedRevision) {
      const actor = await identity.resolveAuthenticatedUser(headers);
      if (!actor) return { status: 'unauthenticated' };
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (!(await lockWorkspaceForAdmin(client, workspaceId, actor.id))) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }
        const targetResult = await client.query<{
          id: string;
          userId: string;
          role: WorkspaceRole;
          revision: number;
          revokedAt: Date | null;
        }>(
          `SELECT id, user_id AS "userId", role, revision, revoked_at AS "revokedAt"
           FROM public.workspace_members
           WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
          [membershipId, workspaceId],
        );
        const target = targetResult.rows[0];
        if (!target) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        if (target.userId === actor.id || target.revokedAt) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        if (target.role === 'admin') {
          const value = {
            membershipId: target.id,
            role: target.role,
            revokedAt: null,
            revision: target.revision,
          } satisfies WorkspaceMemberMutation;
          await client.query('COMMIT');
          return { status: 'ok', value };
        }
        if (target.revision !== expectedRevision) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const updated = await client.query<{
          membershipId: string;
          role: WorkspaceRole;
          revokedAt: Date | null;
          revision: number;
        }>(
          `UPDATE public.workspace_members
           SET role = 'admin', revision = revision + 1
           WHERE id = $1 AND workspace_id = $2 AND revision = $3 AND revoked_at IS NULL
           RETURNING id AS "membershipId", role, revoked_at AS "revokedAt", revision`,
          [membershipId, workspaceId, expectedRevision],
        );
        const row = updated.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const value: WorkspaceMemberMutation = {
          ...row,
          revokedAt: row.revokedAt?.toISOString() ?? null,
        };
        await client.query('COMMIT');
        return { status: 'ok', value };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },

    async revokeMember(headers, workspaceId, membershipId, expectedRevision) {
      const actor = await identity.resolveAuthenticatedUser(headers);
      if (!actor) return { status: 'unauthenticated' };
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (!(await lockWorkspaceForAdmin(client, workspaceId, actor.id))) {
          await client.query('ROLLBACK');
          return { status: 'forbidden' };
        }
        const targetResult = await client.query<{
          id: string;
          userId: string;
          role: WorkspaceRole;
          revision: number;
          revokedAt: Date | null;
        }>(
          `SELECT id, user_id AS "userId", role, revision, revoked_at AS "revokedAt"
           FROM public.workspace_members
           WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
          [membershipId, workspaceId],
        );
        const target = targetResult.rows[0];
        if (!target) {
          await client.query('ROLLBACK');
          return { status: 'not_found' };
        }
        if (target.userId === actor.id || target.role === 'admin') {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        if (target.revokedAt) {
          if (target.revision === expectedRevision + 1) {
            const value = {
              membershipId: target.id,
              role: target.role,
              revokedAt: target.revokedAt.toISOString(),
              revision: target.revision,
            } satisfies WorkspaceMemberMutation;
            await client.query('COMMIT');
            return { status: 'ok', value };
          }
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        if (target.revision !== expectedRevision) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const updated = await client.query<{
          membershipId: string;
          role: WorkspaceRole;
          revokedAt: Date | null;
          revision: number;
        }>(
          `UPDATE public.workspace_members
           SET revoked_at = clock_timestamp(), revision = revision + 1
           WHERE id = $1 AND workspace_id = $2 AND revision = $3 AND revoked_at IS NULL
           RETURNING id AS "membershipId", role, revoked_at AS "revokedAt", revision`,
          [membershipId, workspaceId, expectedRevision],
        );
        const row = updated.rows[0];
        if (!row) {
          await client.query('ROLLBACK');
          return { status: 'conflict' };
        }
        const value: WorkspaceMemberMutation = {
          ...row,
          revokedAt: row.revokedAt?.toISOString() ?? null,
        };
        const targetIdentity = (await identity.getUsersByIds([target.userId]))[0];
        if (!targetIdentity) throw new Error('Workspace member identity is missing.');
        await client.query(
          `UPDATE public.workspace_invitations
           SET revoked_at = clock_timestamp()
           WHERE workspace_id = $1 AND email = $2
             AND accepted_at IS NULL AND revoked_at IS NULL
             AND superseded_by_invitation_id IS NULL`,
          [workspaceId, targetIdentity.email],
        );
        await client.query('COMMIT');
        return { status: 'ok', value };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
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
