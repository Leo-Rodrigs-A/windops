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
const database = `windops_i02_empty_${process.pid}`;
const upgradeDatabase = `windops_i02_upgrade_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml', 'exec', '-T', 'postgres'];
let created = false;
let upgradeCreated = false;
let persistedUserId;
let persistedSessionId;
let persistedIssueId;
let persistedCommandId;
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
      `INSERT INTO public.auth_users(name, email) VALUES ('I02 probe', $1) RETURNING id`,
      [`i02-${process.pid}@example.invalid`],
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
      [userId, `i02-session-${process.pid}`],
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
      [userId, `i02-invalid-session-${process.pid}`],
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
    const membership = await app.query(
      `INSERT INTO public.workspace_members(workspace_id, user_id, role)
       VALUES ($1, $2, 'admin') RETURNING id`,
      [workspaceId, userId],
    );
    const membershipId = membership.rows[0].id;
    const park = await app.query(
      `INSERT INTO public.parks(workspace_id, code) VALUES ($1, 'P01') RETURNING id`,
      [workspaceId],
    );
    const turbine = await app.query(
      `INSERT INTO public.turbines(workspace_id, park_id, code)
       VALUES ($1, $2, 'T01') RETURNING id`,
      [workspaceId, park.rows[0].id],
    );
    const secondPark = await app.query(
      `INSERT INTO public.parks(workspace_id, code) VALUES ($1, 'P02') RETURNING id`,
      [workspaceId],
    );
    const secondTurbine = await app.query(
      `INSERT INTO public.turbines(workspace_id, park_id, code)
       VALUES ($1, $2, 'T01') RETURNING id`,
      [workspaceId, secondPark.rows[0].id],
    );
    const issue = await app.query(
      `INSERT INTO public.issues
         (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Elevador parado') RETURNING id`,
      [workspaceId, park.rows[0].id, turbine.rows[0].id, membershipId, userId],
    );
    persistedIssueId = issue.rows[0].id;
    const createdEvent = await app.query(
      `INSERT INTO public.issue_events
         (workspace_id, issue_id, actor_membership_id, actor_user_id, actor_label, type, after)
       VALUES ($1, $2, $3, $4, 'I02 probe', 'created', $5::jsonb) RETURNING id`,
      [
        workspaceId,
        issue.rows[0].id,
        membershipId,
        userId,
        JSON.stringify({ text: 'Elevador parado' }),
      ],
    );
    await app.query(
      `INSERT INTO public.issue_location_references(event_id, issue_id, workspace_id, park_id, turbine_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdEvent.rows[0].id, issue.rows[0].id, workspaceId, park.rows[0].id, turbine.rows[0].id],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.issues
           (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Invalid handler state', 'in_progress')`,
        [workspaceId, park.rows[0].id, turbine.rows[0].id, membershipId, userId],
      ),
      (error) => error.code === '23514',
      'in-progress issue requires a handler membership and user',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.issues
           (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, E'  \\t\\n')`,
        [workspaceId, park.rows[0].id, turbine.rows[0].id, membershipId, userId],
      ),
      (error) => error.code === '23514',
      'issue text must contain non-whitespace content',
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.issue_events(workspace_id, issue_id, actor_label, type, before)
         VALUES ($1, $2, 'I02 probe', 'edited', '[]'::jsonb)`,
        [workspaceId, issue.rows[0].id],
      ),
      (error) => error.code === '23514',
      'event snapshots must be JSON objects',
    );
    await app.query(
      `UPDATE public.issues SET park_id = $2, turbine_id = $3, revision = revision + 1 WHERE id = $1`,
      [issue.rows[0].id, secondPark.rows[0].id, secondTurbine.rows[0].id],
    );
    const editedEvent = await app.query(
      `INSERT INTO public.issue_events
         (workspace_id, issue_id, actor_membership_id, actor_user_id, actor_label, type, before, after)
       VALUES ($1, $2, $3, $4, 'I02 probe', 'edited', $5::jsonb, $6::jsonb) RETURNING id`,
      [
        workspaceId,
        issue.rows[0].id,
        membershipId,
        userId,
        JSON.stringify({ parkId: park.rows[0].id, turbineId: turbine.rows[0].id }),
        JSON.stringify({ parkId: secondPark.rows[0].id, turbineId: secondTurbine.rows[0].id }),
      ],
    );
    await app.query(
      `INSERT INTO public.issue_location_references(event_id, issue_id, workspace_id, park_id, turbine_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        editedEvent.rows[0].id,
        issue.rows[0].id,
        workspaceId,
        secondPark.rows[0].id,
        secondTurbine.rows[0].id,
      ],
    );
    await assert.rejects(
      app.query('DELETE FROM public.turbines WHERE id = $1', [turbine.rows[0].id]),
      (error) => error.code === '23503',
      'historical issue location must prevent turbine deletion after location changes',
    );
    await assert.rejects(
      app.query('UPDATE public.issue_events SET actor_label = actor_label WHERE id = $1', [
        createdEvent.rows[0].id,
      ]),
      (error) => error.code === '42501',
      'runtime must not update append-only issue events',
    );
    await assert.rejects(
      app.query('DELETE FROM public.issue_events WHERE id = $1', [createdEvent.rows[0].id]),
      (error) => error.code === '42501',
      'runtime must not delete append-only issue events',
    );
    const commandId = `00000000-0000-4000-8000-${String(process.pid).padStart(12, '0')}`;
    persistedCommandId = commandId;
    await app.query(
      `INSERT INTO public.sync_commands
         (workspace_id, actor_membership_id, actor_user_id, command_id, payload_hash, result)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        workspaceId,
        membershipId,
        userId,
        commandId,
        Buffer.alloc(32, 7),
        JSON.stringify({ issueId: issue.rows[0].id }),
      ],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.sync_commands
           (workspace_id, actor_membership_id, actor_user_id, command_id, payload_hash, result)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          workspaceId,
          membershipId,
          userId,
          commandId,
          Buffer.alloc(32, 8),
          JSON.stringify({ issueId: issue.rows[0].id }),
        ],
      ),
      (error) => error.code === '23505',
      'command receipt key must be unique for the workspace and actor',
    );
    const migratorProbe = new Pool({
      connectionString: connectionFor('MIGRATION_DATABASE_URL'),
      max: 1,
    });
    try {
      await migratorProbe.query('DROP INDEX public.workspaces_singleton');
    } finally {
      await migratorProbe.end();
    }
    const otherWorkspaceId = (
      await app.query(
        `INSERT INTO public.workspaces(name) VALUES ('Issue tenant FK probe') RETURNING id`,
      )
    ).rows[0].id;
    const otherMembership = await app.query(
      `INSERT INTO public.workspace_members(workspace_id, user_id, role)
       VALUES ($1, $2, 'admin') RETURNING id`,
      [otherWorkspaceId, userId],
    );
    await assert.rejects(
      app.query(
        `INSERT INTO public.issues
           (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Cross tenant')`,
        [otherWorkspaceId, park.rows[0].id, turbine.rows[0].id, otherMembership.rows[0].id, userId],
      ),
      (error) => error.code === '23503',
      'issue must not reference another tenant equipment',
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
        name: 'I02 probe',
        email: `i02-${process.pid}@example.invalid`,
        role: 'admin',
        session_id: persistedSessionId,
      },
    ]);
    const persistedIssue = await restartedApp.query(
      `SELECT i.text, i.status, count(DISTINCT e.id)::int AS event_count,
              count(DISTINCT r.event_id)::int AS location_reference_count
       FROM public.issues i
       JOIN public.issue_events e ON e.workspace_id = i.workspace_id AND e.issue_id = i.id
       JOIN public.issue_location_references r ON r.workspace_id = i.workspace_id AND r.issue_id = i.id
       WHERE i.id = $1
       GROUP BY i.id`,
      [persistedIssueId],
    );
    assert.deepEqual(persistedIssue.rows[0], {
      text: 'Elevador parado',
      status: 'pending',
      event_count: 2,
      location_reference_count: 2,
    });
    const persistedReceipt = await restartedApp.query(
      `SELECT command_id FROM public.sync_commands WHERE command_id = $1`,
      [persistedCommandId],
    );
    assert.equal(persistedReceipt.rowCount, 1, 'successful command receipts must survive restart');
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
  const expectedMigrationCount = JSON.parse(
    readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
  ).entries.length;
  assert.equal(
    Number(migrationCount),
    expectedMigrationCount,
    'every current migration must survive a PostgreSQL restart',
  );

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

  const migrationDir = mkdtempSync(join(tmpdir(), 'windops-i02-upgrade-'));
  try {
    const migrationRoot = new URL('../drizzle/', import.meta.url);
    const baseJournal = JSON.parse(
      readFileSync(new URL('meta/_journal.json', migrationRoot), 'utf8'),
    );
    mkdirSync(join(migrationDir, 'meta'));
    for (const entry of baseJournal.entries.slice(0, 5)) {
      copyFileSync(
        new URL(`${entry.tag}.sql`, migrationRoot),
        join(migrationDir, `${entry.tag}.sql`),
      );
    }
    writeFileSync(
      join(migrationDir, 'meta/_journal.json'),
      JSON.stringify({ ...baseJournal, entries: baseJournal.entries.slice(0, 5) }),
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
    let preservedUserId;
    let preservedParkId;
    let preservedTurbineId;
    try {
      const inserted = await upgradeApp.query(
        `INSERT INTO public.workspaces(name) VALUES ('I02 preserved workspace') RETURNING id`,
      );
      preservedWorkspaceId = inserted.rows[0].id;
      const identity = await upgradeApp.query(
        `INSERT INTO public.auth_users(name, email) VALUES ('I02 preserved user', $1) RETURNING id`,
        [`i02-preserved-${process.pid}@example.invalid`],
      );
      preservedUserId = identity.rows[0].id;
      await upgradeApp.query(
        `INSERT INTO public.workspace_members(workspace_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [preservedWorkspaceId, preservedUserId],
      );
      const park = await upgradeApp.query(
        `INSERT INTO public.parks(workspace_id, code) VALUES ($1, 'P99') RETURNING id`,
        [preservedWorkspaceId],
      );
      preservedParkId = park.rows[0].id;
      const turbine = await upgradeApp.query(
        `INSERT INTO public.turbines(workspace_id, park_id, code)
         VALUES ($1, $2, 'T99') RETURNING id`,
        [preservedWorkspaceId, preservedParkId],
      );
      preservedTurbineId = turbine.rows[0].id;
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
        'I02 preserved workspace',
        'the existing workspace must survive the upgrade from 0004',
      );
      const preservedIdentity = await verifyUpgrade.query(
        `SELECT u.name, m.role FROM public.auth_users u
         JOIN public.workspace_members m ON m.user_id = u.id
         WHERE u.id = $1 AND m.workspace_id = $2`,
        [preservedUserId, preservedWorkspaceId],
      );
      assert.deepEqual(preservedIdentity.rows, [{ name: 'I02 preserved user', role: 'admin' }]);
      const preservedCatalog = await verifyUpgrade.query(
        `SELECT p.code AS park_code, t.code AS turbine_code
         FROM public.parks p JOIN public.turbines t
           ON t.park_id = p.id AND t.workspace_id = p.workspace_id
         WHERE p.id = $1 AND t.id = $2`,
        [preservedParkId, preservedTurbineId],
      );
      assert.deepEqual(preservedCatalog.rows, [{ park_code: 'P99', turbine_code: 'T99' }]);
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
        `INSERT INTO public.workspaces(name) VALUES ('I02 secondary test workspace') RETURNING id`,
      );
      const tenantUser = await verifyUpgrade.query(
        `INSERT INTO public.auth_users(name, email) VALUES ('I02 tenant probe', $1) RETURNING id`,
        [`i02-tenant-${process.pid}@example.invalid`],
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
    'Empty install, repeated migration, constraints, user/session/challenge/membership persistence after restart, permissions and upgrade preserving workspace, identity and catalog from 0004 verified.',
  );
} finally {
  if (created) docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', database]);
  if (upgradeCreated)
    docker([...compose, 'dropdb', '--if-exists', '-U', 'windops', upgradeDatabase]);
}
