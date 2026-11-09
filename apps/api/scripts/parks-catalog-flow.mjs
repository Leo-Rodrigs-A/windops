import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createParksCatalogService } from '../src/modules/parks/index.ts';
import { createSyncService } from '../src/modules/sync/index.ts';
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
    [parkIds[0], ids.workspaceA, 'Parque 01', '2026-01-03T00:00:00.000Z'],
    [parkIds[1], ids.workspaceA, 'Parque 02', '2026-01-01T00:00:00.000Z'],
    [parkIds[2], ids.workspaceA, 'Parque 03', '2026-01-04T00:00:00.000Z'],
    [parkIds[3], ids.workspaceA, 'Parque 04', '2026-01-02T00:00:00.000Z'],
    [parkIds[4], ids.workspaceB, 'Parque 01', '2026-01-01T00:00:00.000Z'],
  ];
  for (const [parkId, workspaceId, code, createdAt] of parkValues)
    await pool.query(
      'INSERT INTO public.parks(id, workspace_id, code, created_at) VALUES ($1, $2, $3, $4)',
      [parkId, workspaceId, code, createdAt],
    );
  const turbineValues = [
    [turbineIds[0], ids.workspaceA, parkIds[0], 'ZAC-01-01', '2026-01-02T00:00:00.000Z'],
    [turbineIds[1], ids.workspaceA, parkIds[0], 'ZAC-01-02', '2026-01-03T00:00:00.000Z'],
    [turbineIds[2], ids.workspaceA, parkIds[0], 'ZAC-01-03', '2026-01-01T00:00:00.000Z'],
    [turbineIds[3], ids.workspaceB, parkIds[4], 'ZAC-01-01', '2026-01-01T00:00:00.000Z'],
  ];
  for (const [turbineId, workspaceId, parkId, code, createdAt] of turbineValues)
    await pool.query(
      `INSERT INTO public.turbines(id, workspace_id, park_id, code, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [turbineId, workspaceId, parkId, code, createdAt],
    );

  const knownUsers = new Map(userRows.map((user) => [user.id, user]));
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
  const catalog = createParksCatalogService(pool, authorization, createSyncService());
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
      ['Parque 02', 'Parque 04'],
    );
    assert.ok(page.json().nextCursor);
    const next = await app.inject({
      url: `${root}/parks?limit=2&cursor=${page.json().nextCursor}`,
      headers: headers(user),
    });
    assert.equal(next.statusCode, 200, next.body);
    assert.deepEqual(
      next.json().items.map(({ code }) => code),
      ['Parque 01', 'Parque 03'],
    );
    assert.equal(next.json().nextCursor, null);
  }

  const search = await app.inject({
    url: `${root}/parks?search=Parque%200`,
    headers: headers(ids.tech),
  });
  assert.deepEqual(
    search.json().items.map(({ code }) => code),
    ['Parque 02', 'Parque 04', 'Parque 01', 'Parque 03'],
  );
  const literalSearch = await app.inject({
    url: `${root}/parks?search=Parque%200_`,
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
    ['ZAC-01-03', 'ZAC-01-01'],
  );
  const turbineNext = await app.inject({
    url: `${root}/parks/${parkIds[0]}/turbines?limit=2&cursor=${turbinePage.json().nextCursor}`,
    headers: headers(ids.tech),
  });
  assert.deepEqual(
    turbineNext.json().items.map(({ code }) => code),
    ['ZAC-01-02'],
  );
  const renamedSeedPark = await app.inject({
    method: 'PATCH',
    url: `${root}/parks/${parkIds[0]}`,
    headers: headers(ids.admin),
    payload: { code: 'Parque 07', expectedRevision: 1 },
  });
  assert.equal(renamedSeedPark.statusCode, 200, renamedSeedPark.body);
  const cascadedTurbine = await app.inject({
    url: `${root}/parks/${parkIds[0]}/turbines/${turbineIds[0]}`,
    headers: headers(ids.tech),
  });
  assert.equal(cascadedTurbine.statusCode, 200, cascadedTurbine.body);
  assert.equal(cascadedTurbine.json().code, 'ZAC-07-01');
  assert.equal(cascadedTurbine.json().revision, 2);
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

  const parksUrl = `${root}/parks`;
  await expectError(
    await app.inject({ method: 'POST', url: parksUrl, payload: { code: 'Parque 91' } }),
    401,
    'AUTHENTICATION_REQUIRED',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: parksUrl,
      headers: headers(ids.tech),
      payload: { code: 'Parque 91' },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: parksUrl,
      headers: headers(ids.admin),
      payload: { code: 'Parque 91', workspaceId: ids.workspaceB },
    }),
    400,
    'VALIDATION_ERROR',
  );

  const createdPark = await app.inject({
    method: 'POST',
    url: parksUrl,
    headers: headers(ids.admin),
    payload: { code: 'Parque 91' },
  });
  assert.equal(createdPark.statusCode, 201, createdPark.body);
  assert.equal(createdPark.json().revision, 1);
  assert.equal(createdPark.json().workspaceId, ids.workspaceA);
  const createdParkId = createdPark.json().id;

  const duplicateCreations = await Promise.all([
    app.inject({
      method: 'POST',
      url: parksUrl,
      headers: headers(ids.admin),
      payload: { code: 'Parque 92' },
    }),
    app.inject({
      method: 'POST',
      url: parksUrl,
      headers: headers(ids.admin),
      payload: { code: 'Parque 92' },
    }),
  ]);
  assert.deepEqual(duplicateCreations.map((response) => response.statusCode).sort(), [201, 409]);
  await expectError(
    await app.inject({
      method: 'POST',
      url: parksUrl,
      headers: headers(ids.admin),
      payload: { code: 'Parque 03' },
    }),
    409,
    'CATALOG_CODE_TAKEN',
  );

  const parkPath = `${parksUrl}/${createdParkId}`;
  const renamedPark = await app.inject({
    method: 'PATCH',
    url: parkPath,
    headers: headers(ids.admin),
    payload: { code: 'Parque 93', expectedRevision: 1 },
  });
  assert.equal(renamedPark.statusCode, 200, renamedPark.body);
  assert.equal(renamedPark.json().revision, 2);
  assert.equal(renamedPark.json().id, createdParkId);
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: parkPath,
      headers: headers(ids.admin),
      payload: { code: 'Parque 94', expectedRevision: 1 },
    }),
    409,
    'REVISION_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: parkPath,
      headers: headers(ids.admin),
      payload: { code: 'Parque 02', expectedRevision: 2 },
    }),
    409,
    'CATALOG_CODE_TAKEN',
  );
  const concurrentEdits = await Promise.all([
    app.inject({
      method: 'PATCH',
      url: parkPath,
      headers: headers(ids.admin),
      payload: { code: 'Parque 95', expectedRevision: 2 },
    }),
    app.inject({
      method: 'PATCH',
      url: parkPath,
      headers: headers(ids.admin),
      payload: { code: 'Parque 96', expectedRevision: 2 },
    }),
  ]);
  assert.deepEqual(concurrentEdits.map((response) => response.statusCode).sort(), [200, 409]);
  const parkAfterRace = await pool.query(
    'SELECT revision, code FROM public.parks WHERE workspace_id = $1 AND id = $2',
    [ids.workspaceA, createdParkId],
  );
  assert.equal(parkAfterRace.rows[0].revision, 3);
  const turbinePrefix = `ZAC-${parkAfterRace.rows[0].code.slice(7)}-`;

  const turbinesUrl = `${parkPath}/turbines`;
  const createdTurbine = await app.inject({
    method: 'POST',
    url: turbinesUrl,
    headers: headers(ids.admin),
    payload: { code: `${turbinePrefix}91` },
  });
  assert.equal(createdTurbine.statusCode, 201, createdTurbine.body);
  assert.equal(createdTurbine.json().revision, 1);
  const createdTurbineId = createdTurbine.json().id;
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/parks/${parkIds[4]}/turbines`,
      headers: headers(ids.admin),
      payload: { code: 'ZAC-02-92' },
    }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: turbinesUrl,
      headers: headers(ids.admin),
      payload: { code: `${turbinePrefix}91` },
    }),
    409,
    'CATALOG_CODE_TAKEN',
  );
  const turbinePath = `${turbinesUrl}/${createdTurbineId}`;
  const renamedTurbine = await app.inject({
    method: 'PATCH',
    url: turbinePath,
    headers: headers(ids.admin),
    payload: { code: `${turbinePrefix}93`, expectedRevision: 1 },
  });
  assert.equal(renamedTurbine.statusCode, 200, renamedTurbine.body);
  assert.equal(renamedTurbine.json().revision, 2);
  assert.equal(renamedTurbine.json().parkId, createdParkId);
  await expectError(
    await app.inject({
      method: 'POST',
      url: turbinesUrl,
      headers: headers(ids.admin),
      payload: { code: 'ZAC-01-99' },
    }),
    400,
    'INVALID_CATALOG_CODE',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: turbinePath,
      headers: headers(ids.admin),
      payload: { code: `${turbinePrefix}94`, expectedRevision: 1 },
    }),
    409,
    'REVISION_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: turbinePath,
      headers: headers(ids.admin),
      payload: { code: 'ZAC-01-94', expectedRevision: 2, parkId: parkIds[0] },
    }),
    400,
    'VALIDATION_ERROR',
  );

  await app.close();
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
    parksCatalog: catalog,
    docs: true,
  });
  await app.ready();
  const afterApiRestart = await app.inject({
    url: `${root}/parks/${createdParkId}`,
    headers: headers(ids.tech),
  });
  assert.equal(afterApiRestart.statusCode, 200, afterApiRestart.body);
  assert.equal(afterApiRestart.json().id, createdParkId);
  assert.equal(afterApiRestart.json().revision, 3);
  const turbineAfterRestart = await app.inject({
    url: `${root}/parks/${createdParkId}/turbines/${createdTurbineId}`,
    headers: headers(ids.tech),
  });
  assert.equal(turbineAfterRestart.statusCode, 200, turbineAfterRestart.body);
  assert.equal(turbineAfterRestart.json().revision, 2);

  const revocation = await pool.connect();
  try {
    await revocation.query('BEGIN');
    await revocation.query('SELECT id FROM public.workspaces WHERE id = $1 FOR UPDATE', [
      ids.workspaceA,
    ]);
    await revocation.query(
      `UPDATE public.workspace_members SET revoked_at = clock_timestamp()
       WHERE workspace_id = $1 AND user_id = $2`,
      [ids.workspaceA, ids.admin.id],
    );
    let requestSettled = false;
    const writeDuringRevocation = app
      .inject({
        method: 'POST',
        url: parksUrl,
        headers: headers(ids.admin),
        payload: { code: 'Parque 97' },
      })
      .then((response) => {
        requestSettled = true;
        return response;
      });
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(requestSettled, false, 'write waits for concurrent membership change');
    await revocation.query('COMMIT');
    await expectError(await writeDuringRevocation, 403, 'WORKSPACE_ACCESS_DENIED');
  } catch (error) {
    await revocation.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    revocation.release();
  }
  const revokedWrite = await pool.query(
    'SELECT 1 FROM public.parks WHERE workspace_id = $1 AND code = $2',
    [ids.workspaceA, 'Parque 97'],
  );
  assert.equal(revokedWrite.rowCount, 0, 'revoked admin write leaves no catalog row');

  console.log(
    'Parks catalog verified: tenant reads, admin-only writes, concurrent uniqueness and revision conflicts, turbine parent isolation, stable IDs, and revocation serialized with writes.',
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
