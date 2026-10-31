import type { Pool, PoolClient } from 'pg';

export async function withPostgresTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  operation: (client: PoolClient) => Promise<T>,
  shouldCommit: (result: T) => boolean = () => true,
): Promise<T> {
  const client = await pool.connect();
  let transactionOpen = false;
  let releaseError: Error | undefined;

  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const result = await operation(client);
    if (!shouldCommit(result)) {
      transactionOpen = false;
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        releaseError = asError(rollbackError);
        throw new AggregateError(
          [rollbackError],
          'The transaction result could not be rolled back.',
          { cause: rollbackError },
        );
      }
      return result;
    }

    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      transactionOpen = false;
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        releaseError = asError(rollbackError);
        throw new AggregateError(
          [error, rollbackError],
          'The transaction failed and rollback also failed.',
          { cause: error },
        );
      }
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export function isPostgresConstraintError(
  error: unknown,
  code: string,
  constraint: string,
): boolean {
  if (!error || typeof error !== 'object') return false;
  const postgresError = error as { code?: unknown; constraint?: unknown };
  return postgresError.code === code && postgresError.constraint === constraint;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
