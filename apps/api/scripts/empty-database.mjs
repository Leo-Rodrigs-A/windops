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

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
assert.ok(migrationUrl, 'MIGRATION_DATABASE_URL is required.');
const database = `windops_f03_empty_${process.pid}`;
const upgradeDatabase = `windops_f03_upgrade_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml', 'exec', '-T', 'postgres'];
let created = false;
let upgradeCreated = false;
let persistedUserId;
let persistedSessionId;
const connectionFor = (variable, targetDatabase = database) => {
  const url = new URL(process.env[variable]);
  url.pathname = `/${targetDatabase}`;
  return url.toString();
};

function docker(args, env = process.env) {
  execFileSync('docker', args, { env, stdio: 'inherit' });
}

function dockerOutput(args) {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}

function provision(targetDatabase) {
  docker([
    'compose',
    '-f',
    'infra/compose.dev.yml',
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${targetDatabase}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);
}

function runFullMigration(targetDatabase) {
  execFileSync('./apps/api/node_modules/.bin/tsx', ['apps/api/src/platform/database/migrate.ts'], {
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: connectionFor('MIGRATION_DATABASE_URL', targetDatabase),
    },
    stdio: 'inherit',
  });
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

  await Promise.all([runFullMigration(database), runFullMigration(database)]);

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
    const user = await app.query(
      `INSERT INTO public.auth_users(name, email) VALUES ('F03 probe', $1) RETURNING id`,
      [`f03-${process.pid}@example.invalid`],
    );
    const userId = user.rows[0].id;
    persistedUserId = userId;
    assert.equal(
      (await app.query('SELECT email_verified FROM public.auth_users WHERE id = $1', [userId]))
        .rows[0].email_verified,
      false,
    );
    const session = await app.query(
      `INSERT INTO public.auth_sessions(user_id, token, expires_at, updated_at)
       VALUES ($1, $2, now() + interval '15 minutes', now()) RETURNING id, expires_at`,
      [userId, `f03-session-${process.pid}`],
    );
    persistedSessionId = session.rows[0].id;
    assert.match(session.rows[0].id, /^[0-9a-f-]{36}$/i, 'provider IDs must be UUIDs');
    assert.ok(session.rows[0].expires_at instanceof Date, 'session expiration must be a timestamp');
    await app.query(
      `INSERT INTO public.auth_login_challenges(session_id, code_mac, expires_at, sent_at, window_started_at)
       VALUES ($1, $2, now() + interval '15 minutes', now(), now())`,
      [session.rows[0].id, Buffer.alloc(32)],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.auth_login_challenges(session_id, code_mac, expires_at, sent_at, window_started_at)
         VALUES ($1, $2, now(), now(), now())`,
        [session.rows[0].id, Buffer.alloc(32)],
      ),
      (error) => error.code === '23505',
      'a session must have at most one challenge',
    );
    const invalidSession = await app.query(
      `INSERT INTO public.auth_sessions(user_id, token, expires_at, updated_at)
       VALUES ($1, $2, now(), now()) RETURNING id`,
      [userId, `f03-invalid-session-${process.pid}`],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.auth_login_challenges(session_id, code_mac, expires_at, attempts, sent_at, window_started_at)
         VALUES ($1, $2, now(), 6, now(), now())`,
        [invalidSession.rows[0].id, Buffer.alloc(32)],
      ),
      (error) => error.code === '23514',
      'out-of-range challenge attempts must fail',
    );
    await app.query(
      `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [workspaceId, userId],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [workspaceId, userId],
      ),
      (error) => error.code === '23505',
      'duplicate workspace membership must fail',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [workspaceId, userId],
      ),
      (error) => error.code === '23514',
      'unsupported membership role must fail',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, gen_random_uuid(), 'admin')`,
        [workspaceId],
      ),
      (error) => error.code === '23503',
      'membership without an identity must fail',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES (gen_random_uuid(), $1, 'admin')`,
        [userId],
      ),
      (error) => error.code === '23503',
      'membership without an existing workspace must fail',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.auth_accounts(account_id, provider_id, user_id, updated_at) VALUES ('same', 'google', $1, now()), ('same', 'google', $1, now())`,
        [userId],
      ),
      (error) => error.code === '23505',
      'duplicate provider identity must fail',
    );
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
    const persistedIdentity = await restartedApp.query(
      `SELECT u.name, u.email, m.role, c.session_id
       FROM public.auth_users u
       JOIN public.workspace_members m ON m.user_id = u.id
       JOIN public.auth_sessions s ON s.user_id = u.id AND s.id = $3
       JOIN public.auth_login_challenges c ON c.session_id = s.id
       WHERE u.id = $1 AND m.workspace_id = $2`,
      [persistedUserId, workspaceId, persistedSessionId],
    );
    assert.deepEqual(persistedIdentity.rows, [
      {
        name: 'F03 probe',
        email: `f03-${process.pid}@example.invalid`,
        role: 'admin',
        session_id: persistedSessionId,
      },
    ]);
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
  assert.equal(migrationCount, '2', 'both migrations must survive a PostgreSQL restart');

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
  docker([...compose, 'createdb', '-U', 'windops', upgradeDatabase]);
  upgradeCreated = true;
  provision(upgradeDatabase);

  const migrationDir = mkdtempSync(join(tmpdir(), 'windops-f03-upgrade-'));
  try {
    const migrationRoot = new URL('../drizzle/', import.meta.url);
    const baseJournal = JSON.parse(
      readFileSync(new URL('meta/_journal.json', migrationRoot), 'utf8'),
    );
    mkdirSync(join(migrationDir, 'meta'));
    copyFileSync(
      new URL('0000_workspace_foundation.sql', migrationRoot),
      join(migrationDir, '0000_workspace_foundation.sql'),
    );
    writeFileSync(
      join(migrationDir, 'meta/_journal.json'),
      JSON.stringify({ ...baseJournal, entries: [baseJournal.entries[0]] }),
    );
    const upgradePool = new Pool({
      connectionString: connectionFor('MIGRATION_DATABASE_URL', upgradeDatabase),
      max: 1,
    });
    try {
      await migrate(drizzle(upgradePool), { migrationsFolder: migrationDir });
    } finally {
      await upgradePool.end();
    }
    const upgradeApp = new Pool({
      connectionString: connectionFor('DATABASE_URL', upgradeDatabase),
      max: 1,
    });
    let preservedWorkspaceId;
    try {
      const inserted = await upgradeApp.query(
        `INSERT INTO public.workspaces(name) VALUES ('F03 preserved workspace') RETURNING id`,
      );
      preservedWorkspaceId = inserted.rows[0].id;
    } finally {
      await upgradeApp.end();
    }

    await Promise.all([runFullMigration(upgradeDatabase), runFullMigration(upgradeDatabase)]);
    provision(upgradeDatabase);
    const verifyUpgrade = new Pool({
      connectionString: connectionFor('DATABASE_URL', upgradeDatabase),
      max: 1,
    });
    try {
      const preserved = await verifyUpgrade.query(
        'SELECT name FROM public.workspaces WHERE id = $1',
        [preservedWorkspaceId],
      );
      assert.equal(
        preserved.rows[0]?.name,
        'F03 preserved workspace',
        'the existing workspace must survive the upgrade from 0000',
      );
      const schema = await verifyUpgrade.query(
        `SELECT to_regclass('public.auth_users') AS users, to_regclass('public.workspace_members') AS members`,
      );
      assert.ok(
        schema.rows[0].users && schema.rows[0].members,
        'the upgrade must create identity and membership tables',
      );
      const ddl = new Pool({
        connectionString: connectionFor('MIGRATION_DATABASE_URL', upgradeDatabase),
        max: 1,
      });
      try {
        await ddl.query('DROP INDEX public.workspaces_singleton');
      } finally {
        await ddl.end();
      }
      const secondWorkspace = await verifyUpgrade.query(
        `INSERT INTO public.workspaces(name) VALUES ('F03 secondary test workspace') RETURNING id`,
      );
      const tenantUser = await verifyUpgrade.query(
        `INSERT INTO public.auth_users(name, email) VALUES ('F03 tenant probe', $1) RETURNING id`,
        [`f03-tenant-${process.pid}@example.invalid`],
      );
      await verifyUpgrade.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role)
         VALUES ($1, $3, 'admin'), ($2, $3, 'technician')`,
        [preservedWorkspaceId, secondWorkspace.rows[0].id, tenantUser.rows[0].id],
      );
      const memberCount = await verifyUpgrade.query(
        'SELECT count(*)::int AS count FROM public.workspace_members WHERE user_id = $1',
        [tenantUser.rows[0].id],
      );
      assert.equal(
        memberCount.rows[0].count,
        2,
        'the multi-workspace fixture must be isolated to the disposable test database',
      );
    } finally {
      await verifyUpgrade.end();
    }
  } finally {
    rmSync(migrationDir, { recursive: true, force: true });
  }
  console.log(
    'Empty install, repeated migration, constraints, user/session/challenge/membership persistence after restart, permissions and upgrade preserving a 0000 workspace verified.',
  );
} finally {
  if (created) docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', database]);
  if (upgradeCreated)
    docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', upgradeDatabase]);
}
