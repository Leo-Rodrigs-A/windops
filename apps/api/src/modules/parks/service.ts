import type { IncomingHttpHeaders } from 'node:http';
import type {
  CreatePark,
  CreateTurbine,
  Park,
  ParksPage,
  ParksQuery,
  Turbine,
  TurbinesPage,
  TurbinesQuery,
  UpdatePark,
  UpdateTurbine,
} from '@windops/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { WorkspaceAuthorizationService } from '../workspaces/index.js';

interface ParkRow extends QueryResultRow {
  id: string;
  workspaceId: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
  deactivatedAt: Date | null;
}

interface TurbineRow extends ParkRow {
  parkId: string;
}

export type ParksQueryExecutor = Pick<PoolClient, 'query'>;
export type CatalogReadResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_found' }
  | { status: 'invalid_cursor' };
export type CatalogWriteResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'conflict' }
  | { status: 'revision_conflict' };

export interface ParksCatalogService {
  listParks(workspaceId: string, query: ParksQuery): Promise<CatalogReadResult<ParksPage>>;
  getPark(workspaceId: string, parkId: string): Promise<CatalogReadResult<Park>>;
  listTurbines(
    workspaceId: string,
    parkId: string,
    query: TurbinesQuery,
  ): Promise<CatalogReadResult<TurbinesPage>>;
  getTurbine(
    workspaceId: string,
    parkId: string,
    turbineId: string,
  ): Promise<CatalogReadResult<Turbine>>;
  createPark(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    input: CreatePark,
  ): Promise<CatalogWriteResult<Park>>;
  updatePark(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    parkId: string,
    input: UpdatePark,
  ): Promise<CatalogWriteResult<Park>>;
  createTurbine(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    parkId: string,
    input: CreateTurbine,
  ): Promise<CatalogWriteResult<Turbine>>;
  updateTurbine(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    parkId: string,
    turbineId: string,
    input: UpdateTurbine,
  ): Promise<CatalogWriteResult<Turbine>>;
  getTurbineLocation(
    executor: ParksQueryExecutor,
    workspaceId: string,
    parkId: string,
    turbineId: string,
  ): Promise<{
    workspaceId: string;
    parkId: string;
    turbineId: string;
    parkDeactivatedAt: string | null;
    turbineDeactivatedAt: string | null;
  } | null>;
}

function toPark(row: ParkRow): Park {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    code: row.code,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revision: row.revision,
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  };
}

function toTurbine(row: TurbineRow): Turbine {
  return { ...toPark(row), parkId: row.parkId };
}

const parkColumns = `id, workspace_id AS "workspaceId", code,
  created_at AS "createdAt", updated_at AS "updatedAt", revision,
  deactivated_at AS "deactivatedAt"`;
const turbineColumns = `id, workspace_id AS "workspaceId", park_id AS "parkId", code,
  created_at AS "createdAt", updated_at AS "updatedAt", revision,
  deactivated_at AS "deactivatedAt"`;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

async function getCursor(
  executor: Pool | PoolClient,
  table: 'parks' | 'turbines',
  workspaceId: string,
  cursor: string,
  parkId?: string,
): Promise<{ code: string; id: string } | null> {
  const parkFilter = table === 'turbines' ? 'AND park_id = $3' : '';
  const values = table === 'turbines' ? [workspaceId, cursor, parkId] : [workspaceId, cursor];
  const result = await executor.query<{ code: string; id: string }>(
    `SELECT code, id FROM public.${table}
     WHERE workspace_id = $1 AND id = $2 ${parkFilter}
     LIMIT 1`,
    values,
  );
  return result.rows[0] ?? null;
}

