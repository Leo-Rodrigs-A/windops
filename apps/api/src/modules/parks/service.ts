import type {
  Park,
  ParksPage,
  ParksQuery,
  Turbine,
  TurbinesPage,
  TurbinesQuery,
} from '@windops/contracts';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

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

export function createParksCatalogService(pool: Pool): ParksCatalogService {
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
