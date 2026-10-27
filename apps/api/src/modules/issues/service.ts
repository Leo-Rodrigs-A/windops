import { createHash, randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type {
  AuthenticatedUser,
  CreateIssue,
  Issue,
  IssueEvent,
  IssueEventPage,
  IssueEventQuery,
  IssueStatus,
  IssuesPage,
  IssuesQuery,
  ReleaseIssue,
  ReturnIssue,
  StartIssue,
  UpdateIssue,
  WorkspaceRole,
} from '@windops/contracts';
import { issueSchema } from '@windops/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { AuditService } from '../audit/index.js';
import type { IdentityService } from '../identity/index.js';
import type { ParksCatalogService } from '../parks/index.js';
import type { SyncService } from '../sync/index.js';
import type {
  AuthorizedWorkspacePrincipal,
  WorkspaceAuthorizationService,
} from '../workspaces/index.js';

export type IssuesQueryExecutor = Pick<PoolClient, 'query'>;
export type IssueReadResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_found' }
  | { status: 'invalid_cursor' };
export type IssueWriteResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'action_forbidden' }
  | { status: 'not_found' }
  | { status: 'conflict' }
  | { status: 'idempotency_conflict' }
  | { status: 'revision_conflict' }
  | { status: 'not_editable' }
  | { status: 'equipment_unavailable' }
  | { status: 'state_conflict' };

export interface EquipmentIssueReferences {
  hasReferences: boolean;
  hasOpenIssues: boolean;
}

export interface IssuesService {
  listIssues(workspaceId: string, query: IssuesQuery): Promise<IssueReadResult<IssuesPage>>;
  getIssue(workspaceId: string, issueId: string): Promise<IssueReadResult<Issue>>;
  listIssueEvents(
    workspaceId: string,
    issueId: string,
    query: IssueEventQuery,
  ): Promise<IssueReadResult<IssueEventPage>>;
  getEquipmentIssueReferences(
    executor: IssuesQueryExecutor,
    workspaceId: string,
    parkId: string,
    turbineId?: string,
  ): Promise<EquipmentIssueReferences>;
  createIssue(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    input: CreateIssue,
  ): Promise<IssueWriteResult<Issue>>;
  editIssue(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    issueId: string,
    input: UpdateIssue,
  ): Promise<IssueWriteResult<Issue>>;
  startIssue(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    issueId: string,
    input: StartIssue,
  ): Promise<IssueWriteResult<Issue>>;
  returnIssue(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    issueId: string,
    input: ReturnIssue,
  ): Promise<IssueWriteResult<Issue>>;
  releaseIssue(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    issueId: string,
    input: ReleaseIssue,
  ): Promise<IssueWriteResult<Issue>>;
}

export interface IssueWriteDependencies {
  authorization: WorkspaceAuthorizationService;
  parks: ParksCatalogService;
  audit: AuditService;
  sync: SyncService;
}

interface IssueRow extends QueryResultRow {
  id: string;
  workspaceId: string;
  parkId: string;
  turbineId: string;
  creatorMembershipId: string;
  creatorUserId: string;
  handlerMembershipId: string | null;
  handlerUserId: string | null;
  text: string;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
}

interface IssueEventRow extends QueryResultRow {
  id: string;
  issueId: string;
  workspaceId: string;
  actorMembershipId: string | null;
  actorLabel: string;
  type: IssueEvent['type'];
  occurredAt: Date;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

const issueColumns = `i.id, i.workspace_id AS "workspaceId", i.park_id AS "parkId",
  i.turbine_id AS "turbineId", i.creator_membership_id AS "creatorMembershipId",
  i.creator_user_id AS "creatorUserId", i.handler_membership_id AS "handlerMembershipId",
  i.handler_user_id AS "handlerUserId", i.text, i.status,
  i.created_at AS "createdAt", i.updated_at AS "updatedAt", i.revision`;

function toIssue(row: IssueRow, users: Map<string, AuthenticatedUser>): Issue {
  const creator = users.get(row.creatorUserId);
  if (!creator) throw new Error('Issue creator identity is missing.');
  const handler = row.handlerUserId ? (users.get(row.handlerUserId) ?? null) : null;
  if (row.handlerUserId && !handler) throw new Error('Issue handler identity is missing.');
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    parkId: row.parkId,
    turbineId: row.turbineId,
    creatorMembershipId: row.creatorMembershipId,
    creator,
    handlerMembershipId: row.handlerMembershipId,
    handler,
    text: row.text,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revision: row.revision,
  };
}

