import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const catalog = await app.query(
    `SELECT to_regclass('public.parks') AS parks, to_regclass('public.turbines') AS turbines`,
  );
  assert.ok(catalog.rows[0]?.parks && catalog.rows[0]?.turbines, 'parks migration must be applied');
  const migrationCount = await migrator.query(
    'SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations',
  );
  const journal = JSON.parse(
    readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
  );
  assert.equal(
    migrationCount.rows[0].count,
    journal.entries.length,
    'migration journal must be current',
  );
  await app.query('SELECT id FROM public.workspaces LIMIT 1');
  await app.query('SELECT id FROM public.workspace_invitations LIMIT 0');
  await app.query('SELECT id FROM public.parks LIMIT 0');
  await app.query('SELECT id FROM public.turbines LIMIT 0');
  await app.query('SELECT id FROM public.issues LIMIT 0');
  await app.query('SELECT id, text, completion_report FROM public.issue_sync_rows LIMIT 0');
  await app.query('SELECT id FROM public.issue_events LIMIT 0');
  await app.query('SELECT id, actor_label, before, after FROM public.issue_sync_events LIMIT 0');
  await app.query('SELECT event_id FROM public.issue_location_references LIMIT 0');
  await app.query('SELECT id FROM public.sync_commands LIMIT 0');
  await app.query('UPDATE public.workspaces SET name = name WHERE false');
  await app.query('UPDATE public.issues SET text = text WHERE false');
  for (const table of ['issue_events', 'issue_location_references', 'sync_commands']) {
    await expectDenied(
      app,
      `UPDATE public.${table} SET ${table === 'issue_location_references' ? 'event_id' : table === 'sync_commands' ? 'command_id' : 'type'} = ${table === 'issue_location_references' ? 'event_id' : table === 'sync_commands' ? 'command_id' : 'type'} WHERE false`,
      `runtime update of append-only ${table}`,
    );
    await expectDenied(
      app,
      `DELETE FROM public.${table} WHERE false`,
      `runtime delete of append-only ${table}`,
    );
  }
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
  for (const table of [
    'auth_users',
    'auth_sessions',
    'auth_accounts',
    'auth_verifications',
    'auth_rate_limits',
    'auth_login_challenges',
    'workspace_members',
    'workspace_invitations',
    'issue_events',
    'issues',
    'issue_location_references',
    'sync_commands',
  ]) {
    await expectDenied(
      replication,
      `SELECT * FROM public.${table}`,
      `replication access to ${table}`,
    );
  }
  await replication.query('SELECT id, name, created_at FROM public.workspaces LIMIT 0');
  await replication.query(
    'SELECT id, workspace_id, code, deactivated_at FROM public.parks LIMIT 0',
  );
  await replication.query('SELECT id, workspace_id, park_id, code FROM public.turbines LIMIT 0');
  await replication.query(
    'SELECT id, workspace_id, park_id, turbine_id, text, completion_report, status FROM public.issue_sync_rows LIMIT 0',
  );
  await replication.query(
    'SELECT id, workspace_id, issue_id, actor_label, before, after FROM public.issue_sync_events LIMIT 0',
  );
  await expectDenied(
    replication,
    'SELECT actor_membership_id FROM public.issue_events LIMIT 0',
    'replication access to raw audit identities',
  );

  const publishedTables = await app.query(
    `SELECT tablename
     FROM pg_publication_tables
     WHERE pubname = 'electric_publication_default' AND schemaname = 'public'
     ORDER BY tablename`,
  );
  assert.deepEqual(
    publishedTables.rows.map((row) => row.tablename),
    ['issue_sync_events', 'issue_sync_rows', 'parks', 'turbines', 'workspaces'],
  );
  const publishedColumns = await app.query(
    `SELECT p.tablename, json_agg(a.attname ORDER BY a.attname) AS columns
     FROM pg_publication_tables p
     JOIN pg_class c ON c.relname = p.tablename
     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE p.pubname = 'electric_publication_default' AND p.schemaname = 'public'
       AND (p.attnames IS NULL OR a.attname = ANY(p.attnames))
     GROUP BY p.tablename ORDER BY p.tablename`,
  );
  const expectedColumns = {
    issue_sync_events: [
      'actor_label',
      'after',
      'before',
      'id',
      'issue_id',
      'occurred_at',
      'type',
      'workspace_id',
    ],
    issue_sync_rows: [
      'completion_report',
      'created_at',
      'id',
      'park_id',
      'revision',
      'status',
      'text',
      'turbine_id',
      'updated_at',
      'workspace_id',
    ],
    parks: ['code', 'created_at', 'deactivated_at', 'id', 'revision', 'updated_at', 'workspace_id'],
    turbines: [
      'code',
      'created_at',
      'deactivated_at',
      'id',
      'park_id',
      'revision',
      'updated_at',
      'workspace_id',
    ],
    workspaces: ['created_at', 'id', 'name'],
  };
  assert.deepEqual(
    Object.fromEntries(publishedColumns.rows.map((row) => [row.tablename, row.columns])),
    expectedColumns,
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
