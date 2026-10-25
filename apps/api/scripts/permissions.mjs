import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const appUrl = process.env.DATABASE_URL;
const migratorUrl = process.env.MIGRATION_DATABASE_URL;
const replicationUrl = process.env.ELECTRIC_DATABASE_URL;
if (!appUrl || !migratorUrl || !replicationUrl)
  throw new Error('DATABASE_URL, MIGRATION_DATABASE_URL and ELECTRIC_DATABASE_URL are required.');

const app = new Pool({ connectionString: appUrl, max: 1 });
const migrator = new Pool({ connectionString: migratorUrl, max: 1 });
const replication = new Pool({ connectionString: replicationUrl, max: 1 });
const probe = `f02_private_probe_${process.pid}`;

async function expectDenied(pool, sql, label) {
  await assert.rejects(
    pool.query(sql),
    (error) => {
      assert.equal(error.code, '42501', `${label} should fail with insufficient_privilege`);
      return true;
    },
    label,
  );
}

try {
  await app.query('SELECT id FROM public.workspaces LIMIT 1');
  await app.query('UPDATE public.workspaces SET name = name WHERE false');
  await expectDenied(app, 'CREATE TABLE public.f02_runtime_probe (id integer)', 'runtime DDL');
  await expectDenied(
    app,
    'ALTER TABLE public.workspaces ADD COLUMN f02_runtime_probe integer',
    'runtime schema alteration',
  );
  await expectDenied(app, 'CREATE ROLE f02_runtime_probe', 'runtime role management');
  await expectDenied(app, 'CREATE DATABASE f02_runtime_probe', 'runtime database creation');

  const appFlags = await app.query(
    `SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication
     FROM pg_roles r WHERE r.rolname = current_user`,
  );
  assert.deepEqual(appFlags.rows[0], {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
  });

  const roleFlags = await migrator.query(
    `SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication
     FROM pg_roles r WHERE r.rolname = current_user`,
  );
  assert.deepEqual(roleFlags.rows[0], {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
  });
  await expectDenied(migrator, 'CREATE ROLE f02_migrator_probe', 'migration role management');
  await migrator.query(`CREATE TABLE public.${probe} (id integer)`);

  const replicationFlags = await replication.query(
    `SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication
     FROM pg_roles r WHERE r.rolname = current_user`,
  );
  assert.deepEqual(replicationFlags.rows[0], {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: true,
  });

  await expectDenied(
    replication,
    `SELECT * FROM public.${probe}`,
    'replication access to private table',
  );
  await expectDenied(
    replication,
    `CREATE TABLE public.${probe}_ddl (id integer)`,
    'replication DDL',
  );
  await expectDenied(replication, `CREATE ROLE ${probe}_role`, 'replication role management');
  await expectDenied(
    replication,
    'CREATE DATABASE f02_replication_probe',
    'replication database creation',
  );

  console.log('Runtime DML, migration DDL and replication allowlist verified.');
} finally {
  try {
    await migrator.query(`DROP TABLE IF EXISTS public.${probe}`);
  } finally {
    await Promise.all([app.end(), migrator.end(), replication.end()]);
  }
}
