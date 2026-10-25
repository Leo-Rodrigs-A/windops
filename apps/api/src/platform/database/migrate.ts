import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnvironment } from '../config.js';
import { createDatabase } from './client.js';

const { pool, db } = createDatabase(loadEnvironment().DATABASE_URL);
try {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
  });
} finally {
  await pool.end();
}
