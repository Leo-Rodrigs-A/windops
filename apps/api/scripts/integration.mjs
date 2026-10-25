import { setTimeout } from 'node:timers/promises';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://windops_app:windops_app_dev@127.0.0.1:5432/windops',
});
try {
  await pool.query('SELECT id FROM workspaces LIMIT 1');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO workspaces(name) VALUES ('Integration check')");
    let rejected = false;
    try {
      await client.query("INSERT INTO workspaces(name) VALUES ('Second workspace')");
    } catch (error) {
      if (error.code !== '23505') throw error;
      rejected = true;
    }
    if (!rejected) throw new Error('Singleton constraint missing');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
  let synced = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const url = new URL('/v1/shape', process.env.ELECTRIC_URL ?? 'http://127.0.0.1:3001');
    url.searchParams.set('table', 'workspaces');
    url.searchParams.set('offset', '-1');
    url.searchParams.set('secret', process.env.ELECTRIC_SECRET ?? 'windops-development-only');
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok && Array.isArray(await response.json())) {
      synced = true;
      break;
    }
    await setTimeout(1000);
  }
  if (!synced) throw new Error('Electric shape did not become available');
  console.log('Database migration, singleton constraint and Electric shape verified.');
} finally {
  await pool.end();
}
