import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'ELECTRIC_DATABASE_URL']) {
  assert.ok(process.env[key], `${key} is required.`);
}

const emptyDb = `windops_p02_empty_${process.pid}`;
const upgradeDb = `windops_p02_upgrade_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml', 'exec', '-T', 'postgres'];
const migrationRoot = new URL('../drizzle/', import.meta.url);
let emptyCreated = false;
let upgradeCreated = false;

function docker(args) {
  execFileSync('docker', args, { stdio: 'inherit' });
}

function connectionString(variable, databaseName) {
  const url = new URL(process.env[variable]);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function provision(databaseName) {
  docker([
    'compose',
    '-f',
    'infra/compose.dev.yml',
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${databaseName}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);
}

async function runMigrations(databaseName, migrationsFolder = fileURLToPath(migrationRoot)) {
  const pool = new Pool({
    connectionString: connectionString('MIGRATION_DATABASE_URL', databaseName),
    max: 1,
  });
  const connection = await pool.connect();
  const lock = 1_947_122_026;
  let locked = false;
  try {
    await connection.query('SELECT pg_advisory_lock($1)', [lock]);
    locked = true;
    await migrate(drizzle(connection), { migrationsFolder });
  } finally {
    if (locked) await connection.query('SELECT pg_advisory_unlock($1)', [lock]);
    connection.release();
    await pool.end();
  }
}

async function expectSqlState(operation, code, message) {
  await assert.rejects(operation, (error) => error.code === code, message);
}

try {
  docker([...compose, 'createdb', '-U', 'windops', emptyDb]);
  emptyCreated = true;
  provision(emptyDb);
  await Promise.all([runMigrations(emptyDb), runMigrations(emptyDb)]);
  provision(emptyDb);

  const migrationCount = execFileSync(
    'docker',
    [
      ...compose,
      'psql',
      '-U',
      'windops',
      '-d',
      emptyDb,
      '-Atc',
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    ],
    { encoding: 'utf8' },
  ).trim();
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', migrationRoot), 'utf8'));
  assert.equal(
    Number(migrationCount),
    journal.entries.length,
    'all journal entries must be applied',
  );

  const app = new Pool({ connectionString: connectionString('DATABASE_URL', emptyDb), max: 1 });
  const migration = new Pool({
    connectionString: connectionString('MIGRATION_DATABASE_URL', emptyDb),
    max: 1,
  });
  const replication = new Pool({
    connectionString: connectionString('ELECTRIC_DATABASE_URL', emptyDb),
    max: 1,
  });
  let firstWorkspaceId;
  try {
    const first = await app.query(
      `INSERT INTO public.workspaces(name) VALUES ('P02 tenant A') RETURNING id`,
    );
    firstWorkspaceId = first.rows[0].id;
    await migration.query('DROP INDEX public.workspaces_singleton');
    const second = await app.query(
      `INSERT INTO public.workspaces(name) VALUES ('P02 tenant B') RETURNING id`,
    );
    const missingId = '10000000-0000-4000-8000-000000000001';
    const parkA = '20000000-0000-4000-8000-000000000001';
    const parkB = '20000000-0000-4000-8000-000000000002';
    const turbineA = '30000000-0000-4000-8000-000000000001';

    await app.query('INSERT INTO public.parks(id, workspace_id, code) VALUES ($1, $2, $3)', [
      parkA,
      firstWorkspaceId,
      'P01',
    ]);
    await app.query('INSERT INTO public.parks(id, workspace_id, code) VALUES ($1, $2, $3)', [
      parkB,
      second.rows[0].id,
      'P01',
    ]);
    await expectSqlState(
      app.query('INSERT INTO public.parks(workspace_id, code) VALUES ($1, $2)', [
        firstWorkspaceId,
        'P01',
      ]),
      '23505',
      'park codes must be unique within a workspace',
    );
    await expectSqlState(
      app.query('INSERT INTO public.parks(workspace_id, code) VALUES ($1, $2)', [
        firstWorkspaceId,
        'P1',
      ]),
      '23514',
      'park codes must follow the canonical format',
    );
    await expectSqlState(
      app.query('INSERT INTO public.parks(workspace_id, code) VALUES ($1, $2)', [missingId, 'P02']),
      '23503',
      'parks must reference an existing workspace',
    );

    await app.query(
      'INSERT INTO public.turbines(id, workspace_id, park_id, code) VALUES ($1, $2, $3, $4)',
      [turbineA, firstWorkspaceId, parkA, 'T01'],
    );
    await expectSqlState(
      app.query('INSERT INTO public.turbines(workspace_id, park_id, code) VALUES ($1, $2, $3)', [
        firstWorkspaceId,
        parkA,
        'T01',
      ]),
      '23505',
      'turbine codes must be unique within a park',
    );
    await app.query(
      'INSERT INTO public.turbines(workspace_id, park_id, code) VALUES ($1, $2, $3)',
      [second.rows[0].id, parkB, 'T01'],
    );
    await expectSqlState(
      app.query('INSERT INTO public.turbines(workspace_id, park_id, code) VALUES ($1, $2, $3)', [
        second.rows[0].id,
        parkA,
        'T02',
      ]),
      '23503',
      'a turbine cannot reference a park owned by another workspace',
    );
    await expectSqlState(
      app.query('INSERT INTO public.turbines(workspace_id, park_id, code) VALUES ($1, $2, $3)', [
        firstWorkspaceId,
        parkA,
        'T1',
      ]),
      '23514',
      'turbine codes must follow the canonical format',
    );
    await expectSqlState(
      app.query('INSERT INTO public.parks(workspace_id, code, revision) VALUES ($1, $2, 0)', [
        firstWorkspaceId,
        'P02',
      ]),
      '23514',
      'park revisions must be positive',
    );

    await app.query('SELECT id FROM public.parks WHERE id = $1', [parkA]);
    await expectSqlState(
      app.query('CREATE TABLE public.p02_runtime_ddl (id integer)'),
      '42501',
      'the API role must not create tables',
    );
    await replication.query('SELECT id FROM public.workspaces LIMIT 1');
    await expectSqlState(
      replication.query('SELECT id FROM public.parks LIMIT 1'),
      '42501',
      'Electric must not read the parks catalog before authorized sync is implemented',
    );
    const publication = await app.query(
      `SELECT count(*)::int AS count FROM pg_publication_tables
       WHERE pubname = 'electric_publication_default' AND schemaname = 'public'
         AND tablename IN ('parks', 'turbines')`,
    );
    assert.equal(publication.rows[0].count, 0, 'catalog tables must not be published to Electric');
  } finally {
    await Promise.all([app.end(), migration.end(), replication.end()]);
  }

  docker([...compose, 'createdb', '-U', 'windops', upgradeDb]);
  upgradeCreated = true;
  provision(upgradeDb);
  const upgradeDir = mkdtempSync(join(tmpdir(), 'windops-p02-upgrade-'));
  try {
    mkdirSync(join(upgradeDir, 'meta'));
    for (let index = 0; index <= 3; index++) {
      const entry = journal.entries[index];
      copyFileSync(
        new URL(`${entry.tag}.sql`, migrationRoot),
        join(upgradeDir, `${entry.tag}.sql`),
      );
    }
    writeFileSync(
      join(upgradeDir, 'meta/_journal.json'),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 4) }),
    );
    await runMigrations(upgradeDb, upgradeDir);
    const existingWorkspace = new Pool({
      connectionString: connectionString('DATABASE_URL', upgradeDb),
      max: 1,
    });
    let preservedId;
    try {
      const inserted = await existingWorkspace.query(
        `INSERT INTO public.workspaces(name) VALUES ('P02 preserved workspace') RETURNING id`,
      );
      preservedId = inserted.rows[0].id;
      const user = await existingWorkspace.query(
        `INSERT INTO public.auth_users(name, email) VALUES ('P02 preserved member', $1) RETURNING id`,
        [`p02-${process.pid}@example.invalid`],
      );
      await existingWorkspace.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [preservedId, user.rows[0].id],
      );
    } finally {
      await existingWorkspace.end();
    }
    await runMigrations(upgradeDb);
    const verify = new Pool({
      connectionString: connectionString('DATABASE_URL', upgradeDb),
      max: 1,
    });
    try {
      const preserved = await verify.query(
        `SELECT w.name, count(m.id)::int AS members
         FROM public.workspaces w LEFT JOIN public.workspace_members m ON m.workspace_id = w.id
         WHERE w.id = $1 GROUP BY w.id`,
        [preservedId],
      );
      assert.deepEqual(preserved.rows[0], { name: 'P02 preserved workspace', members: 1 });
      const catalog = await verify.query(
        `SELECT to_regclass('public.parks') AS parks, to_regclass('public.turbines') AS turbines`,
      );
      assert.ok(catalog.rows[0].parks && catalog.rows[0].turbines);
    } finally {
      await verify.end();
    }
  } finally {
    rmSync(upgradeDir, { recursive: true, force: true });
  }

  console.log(
    'Parks schema verified: empty install, concurrent migration, tenant constraints, uniqueness, role grants, unpublished Electric tables, and upgrade preserving workspace/membership.',
  );
} finally {
  if (emptyCreated) docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', emptyDb]);
  if (upgradeCreated) docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', upgradeDb]);
}
