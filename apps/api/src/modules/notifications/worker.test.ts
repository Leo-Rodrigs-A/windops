import type { Pool, PoolClient, QueryResult } from 'pg';
import { expect, it } from 'vitest';
import { createNotificationWorker } from './worker.js';

function makePool() {
  let connections = 0;
  const client = {
    async query(sql: string) {
      if (sql.includes('RETURNING d.id')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  } as unknown as PoolClient;
  const pool = {
    async connect() {
      connections += 1;
      return client;
    },
    async query() {
      return { rows: [], rowCount: 0 } as QueryResult;
    },
  } as unknown as Pool;
  return { pool, connections: () => connections };
}

it('does not poll the database and drains only when explicitly woken', async () => {
  const database = makePool();
  const worker = createNotificationWorker(database.pool, { send: async () => undefined });

  worker.start();
  expect(database.connections()).toBe(0);
  await worker.wake();
  expect(database.connections()).toBe(1);
  await worker.wake();
  expect(database.connections()).toBe(2);
  await worker.stop();
});

it('coalesces overlapping wake requests into one drain', async () => {
  const database = makePool();
  const worker = createNotificationWorker(database.pool, { send: async () => undefined });
  worker.start();

  await Promise.all([worker.wake(), worker.wake()]);

  expect(database.connections()).toBe(1);
  await worker.stop();
});
