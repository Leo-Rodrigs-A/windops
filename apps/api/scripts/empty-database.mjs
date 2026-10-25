import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
assert.ok(migrationUrl, 'MIGRATION_DATABASE_URL is required.');
const database = `windops_f02_empty_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml', 'exec', '-T', 'postgres'];
let created = false;
const connectionFor = (variable) => {
  const url = new URL(process.env[variable]);
  url.pathname = `/${database}`;
  return url.toString();
};

function docker(args, env = process.env) {
  execFileSync('docker', args, { env, stdio: 'inherit' });
}

function dockerOutput(args) {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}

try {
  docker([...compose, 'createdb', '-U', 'windops', database]);
  created = true;
  docker([
    'compose',
    '-f',
    'infra/compose.dev.yml',
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${database}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);

  execFileSync('./apps/api/node_modules/.bin/tsx', ['apps/api/src/platform/database/migrate.ts'], {
    env: { ...process.env, MIGRATION_DATABASE_URL: connectionFor('MIGRATION_DATABASE_URL') },
    stdio: 'inherit',
  });

  docker([
    'compose',
    '-f',
    'infra/compose.dev.yml',
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${database}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);

  const app = new Pool({ connectionString: connectionFor('DATABASE_URL'), max: 1 });
  let workspaceId;
  try {
    const result = await app.query('INSERT INTO public.workspaces(name) VALUES ($1) RETURNING id', [
      `F02 restart probe ${process.pid}`,
    ]);
    workspaceId = result.rows[0].id;
  } finally {
    await app.end();
  }

  docker(['compose', '-f', 'infra/compose.dev.yml', 'restart', 'postgres']);
  docker(['compose', '-f', 'infra/compose.dev.yml', 'up', '-d', '--wait', 'postgres']);

  const restartedApp = new Pool({ connectionString: connectionFor('DATABASE_URL'), max: 1 });
  try {
    const persisted = await restartedApp.query('SELECT id FROM public.workspaces WHERE id = $1', [
      workspaceId,
    ]);
    assert.equal(persisted.rowCount, 1, 'the test workspace must survive a PostgreSQL restart');
  } finally {
    await restartedApp.end();
  }

  const migrationCount = dockerOutput([
    ...compose,
    'psql',
    '-U',
    'windops',
    '-d',
    database,
    '-Atc',
    'SELECT count(*) FROM drizzle.__drizzle_migrations',
  ]);
  assert.equal(migrationCount, '1', 'the migration journal must survive a PostgreSQL restart');

  docker([
    'compose',
    '-f',
    'infra/compose.dev.yml',
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${database}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);

  execFileSync(process.execPath, ['apps/api/scripts/permissions.mjs'], {
    env: {
      ...process.env,
      DATABASE_URL: connectionFor('DATABASE_URL'),
      MIGRATION_DATABASE_URL: connectionFor('MIGRATION_DATABASE_URL'),
      ELECTRIC_DATABASE_URL: connectionFor('ELECTRIC_DATABASE_URL'),
    },
    stdio: 'inherit',
  });
  console.log('Empty database provisioned twice, migrated, restarted and permission-checked.');
} finally {
  if (created) docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', database]);
}
