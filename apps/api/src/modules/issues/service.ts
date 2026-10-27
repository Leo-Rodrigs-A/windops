import type {
  AuthenticatedUser,
  Issue,
  IssueEvent,
  IssueEventPage,
  IssueEventQuery,
  IssueStatus,
  IssuesPage,
  IssuesQuery,
} from '@windops/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { IdentityService } from '../identity/index.js';

export type IssuesQueryExecutor = Pick<PoolClient, 'query'>;
export type IssueReadResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_found' }
  | { status: 'invalid_cursor' };

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

export function createIssuesService(pool: Pool, identity: IdentityService): IssuesService {
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
  };
}