export function createParksCatalogService(
  pool: Pool,
  authorization: WorkspaceAuthorizationService,
): ParksCatalogService {
  async function withAdminTransaction<T>(
    headers: IncomingHttpHeaders,
    workspaceId: string,
    operation: (client: PoolClient) => Promise<CatalogWriteResult<T>>,
  ): Promise<CatalogWriteResult<T>> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const permission = await authorization.authorizeWorkspaceInTransaction(
        client,
        headers,
        workspaceId,
        ['admin'],
      );
      if (permission.status !== 'ok') {
        await client.query('ROLLBACK');
        return permission;
      }
      const result = await operation(client);
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

  return {
    async listParks(workspaceId, query) {
      const cursor = query.cursor
        ? await getCursor(pool, 'parks', workspaceId, query.cursor)
        : null;
      if (query.cursor && !cursor) return { status: 'invalid_cursor' };
      const search = query.search ? `${escapeLike(query.search)}%` : null;
      const result = await pool.query<ParkRow>(
        `SELECT ${parkColumns}
         FROM public.parks
         WHERE workspace_id = $1
           AND ($2::text IS NULL OR code ILIKE $2 ESCAPE E'\\\\')
           AND ($3::text IS NULL OR (code, id) > ($3::text, $4::uuid))
         ORDER BY code ASC, id ASC
         LIMIT $5`,
        [workspaceId, search, cursor?.code ?? null, cursor?.id ?? null, query.limit + 1],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const items = rows.map(toPark);
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null },
      };
    },

    async getPark(workspaceId, parkId) {
      const result = await pool.query<ParkRow>(
        `SELECT ${parkColumns} FROM public.parks WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, parkId],
      );
      const row = result.rows[0];
      return row ? { status: 'ok', value: toPark(row) } : { status: 'not_found' };
    },

    async listTurbines(workspaceId, parkId, query) {
      const park = await pool.query(
        'SELECT 1 FROM public.parks WHERE workspace_id = $1 AND id = $2',
        [workspaceId, parkId],
      );
      if (!park.rowCount) return { status: 'not_found' };
      const cursor = query.cursor
        ? await getCursor(pool, 'turbines', workspaceId, query.cursor, parkId)
        : null;
      if (query.cursor && !cursor) return { status: 'invalid_cursor' };
      const search = query.search ? `${escapeLike(query.search)}%` : null;
      const result = await pool.query<TurbineRow>(
        `SELECT ${turbineColumns}
         FROM public.turbines
         WHERE workspace_id = $1 AND park_id = $2
           AND ($3::text IS NULL OR code ILIKE $3 ESCAPE E'\\\\')
           AND ($4::text IS NULL OR (code, id) > ($4::text, $5::uuid))
         ORDER BY code ASC, id ASC
         LIMIT $6`,
        [workspaceId, parkId, search, cursor?.code ?? null, cursor?.id ?? null, query.limit + 1],
      );
      const hasMore = result.rows.length > query.limit;
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows;
      const items = rows.map(toTurbine);
      return {
        status: 'ok',
        value: { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null },
      };
    },

    async getTurbine(workspaceId, parkId, turbineId) {
      const result = await pool.query<TurbineRow>(
        `SELECT ${turbineColumns} FROM public.turbines
         WHERE workspace_id = $1 AND park_id = $2 AND id = $3`,
        [workspaceId, parkId, turbineId],
      );
      const row = result.rows[0];
      return row ? { status: 'ok', value: toTurbine(row) } : { status: 'not_found' };
    },

    createPark(headers, workspaceId, input) {
      return withAdminTransaction(headers, workspaceId, async (client) => {
        const result = await client.query<ParkRow>(
          `INSERT INTO public.parks (workspace_id, code)
           VALUES ($1, $2) RETURNING ${parkColumns}`,
          [workspaceId, input.code],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Park creation returned no row.');
        return { status: 'ok', value: toPark(row) };
      });
    },

    updatePark(headers, workspaceId, parkId, input) {
      return withAdminTransaction(headers, workspaceId, async (client) => {
        const current = await client.query<{ revision: number }>(
          `SELECT revision FROM public.parks
           WHERE workspace_id = $1 AND id = $2 FOR UPDATE`,
          [workspaceId, parkId],
        );
        const row = current.rows[0];
        if (!row) return { status: 'not_found' };
        if (row.revision !== input.expectedRevision) return { status: 'revision_conflict' };
        const result = await client.query<ParkRow>(
          `UPDATE public.parks
           SET code = $3, revision = revision + 1, updated_at = clock_timestamp()
           WHERE workspace_id = $1 AND id = $2
           RETURNING ${parkColumns}`,
          [workspaceId, parkId, input.code],
        );
        const updated = result.rows[0];
        if (!updated) throw new Error('Park update returned no row.');
        return { status: 'ok', value: toPark(updated) };
      });
    },

    createTurbine(headers, workspaceId, parkId, input) {
      return withAdminTransaction(headers, workspaceId, async (client) => {
        const park = await client.query<{ id: string }>(
          `SELECT id FROM public.parks
           WHERE workspace_id = $1 AND id = $2 AND deactivated_at IS NULL`,
          [workspaceId, parkId],
        );
        if (!park.rows[0]) return { status: 'not_found' };
        const result = await client.query<TurbineRow>(
          `INSERT INTO public.turbines (workspace_id, park_id, code)
           VALUES ($1, $2, $3) RETURNING ${turbineColumns}`,
          [workspaceId, parkId, input.code],
        );
        const row = result.rows[0];
        if (!row) throw new Error('Turbine creation returned no row.');
        return { status: 'ok', value: toTurbine(row) };
      });
    },

    updateTurbine(headers, workspaceId, parkId, turbineId, input) {
      return withAdminTransaction(headers, workspaceId, async (client) => {
        const current = await client.query<{ revision: number }>(
          `SELECT revision FROM public.turbines
           WHERE workspace_id = $1 AND park_id = $2 AND id = $3 FOR UPDATE`,
          [workspaceId, parkId, turbineId],
        );
        const row = current.rows[0];
        if (!row) return { status: 'not_found' };
        if (row.revision !== input.expectedRevision) return { status: 'revision_conflict' };
        const result = await client.query<TurbineRow>(
          `UPDATE public.turbines
           SET code = $4, revision = revision + 1, updated_at = clock_timestamp()
           WHERE workspace_id = $1 AND park_id = $2 AND id = $3
           RETURNING ${turbineColumns}`,
          [workspaceId, parkId, turbineId, input.code],
        );
        const updated = result.rows[0];
        if (!updated) throw new Error('Turbine update returned no row.');
        return { status: 'ok', value: toTurbine(updated) };
      });
    },

    async getTurbineLocation(executor, workspaceId, parkId, turbineId) {
      const parkResult = await executor.query<{
        id: string;
        workspaceId: string;
        deactivatedAt: Date | null;
      }>(
        `SELECT id, workspace_id AS "workspaceId", deactivated_at AS "deactivatedAt"
         FROM public.parks WHERE workspace_id = $1 AND id = $2 FOR SHARE`,
        [workspaceId, parkId],
      );
      const park = parkResult.rows[0];
      if (!park) return null;
      const turbineResult = await executor.query<{
        id: string;
        deactivatedAt: Date | null;
      }>(
        `SELECT id, deactivated_at AS "deactivatedAt" FROM public.turbines
         WHERE workspace_id = $1 AND park_id = $2 AND id = $3 FOR SHARE`,
        [workspaceId, parkId, turbineId],
      );
      const turbine = turbineResult.rows[0];
      if (!turbine) return null;
      return {
        workspaceId: park.workspaceId,
        parkId: park.id,
        turbineId: turbine.id,
        parkDeactivatedAt: park.deactivatedAt?.toISOString() ?? null,
        turbineDeactivatedAt: turbine.deactivatedAt?.toISOString() ?? null,
      };
    },
  };
}