async function getUsers(identity: IdentityService, rows: IssueRow[]) {
  const ids = [
    ...new Set(rows.flatMap((row) => [row.creatorUserId, row.handlerUserId ?? ''])),
  ].filter(Boolean);
  const users = await identity.getUsersByIds(ids);
  return new Map(users.map((user) => [user.id, user]));
}

function toIssueEvent(row: IssueEventRow): IssueEvent {
  return {
    id: row.id,
    issueId: row.issueId,
    workspaceId: row.workspaceId,
    actorMembershipId: row.actorMembershipId,
    actorLabel: row.actorLabel,
    type: row.type,
    occurredAt: row.occurredAt.toISOString(),
    before: row.before,
    after: row.after,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function commandHash(value: unknown): Buffer {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest();
}

function issueSnapshot(issue: Issue): Record<string, unknown> {
  return {
    text: issue.text,
    parkId: issue.parkId,
    turbineId: issue.turbineId,
    status: issue.status,
    handlerMembershipId: issue.handlerMembershipId,
    handler: issue.handler,
    revision: issue.revision,
  };
}

export function createIssuesService(
  pool: Pool,
  identity: IdentityService,
  writeDependencies: IssueWriteDependencies,
): IssuesService {
  async function withWriteTransaction<T>(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    allowedRoles: readonly WorkspaceRole[] | undefined,
    operation: (
      client: PoolClient,
      principal: AuthorizedWorkspacePrincipal,
    ) => Promise<IssueWriteResult<T>>,
  ): Promise<IssueWriteResult<T>> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const permission = await writeDependencies.authorization.authorizeWorkspaceInTransaction(
        client,
        headers,
        workspaceId,
        allowedRoles,
      );
      if (permission.status !== 'ok') {
        await client.query('ROLLBACK');
        return permission;
      }
      const result = await operation(client, permission.value);
      if (result.status !== 'ok') {
        await client.query('ROLLBACK');
        return result;
      }
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
        return { status: 'conflict' };
      throw error;
    } finally {
      client.release();
    }
  }

  async function replayReceipt(
    client: PoolClient,
    workspaceId: string,
    principal: AuthorizedWorkspacePrincipal,
    commandId: string,
    hash: Buffer,
  ): Promise<IssueWriteResult<Issue> | null> {
    const receipt = await writeDependencies.sync.getCommandReceipt(
      client,
      workspaceId,
      principal.user.id,
      commandId,
    );
    if (!receipt) return null;
    if (!receipt.payloadHash.equals(hash)) return { status: 'idempotency_conflict' };
    return { status: 'ok', value: issueSchema.parse(receipt.result) };
  }

  async function transitionIssue(
    operation: 'start' | 'return' | 'release',
    headers: IncomingHttpHeaders,
    workspaceId: string,
    issueId: string,
    input: StartIssue | ReturnIssue | ReleaseIssue,
  ): Promise<IssueWriteResult<Issue>> {
    const allowedRoles: readonly WorkspaceRole[] | undefined =
      operation === 'release' ? ['admin'] : undefined;
    return withWriteTransaction(headers, workspaceId, allowedRoles, async (client, principal) => {
      const hash = commandHash({
        operation,
        issueId,
        expectedRevision: input.expectedRevision,
      });
      const replay = await replayReceipt(client, workspaceId, principal, input.commandId, hash);
      if (replay) return replay;

      const currentResult = await client.query<IssueRow>(
        `SELECT ${issueColumns} FROM public.issues i
         WHERE i.workspace_id = $1 AND i.id = $2 FOR UPDATE`,
        [workspaceId, issueId],
      );
      const currentRow = currentResult.rows[0];
      if (!currentRow) return { status: 'not_found' };
      if (currentRow.revision !== input.expectedRevision) return { status: 'revision_conflict' };
      if (operation === 'start' && currentRow.status !== 'pending')
        return { status: 'state_conflict' };
      if (operation !== 'start' && currentRow.status !== 'in_progress')
        return { status: 'state_conflict' };
      if (
        operation === 'return' &&
        (currentRow.handlerUserId !== principal.user.id ||
          currentRow.handlerMembershipId !== principal.membershipId)
      )
        return { status: 'action_forbidden' };
      if (operation === 'release' && currentRow.handlerUserId === principal.user.id)
        return { status: 'action_forbidden' };

      const currentUsers = await getUsers(identity, [currentRow]);
      const before = toIssue(currentRow, currentUsers);
      const nextStatus: IssueStatus = operation === 'start' ? 'in_progress' : 'pending';
      const nextHandlerMembershipId = operation === 'start' ? principal.membershipId : null;
      const nextHandlerUserId = operation === 'start' ? principal.user.id : null;
      const updatedResult = await client.query<IssueRow>(
        `UPDATE public.issues i
         SET status = $3, handler_membership_id = $4, handler_user_id = $5,
             revision = revision + 1, updated_at = clock_timestamp()
         WHERE i.workspace_id = $1 AND i.id = $2
         RETURNING ${issueColumns}`,
        [workspaceId, issueId, nextStatus, nextHandlerMembershipId, nextHandlerUserId],
      );
      const updatedRow = updatedResult.rows[0];
      if (!updatedRow) throw new Error('Issue transition returned no row.');
      const updatedUsers = await getUsers(identity, [updatedRow]);
      const issue = toIssue(updatedRow, updatedUsers);
      await writeDependencies.audit.appendIssueEvent(client, {
        id: randomUUID(),
        workspaceId,
        issueId,
        actorMembershipId: principal.membershipId,
        actorUserId: principal.user.id,
        actorLabel: principal.user.name,
        type: operation === 'start' ? 'started' : operation === 'return' ? 'returned' : 'released',
        before: issueSnapshot(before),
        after: issueSnapshot(issue),
      });
      await writeDependencies.sync.appendCommandReceipt(client, {
        workspaceId,
        actorMembershipId: principal.membershipId,
        actorUserId: principal.user.id,
        commandId: input.commandId,
        payloadHash: hash,
        result: issue as unknown as Record<string, unknown>,
      });
      return { status: 'ok', value: issue };
    });
  }

  return {
    async listIssues(workspaceId, query) {
      let cursor: { createdAt: Date; id: string } | null = null;
      if (query.cursor) {
        const result = await pool.query<{ createdAt: Date; id: string }>(
          `SELECT created_at AS "createdAt", id
           FROM public.issues
           WHERE workspace_id = $1 AND id = $2
             AND ($3::text IS NULL OR status = $3)
             AND ($4::uuid IS NULL OR park_id = $4)
             AND ($5::uuid IS NULL OR turbine_id = $5)
           LIMIT 1`,
          [
            workspaceId,
            query.cursor,
            query.status ?? null,
            query.parkId ?? null,
            query.turbineId ?? null,
          ],
        );
        cursor = result.rows[0] ?? null;
        if (!cursor) return { status: 'invalid_cursor' };
      }
      const result = await pool.query<IssueRow>(
        `SELECT ${issueColumns}
         FROM public.issues i
         WHERE i.workspace_id = $1
           AND ($2::text IS NULL OR i.status = $2)
           AND ($3::uuid IS NULL OR i.park_id = $3)
           AND ($4::uuid IS NULL OR i.turbine_id = $4)
           AND ($5::timestamptz IS NULL OR (i.created_at, i.id) > ($5, $6::uuid))
         ORDER BY i.created_at ASC, i.id ASC
         LIMIT $7`,
        [
          workspaceId,
          query.status ?? null,
          query.parkId ?? null,
          query.turbineId ?? null,
          cursor?.createdAt ?? null,
          cursor?.id ?? null,
          query.limit + 1,
        ],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const users = await getUsers(identity, rows);
      const items = rows.map((row) => toIssue(row, users));
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null },
      };
    },

    async getIssue(workspaceId, issueId) {
      const result = await pool.query<IssueRow>(
        `SELECT ${issueColumns} FROM public.issues i
         WHERE i.workspace_id = $1 AND i.id = $2`,
        [workspaceId, issueId],
      );
      const row = result.rows[0];
      if (!row) return { status: 'not_found' };
      const users = await getUsers(identity, [row]);
      return { status: 'ok', value: toIssue(row, users) };
    },

    async listIssueEvents(workspaceId, issueId, query) {
      const issue = await pool.query(
        `SELECT 1 FROM public.issues WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, issueId],
      );
      if (!issue.rowCount) return { status: 'not_found' };
      let cursor: { occurredAt: Date; id: string } | null = null;
      if (query.cursor) {
        const result = await pool.query<{ occurredAt: Date; id: string }>(
          `SELECT occurred_at AS "occurredAt", id FROM public.issue_events
           WHERE workspace_id = $1 AND issue_id = $2 AND id = $3 LIMIT 1`,
          [workspaceId, issueId, query.cursor],
        );
        cursor = result.rows[0] ?? null;
        if (!cursor) return { status: 'invalid_cursor' };
      }
      const result = await pool.query<IssueEventRow>(
        `SELECT id, issue_id AS "issueId", workspace_id AS "workspaceId",
                actor_membership_id AS "actorMembershipId", actor_label AS "actorLabel",
                type, occurred_at AS "occurredAt", before, after
         FROM public.issue_events
         WHERE workspace_id = $1 AND issue_id = $2
           AND ($3::timestamptz IS NULL OR (occurred_at, id) > ($3, $4::uuid))
         ORDER BY occurred_at ASC, id ASC
         LIMIT $5`,
        [workspaceId, issueId, cursor?.occurredAt ?? null, cursor?.id ?? null, query.limit + 1],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const items = rows.map(toIssueEvent);
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null },
      };
    },

    async getEquipmentIssueReferences(executor, workspaceId, parkId, turbineId) {
      const values = [workspaceId, parkId, turbineId ?? null];
      const condition = `workspace_id = $1 AND park_id = $2 AND ($3::uuid IS NULL OR turbine_id = $3)`;
      const current = await executor.query(
        `SELECT EXISTS (SELECT 1 FROM public.issues WHERE ${condition}) AS present`,
        values,
      );
      const historical = await executor.query(
        `SELECT EXISTS (SELECT 1 FROM public.issue_location_references WHERE ${condition}) AS present`,
        values,
      );
      const open = await executor.query(
        `SELECT EXISTS (
           SELECT 1 FROM public.issues
           WHERE ${condition} AND status IN ('pending', 'in_progress')
         ) AS present`,
        values,
      );
      return {
        hasReferences: current.rows[0]?.present === true || historical.rows[0]?.present === true,
        hasOpenIssues: open.rows[0]?.present === true,
      };
    },

    async createIssue(headers, workspaceId, input) {
      return withWriteTransaction(headers, workspaceId, undefined, async (client, principal) => {
        const hash = commandHash({
          operation: 'create',
          issueId: input.issueId,
          parkId: input.parkId,
          turbineId: input.turbineId,
          text: input.text,
        });
        const replay = await replayReceipt(client, workspaceId, principal, input.commandId, hash);
        if (replay) return replay;

        const [location] = await writeDependencies.parks.lockIssueLocations(client, workspaceId, [
          { parkId: input.parkId, turbineId: input.turbineId },
        ]);
        if (!location?.active) return { status: 'equipment_unavailable' };
        const collision = await client.query('SELECT 1 FROM public.issues WHERE id = $1 LIMIT 1', [
          input.issueId,
        ]);
        if (collision.rowCount) return { status: 'conflict' };

        const created = await client.query<IssueRow>(
          `INSERT INTO public.issues AS i
            (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING ${issueColumns}`,
          [
            input.issueId,
            workspaceId,
            input.parkId,
            input.turbineId,
            principal.membershipId,
            principal.user.id,
            input.text,
          ],
        );
        const row = created.rows[0];
        if (!row) throw new Error('Issue creation returned no row.');
        const issue = toIssue(row, new Map([[principal.user.id, principal.user]]));
        const eventId = randomUUID();
        await writeDependencies.audit.appendIssueEvent(client, {
          id: eventId,
          workspaceId,
          issueId: issue.id,
          actorMembershipId: principal.membershipId,
          actorUserId: principal.user.id,
          actorLabel: principal.user.name,
          type: 'created',
          before: null,
          after: issueSnapshot(issue),
          location: { parkId: issue.parkId, turbineId: issue.turbineId },
        });
        await writeDependencies.sync.appendCommandReceipt(client, {
          workspaceId,
          actorMembershipId: principal.membershipId,
          actorUserId: principal.user.id,
          commandId: input.commandId,
          payloadHash: hash,
          result: issue as unknown as Record<string, unknown>,
        });
        return { status: 'ok', value: issue };
      });
    },

    async editIssue(headers, workspaceId, issueId, input) {
      return withWriteTransaction(headers, workspaceId, undefined, async (client, principal) => {
        const hash = commandHash({
          operation: 'edit',
          issueId,
          expectedRevision: input.expectedRevision,
          ...(input.text !== undefined ? { text: input.text } : {}),
          ...(input.parkId !== undefined ? { parkId: input.parkId } : {}),
          ...(input.turbineId !== undefined ? { turbineId: input.turbineId } : {}),
        });
        const replay = await replayReceipt(client, workspaceId, principal, input.commandId, hash);
        if (replay) return replay;

        const observedResult = await client.query<IssueRow>(
          `SELECT ${issueColumns} FROM public.issues i
           WHERE i.workspace_id = $1 AND i.id = $2`,
          [workspaceId, issueId],
        );
        const observedRow = observedResult.rows[0];
        if (!observedRow) return { status: 'not_found' };
        if (observedRow.creatorUserId !== principal.user.id) return { status: 'action_forbidden' };
        if (observedRow.revision !== input.expectedRevision) return { status: 'revision_conflict' };

        const nextParkId = input.parkId ?? observedRow.parkId;
        const nextTurbineId = input.turbineId ?? observedRow.turbineId;
        const locationChanged =
          nextParkId !== observedRow.parkId || nextTurbineId !== observedRow.turbineId;
        const lockedLocations = await writeDependencies.parks.lockIssueLocations(
          client,
          workspaceId,
          locationChanged
            ? [
                { parkId: observedRow.parkId, turbineId: observedRow.turbineId },
                { parkId: nextParkId, turbineId: nextTurbineId },
              ]
            : [{ parkId: observedRow.parkId, turbineId: observedRow.turbineId }],
        );
        if (lockedLocations.length !== (locationChanged ? 2 : 1))
          return { status: 'equipment_unavailable' };
        if (
          locationChanged &&
          !lockedLocations.find(
            (entry) => entry.parkId === nextParkId && entry.turbineId === nextTurbineId,
          )?.active
        )
          return { status: 'equipment_unavailable' };

        const currentResult = await client.query<IssueRow>(
          `SELECT ${issueColumns} FROM public.issues i
           WHERE i.workspace_id = $1 AND i.id = $2 FOR UPDATE`,
          [workspaceId, issueId],
        );
        const currentRow = currentResult.rows[0];
        if (!currentRow) return { status: 'not_found' };
        if (
          currentRow.revision !== input.expectedRevision ||
          currentRow.parkId !== observedRow.parkId ||
          currentRow.turbineId !== observedRow.turbineId
        )
          return { status: 'revision_conflict' };

        const currentUsers = await getUsers(identity, [currentRow]);
        const before = toIssue(currentRow, currentUsers);
        const updatedResult = await client.query<IssueRow>(
          `UPDATE public.issues i
           SET text = $3, park_id = $4, turbine_id = $5,
               revision = revision + 1, updated_at = clock_timestamp()
           WHERE i.workspace_id = $1 AND i.id = $2
           RETURNING ${issueColumns}`,
          [workspaceId, issueId, input.text ?? currentRow.text, nextParkId, nextTurbineId],
        );
        const updatedRow = updatedResult.rows[0];
        if (!updatedRow) throw new Error('Issue update returned no row.');
        const afterUsers = await getUsers(identity, [updatedRow]);
        const issue = toIssue(updatedRow, afterUsers);
        const eventId = randomUUID();
        await writeDependencies.audit.appendIssueEvent(client, {
          id: eventId,
          workspaceId,
          issueId,
          actorMembershipId: principal.membershipId,
          actorUserId: principal.user.id,
          actorLabel: principal.user.name,
          type: 'edited',
          before: issueSnapshot(before),
          after: issueSnapshot(issue),
          ...(locationChanged
            ? { location: { parkId: nextParkId, turbineId: nextTurbineId } }
            : {}),
        });
        await writeDependencies.sync.appendCommandReceipt(client, {
          workspaceId,
          actorMembershipId: principal.membershipId,
          actorUserId: principal.user.id,
          commandId: input.commandId,
          payloadHash: hash,
          result: issue as unknown as Record<string, unknown>,
        });
        return { status: 'ok', value: issue };
      });
    },

    startIssue(headers, workspaceId, issueId, input) {
      return transitionIssue('start', headers, workspaceId, issueId, input);
    },

    returnIssue(headers, workspaceId, issueId, input) {
      return transitionIssue('return', headers, workspaceId, issueId, input);
    },

    releaseIssue(headers, workspaceId, issueId, input) {
      return transitionIssue('release', headers, workspaceId, issueId, input);
    },
  };
}
