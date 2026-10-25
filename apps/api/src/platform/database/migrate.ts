import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadMigrationDatabaseUrl } from '../config.js';
import { createDatabase } from './client.js';

const { pool } = createDatabase(loadMigrationDatabaseUrl());
const connection = await pool.connect();
const migrationDb = drizzle(connection);
const migrationLock = 1_947_122_026;
let locked = false;
try {
  await connection.query('SELECT pg_advisory_lock($1)', [migrationLock]);
  locked = true;
  await migrate(migrationDb, {
    migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
  });
} finally {
  if (locked) await connection.query('SELECT pg_advisory_unlock($1)', [migrationLock]);
  connection.release();
  await pool.end();
}
