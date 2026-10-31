import type { Pool, PoolClient } from 'pg';
import { expect, it, vi } from 'vitest';
import { isPostgresConstraintError, withPostgresTransaction } from './transaction.js';

function createPool(failures: Record<string, Error> = {}) {
  const statements: string[] = [];
  const release = vi.fn();
  const query = vi.fn(async (sql: string) => {
    statements.push(sql);
    const failure = failures[sql];
    if (failure) throw failure;
    return { rows: [], rowCount: 0 };
  });
  const client = { query, release } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client) } as unknown as Pick<Pool, 'connect'>;
  return { pool, statements, release };
}

it('commits successful operations and releases the client', async () => {
  const fixture = createPool();
  const value = await withPostgresTransaction(fixture.pool, async (client) => {
    await client.query('OPERATION');
    return 'saved';
  });

  expect(value).toBe('saved');
  expect(fixture.statements).toEqual(['BEGIN', 'OPERATION', 'COMMIT']);
  expect(fixture.release).toHaveBeenCalledOnce();
  expect(fixture.release).toHaveBeenCalledWith(undefined);
});

it('rolls back domain results without committing', async () => {
  const fixture = createPool();
  const value = await withPostgresTransaction(
    fixture.pool,
    async () => ({ status: 'conflict' }),
    (result) => result.status === 'ok',
  );

  expect(value).toEqual({ status: 'conflict' });
  expect(fixture.statements).toEqual(['BEGIN', 'ROLLBACK']);
  expect(fixture.release).toHaveBeenCalledOnce();
});

it('does not attempt rollback when BEGIN fails and releases the client', async () => {
  const beginError = new Error('begin failed');
  const fixture = createPool({ BEGIN: beginError });

  await expect(withPostgresTransaction(fixture.pool, async () => undefined)).rejects.toBe(
    beginError,
  );
  expect(fixture.statements).toEqual(['BEGIN']);
  expect(fixture.release).toHaveBeenCalledOnce();
});

it('preserves the operation error after a successful rollback', async () => {
  const operationError = new Error('operation failed');
  const fixture = createPool({ OPERATION: operationError });

  await expect(
    withPostgresTransaction(fixture.pool, async (client) => {
      await client.query('OPERATION');
    }),
  ).rejects.toBe(operationError);
  expect(fixture.statements).toEqual(['BEGIN', 'OPERATION', 'ROLLBACK']);
  expect(fixture.release).toHaveBeenCalledOnce();
  expect(fixture.release).toHaveBeenCalledWith(undefined);
});

it('preserves a COMMIT error after attempting rollback', async () => {
  const commitError = new Error('commit failed');
  const fixture = createPool({ COMMIT: commitError });

  await expect(withPostgresTransaction(fixture.pool, async () => 'value')).rejects.toBe(
    commitError,
  );
  expect(fixture.statements).toEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
  expect(fixture.release).toHaveBeenCalledOnce();
});

it('reports both operation and rollback errors and discards the client', async () => {
  const operationError = new Error('operation failed');
  const rollbackError = new Error('rollback failed');
  const fixture = createPool({ OPERATION: operationError, ROLLBACK: rollbackError });

  let thrown: unknown;
  try {
    await withPostgresTransaction(fixture.pool, async (client) => {
      await client.query('OPERATION');
    });
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(AggregateError);
  expect(thrown).toMatchObject({ cause: operationError });
  expect((thrown as AggregateError).errors).toEqual([operationError, rollbackError]);
  expect(fixture.statements).toEqual(['BEGIN', 'OPERATION', 'ROLLBACK']);
  expect(fixture.release).toHaveBeenCalledWith(rollbackError);
});

it('matches PostgreSQL errors by both SQLSTATE and constraint', () => {
  const error = Object.assign(new Error('duplicate'), {
    code: '23505',
    constraint: 'parks_workspace_code_unique',
  });

  expect(isPostgresConstraintError(error, '23505', 'parks_workspace_code_unique')).toBe(true);
  expect(
    isPostgresConstraintError(
      Object.assign(new Error('duplicate invitation'), {
        code: '23505',
        constraint: 'workspace_invitations_active_email_unique',
      }),
      '23505',
      'workspace_invitations_active_email_unique',
    ),
  ).toBe(true);
  expect(isPostgresConstraintError(error, '23505', 'other_unique')).toBe(false);
  expect(isPostgresConstraintError(error, '23503', 'parks_workspace_code_unique')).toBe(false);
  expect(isPostgresConstraintError(new Error('internal'), '23505', 'anything')).toBe(false);
});
