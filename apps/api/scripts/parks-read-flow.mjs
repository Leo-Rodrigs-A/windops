import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createParksCatalogService } from '../src/modules/parks/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL'])
  assert.ok(process.env[key], `${key} is required.`);

const database = `windops_p03_read_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const ids = {
  workspaceA: randomUUID(),
  workspaceB: randomUUID(),
  admin: { id: randomUUID(), name: 'P03 Admin', email: `p03-admin-${process.pid}@example.invalid` },
  tech: {
    id: randomUUID(),
    name: 'P03 Technician',
    email: `p03-tech-${process.pid}@example.invalid`,
  },
  other: { id: randomUUID(), name: 'P03 Other', email: `p03-other-${process.pid}@example.invalid` },
  revoked: {
    id: randomUUID(),
    name: 'P03 Revoked',
    email: `p03-revoked-${process.pid}@example.invalid`,
  },
  orphan: {
    id: randomUUID(),
    name: 'P03 Orphan',
    email: `p03-orphan-${process.pid}@example.invalid`,
  },
};
const parkIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const turbineIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
let databaseCreated = false;
let pool;
let app;

function docker(args) {
  execFileSync('docker', args, { stdio: 'inherit' });
}

function urlFor(variable) {
  const url = new URL(process.env[variable]);
  url.pathname = `/${database}`;
  return url.toString();
}

function provision() {
  docker([
    ...compose,
    'exec',
    '-T',
    '-e',
    `POSTGRES_DB=${database}`,
    'postgres',
    'sh',
    '/docker-entrypoint-initdb.d/20-provision-roles.sh',
  ]);
}

function migrate() {
  execFileSync(process.execPath, ['--import', 'tsx', 'apps/api/src/platform/database/migrate.ts'], {
    env: { ...process.env, MIGRATION_DATABASE_URL: urlFor('MIGRATION_DATABASE_URL') },
    stdio: 'inherit',
  });
}

function headers(user, step = 'complete') {
  return user ? { 'x-test-user': user.id, 'x-test-step': step } : {};
}

async function expectError(response, status, code) {
  assert.equal(response.statusCode, status, response.body);
  assert.equal(response.json().error.code, code);
}

try {
  docker([...compose, 'exec', '-T', 'postgres', 'createdb', '-U', 'windops', database]);
  databaseCreated = true;
  provision();
  migrate();
  provision();

  pool = new Pool({ connectionString: urlFor('DATABASE_URL'), max: 4 });
  const migrationPool = new Pool({ connectionString: urlFor('MIGRATION_DATABASE_URL'), max: 1 });
  try {
    const workspaces = await pool.query(
      `INSERT INTO public.workspaces(id, name) VALUES ($1, 'P03 A'), ($2, 'P03 B') RETURNING id`,
      [ids.workspaceA, ids.workspaceB],
    );
    assert.equal(workspaces.rowCount, 1, 'pilot workspace singleton still applies in the fixture');
  } catch (error) {
    if (error.code !== '23505') throw error;
    await migrationPool.query('DROP INDEX public.workspaces_singleton');
    await pool.query(
      `INSERT INTO public.workspaces(id, name) VALUES ($1, 'P03 A'), ($2, 'P03 B')`,
      [ids.workspaceA, ids.workspaceB],
    );
  } finally {
    await migrationPool.end();
  }

  const userRows = Object.values(ids).filter(
    (value) => value && typeof value === 'object' && value.id,
  );
  for (const user of userRows)
    await pool.query(
      'INSERT INTO public.auth_users(id, name, email, email_verified) VALUES ($1, $2, $3, true)',
      [user.id, user.name, user.email],
    );
  await pool.query(
    `INSERT INTO public.workspace_members(workspace_id, user_id, role, revoked_at)
     VALUES ($1, $2, 'admin', NULL), ($1, $3, 'technician', NULL),
            ($6, $4, 'admin', NULL), ($1, $5, 'technician', clock_timestamp())`,
    [ids.workspaceA, ids.admin.id, ids.tech.id, ids.other.id, ids.revoked.id, ids.workspaceB],
  );

  const parkValues = [
    [parkIds[0], ids.workspaceA, 'P01'],
    [parkIds[1], ids.workspaceA, 'P02'],
    [parkIds[2], ids.workspaceA, 'P03'],
    [parkIds[3], ids.workspaceA, 'P04'],
    [parkIds[4], ids.workspaceB, 'P01'],
  ];
  for (const [parkId, workspaceId, code] of parkValues)
    await pool.query('INSERT INTO public.parks(id, workspace_id, code) VALUES ($1, $2, $3)', [
      parkId,
      workspaceId,
      code,
    ]);
  const turbineValues = [
    [turbineIds[0], ids.workspaceA, parkIds[0], 'T01'],
    [turbineIds[1], ids.workspaceA, parkIds[0], 'T02'],
    [turbineIds[2], ids.workspaceA, parkIds[0], 'T03'],
    [turbineIds[3], ids.workspaceB, parkIds[4], 'T01'],
  ];
  for (const [turbineId, workspaceId, parkId, code] of turbineValues)
    await pool.query(
      `INSERT INTO public.turbines(id, workspace_id, park_id, code) VALUES ($1, $2, $3, $4)`,
      [turbineId, workspaceId, parkId, code],
    );

  const knownUsers = new Map(userRows.map((user) => [user.id, user]));
  const catalog = createParksCatalogService(pool);
  const identity = {
    resolveAuthenticatedUser: async (requestHeaders) => {
      const user = knownUsers.get(requestHeaders['x-test-user']);
      return user && requestHeaders['x-test-step'] === 'complete'
        ? { id: user.id, name: user.name, email: user.email }
        : null;
    },
    resolveInvitationAcceptor: async () => null,
    validateInvitationEmail: async () => 'missing',
    getUsersByIds: async () => [],
    listVerifiedDirectoryAccounts: async () => ({ items: [], nextCursor: null }),
    consumeInvitationRateLimit: async () => true,
  };
  const authorization = createWorkspaceAuthorizationService(
    pool,
    identity,
    { send: async () => {} },
    'http://localhost:5173',
  );
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
    parksCatalog: catalog,
    docs: true,
  });
  await app.ready();

  const root = `/api/workspaces/${ids.workspaceA}`;
  await expectError(await app.inject(`${root}/parks`), 401, 'AUTHENTICATION_REQUIRED');
  await expectError(
    await app.inject({ url: `${root}/parks`, headers: headers(ids.admin, 'pending') }),
    401,
    'AUTHENTICATION_REQUIRED',
  );
  await expectError(
    await app.inject({ url: `${root}/parks`, headers: headers(ids.orphan) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({ url: `${root}/parks`, headers: headers(ids.revoked) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({ url: `${root}/parks`, headers: headers(ids.other) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );

  for (const user of [ids.admin, ids.tech]) {
    const page = await app.inject({ url: `${root}/parks?limit=2`, headers: headers(user) });
    assert.equal(page.statusCode, 200, page.body);
    assert.deepEqual(
      page.json().items.map(({ code }) => code),
      ['P01', 'P02'],
    );
    assert.ok(page.json().nextCursor);
    const next = await app.inject({
      url: `${root}/parks?limit=2&cursor=${page.json().nextCursor}`,
      headers: headers(user),
    });
    assert.equal(next.statusCode, 200, next.body);
    assert.deepEqual(
      next.json().items.map(({ code }) => code),
      ['P03', 'P04'],
    );
    assert.equal(next.json().nextCursor, null);
  }

  const search = await app.inject({ url: `${root}/parks?search=p0`, headers: headers(ids.tech) });
  assert.deepEqual(
    search.json().items.map(({ code }) => code),
    ['P01', 'P02', 'P03', 'P04'],
  );
  const literalSearch = await app.inject({
    url: `${root}/parks?search=P0_`,
    headers: headers(ids.tech),
  });
  assert.equal(literalSearch.statusCode, 200, literalSearch.body);
  assert.deepEqual(literalSearch.json(), { items: [], nextCursor: null });
  const emptyTurbines = await app.inject({
    url: `${root}/parks/${parkIds[1]}/turbines`,
    headers: headers(ids.tech),
  });
  assert.equal(emptyTurbines.statusCode, 200, emptyTurbines.body);
  assert.deepEqual(emptyTurbines.json(), { items: [], nextCursor: null });
  const turbinePage = await app.inject({
    url: `${root}/parks/${parkIds[0]}/turbines?limit=2`,
    headers: headers(ids.tech),
  });
  assert.deepEqual(
    turbinePage.json().items.map(({ code }) => code),
    ['T01', 'T02'],
  );
  const turbineNext = await app.inject({
    url: `${root}/parks/${parkIds[0]}/turbines?limit=2&cursor=${turbinePage.json().nextCursor}`,
    headers: headers(ids.tech),
  });
  assert.deepEqual(
    turbineNext.json().items.map(({ code }) => code),
    ['T03'],
  );
  const locationTransaction = await pool.connect();
  try {
    await locationTransaction.query('BEGIN');
    const location = await catalog.getTurbineLocation(
      locationTransaction,
      ids.workspaceA,
      parkIds[0],
      turbineIds[0],
    );
    assert.deepEqual(location, {
      workspaceId: ids.workspaceA,
      parkId: parkIds[0],
      turbineId: turbineIds[0],
      parkDeactivatedAt: null,
      turbineDeactivatedAt: null,
    });
    assert.equal(
      await catalog.getTurbineLocation(
        locationTransaction,
        ids.workspaceA,
        parkIds[0],
        turbineIds[3],
      ),
      null,
      'the public location service must reject a turbine attached to another tenant',
    );
    await locationTransaction.query('ROLLBACK');
  } catch (error) {
    await locationTransaction.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    locationTransaction.release();
  }

  await expectError(
    await app.inject({ url: `${root}/parks/${parkIds[4]}`, headers: headers(ids.admin) }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      url: `${root}/parks/${parkIds[4]}/turbines`,
      headers: headers(ids.admin),
    }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      url: `${root}/parks/${parkIds[0]}/turbines/${turbineIds[3]}`,
      headers: headers(ids.admin),
    }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      url: `${root}/parks?cursor=${parkIds[4]}`,
      headers: headers(ids.admin),
    }),
    400,
    'INVALID_CURSOR',
  );
  await expectError(
    await app.inject({ url: `${root}/parks?limit=101`, headers: headers(ids.admin) }),
    400,
    'VALIDATION_ERROR',
  );
  await expectError(
    await app.inject({
      url: `${root}/parks?workspaceId=${ids.workspaceB}`,
      headers: headers(ids.admin),
    }),
    400,
    'VALIDATION_ERROR',
  );
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/parks']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/parks/{parkId}/turbines']);
  console.log(
    'Parks reads verified: admin/technician access, pending/orphan/revoked/other-tenant denial, isolation, stable pagination/search, empty catalog and non-disclosing 404/invalid cursor.',
  );
} finally {
  await app?.close();
  await pool?.end();
  if (databaseCreated)
    docker([
      ...compose,
      'exec',
      '-T',
      'postgres',
      'dropdb',
      '--if-exists',
      '-U',
      'windops',
      database,
    ]);
}
