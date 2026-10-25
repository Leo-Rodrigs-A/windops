import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as identity from '../../modules/identity/schema.js';
import * as workspaces from '../../modules/workspaces/schema.js';

const schema = { ...workspaces, ...identity };
export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  return { pool, db: drizzle(pool, { schema }) };
}
