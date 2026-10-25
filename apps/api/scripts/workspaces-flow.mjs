import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createIdentityProvider, createIdentityService } from '../src/modules/identity/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';
import { parseEnvironment } from '../src/platform/config.ts';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const env = parseEnvironment(process.env);
const database = `windops_f05_workspace_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const testSecret = randomBytes(48).toString('base64url');
const bootstrapSql = readFileSync(new URL('./bootstrap-workspace.sql', import.meta.url));
const workspaceA = randomUUID();
const workspaceB = randomUUID();
const admin = { id: randomUUID(), email: `f05-admin-${process.pid}@example.invalid` };
const technician = { id: randomUUID(), email: `f05-tech-${process.pid}@example.invalid` };
const workspaceBUser = { id: randomUUID(), email: `f05-other-${process.pid}@example.invalid` };
const orphan = { id: randomUUID(), email: `f05-orphan-${process.pid}@example.invalid` };
const unverified = { id: randomUUID(), email: `f05-unverified-${process.pid}@example.invalid` };
const pendingUser = { id: randomUUID(), email: `f05-pending-${process.pid}@example.invalid` };
const sessions = new Map();
let databaseCreated = false;
let pool;
let app;

function docker(args, options = {}) {
  return execFileSync('docker', args, { cwd: process.cwd(), ...options });
}

function connectionFor(urlString) {
  const url = new URL(urlString);
  url.pathname = `/${database}`;
  return url.toString();
}

function provisionRoles() {
  docker(
    [
      ...compose,
      'exec',
      '-T',
      '-e',
      `POSTGRES_DB=${database}`,
      'postgres',
      'sh',
      '/docker-entrypoint-initdb.d/20-provision-roles.sh',
    ],
    { stdio: 'inherit' },
  );
}

function runMigrations() {
  execFileSync('./apps/api/node_modules/.bin/tsx', ['apps/api/src/platform/database/migrate.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MIGRATION_DATABASE_URL: connectionFor(process.env.MIGRATION_DATABASE_URL),
    },
    stdio: 'inherit',
  });
}

function runBootstrap(userId, requestedWorkspace = workspaceA, name = 'F05 Workspace') {
  return docker(
    [
      ...compose,
      'exec',
      '-T',
      'postgres',
      'psql',
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `workspace_id=${requestedWorkspace}`,
      '-v',
      `workspace_name=${name}`,
      '-v',
      `user_id=${userId}`,
      '-U',
      'windops',
      '-d',
      database,
      '-f',
      '-',
    ],
    { input: bootstrapSql, encoding: 'utf8' },
  );
}

function expectBootstrapFailure(userId, pattern, requestedWorkspace = workspaceA) {
  let error;
  try {
    runBootstrap(userId, requestedWorkspace);
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, 'conflicting or invalid bootstrap must fail');
  assert.match(String(error.stderr ?? error.message), pattern);
}

function seedSql() {
  const values = [admin, technician, workspaceBUser, orphan, unverified, pendingUser]
    .map(
      (user, index) =>
        `('${user.id}', 'F05 Test ${index}', '${user.email}', ${user === unverified ? 'false' : 'true'})`,
    )
    .join(',\n');
  docker([
    ...compose,
    'exec',
    '-T',
    'postgres',
    'psql',
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'windops',
    '-d',
    database,
    '-c',
    `INSERT INTO public.auth_users (id, name, email, email_verified) VALUES ${values}`,
  ]);
}

function runAdminSql(query) {
  docker([
    ...compose,
    'exec',
    '-T',
    'postgres',
    'psql',
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'windops',
    '-d',
    database,
    '-c',
    query,
  ]);
}

function createSession(user, completed = true) {
  const token = randomBytes(32).toString('base64url');
  const id = randomUUID();
  sessions.set(user.id, token);
  const marker = completed ? 'clock_timestamp()' : 'NULL';
  runAdminSql(
    `INSERT INTO public.auth_sessions
      (id, token, user_id, expires_at, created_at, updated_at, email_second_step_at)
     VALUES ('${id}', '${token}', '${user.id}', clock_timestamp() + interval '1 hour',
       clock_timestamp(), clock_timestamp(), ${marker})`,
  );
}

function psqlCount(query) {
  return docker(
    [
      ...compose,
      'exec',
      '-T',
      'postgres',
      'psql',
      '-X',
      '-At',
      '-U',
      'windops',
      '-d',
      database,
      '-c',
      query,
    ],
    { encoding: 'utf8' },
  ).trim();
}

function requestHeaders(token) {
  const signedSession = token
    ? encodeURIComponent(
        `${token}.${createHmac('sha256', testSecret).update(token).digest('base64')}`,
      )
    : undefined;
  return {
    host: new URL(env.APP_ORIGIN).host,
    origin: env.APP_ORIGIN,
    ...(signedSession ? { cookie: `better-auth.session_token=${signedSession}` } : {}),
  };
}

async function call(method, url, token, payload) {
  return app.inject({
    method,
    url,
    headers: requestHeaders(token),
    ...(payload === undefined ? {} : { payload }),
  });
}

try {
  docker([...compose, 'exec', '-T', 'postgres', 'createdb', '-U', 'windops', database]);
  databaseCreated = true;
  provisionRoles();
  runMigrations();
  provisionRoles();
  pool = new Pool({ connectionString: connectionFor(env.DATABASE_URL), max: 5 });
  seedSql();

  runBootstrap(admin.id);
  runBootstrap(admin.id);
  assert.equal(psqlCount('SELECT count(*) FROM public.workspaces'), '1');
  assert.equal(
    psqlCount(
      `SELECT count(*) FROM public.workspace_members WHERE workspace_id = '${workspaceA}' AND user_id = '${admin.id}' AND role = 'admin' AND revoked_at IS NULL`,
    ),
    '1',
    'repeating bootstrap must leave one active admin membership',
  );
  expectBootstrapFailure(unverified.id, /email must be verified/);
  expectBootstrapFailure(randomUUID(), /does not exist/);
  assert.equal(psqlCount('SELECT count(*) FROM public.workspaces'), '1');

  runAdminSql(`INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('${workspaceA}', '${technician.id}', 'technician')`);
  expectBootstrapFailure(technician.id, /conflicting membership/);
  assert.equal(
    psqlCount(
      `SELECT role FROM public.workspace_members WHERE workspace_id = '${workspaceA}' AND user_id = '${technician.id}'`,
    ),
    'technician',
    'bootstrap must not promote an existing technician',
  );
  expectBootstrapFailure(admin.id, /conflicts with the existing pilot workspace/, workspaceB);

  runAdminSql('DROP INDEX public.workspaces_singleton');
  runAdminSql(
    `INSERT INTO public.workspaces (id, name) VALUES ('${workspaceB}', 'F05 Other Workspace')`,
  );
  runAdminSql(`INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('${workspaceB}', '${workspaceBUser.id}', 'technician')`);
  createSession(admin);
  createSession(technician);
  createSession(workspaceBUser);
  createSession(orphan);
  createSession(unverified);
  createSession(pendingUser, false);

  const identity = createIdentityProvider(pool, env.APP_ORIGIN, testSecret, {
    async send() {},
  });
  const workspaceAuthorization = createWorkspaceAuthorizationService(
    pool,
    createIdentityService(identity),
  );
  app = buildApp({
    ready: async () => {},
    identity,
    authOrigin: env.APP_ORIGIN,
    workspaceAuthorization,
    logger: false,
  });
  await app.ready();

  assert.equal(
    (await call('GET', '/api/me')).statusCode,
    401,
    'anonymous visitors must not access /api/me',
  );
  assert.equal(
    (await call('GET', '/api/me', sessions.get(pendingUser.id))).statusCode,
    401,
    'sessions before the second step must not access /api/me',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/context`, sessions.get(pendingUser.id)))
      .statusCode,
    401,
    'sessions before the second step must not access workspace context',
  );
  const adminMe = await call('GET', '/api/me', sessions.get(admin.id));
  assert.equal(adminMe.statusCode, 200, adminMe.body);
  assert.deepEqual(Object.keys(adminMe.json().user).sort(), ['email', 'id', 'name']);
  assert.equal(adminMe.json().user.name, 'F05 Test 0');
  assert.deepEqual(adminMe.json().workspaces, [
    { id: workspaceA, name: 'F05 Workspace', role: 'admin' },
  ]);
  assert.equal('accounts' in adminMe.json(), false);

  await app.close();
  app = buildApp({
    ready: async () => {},
    identity,
    authOrigin: env.APP_ORIGIN,
    workspaceAuthorization,
    logger: false,
  });
  await app.ready();
  const adminMeAfterRestart = await call('GET', '/api/me', sessions.get(admin.id));
  assert.equal(adminMeAfterRestart.statusCode, 200, adminMeAfterRestart.body);
  assert.deepEqual(
    adminMeAfterRestart.json(),
    adminMe.json(),
    'identity and active membership must remain available after restarting the API instance',
  );

  const technicianContext = await call(
    'GET',
    `/api/workspaces/${workspaceA}/context?workspaceId=${workspaceB}&role=admin`,
    sessions.get(technician.id),
  );
  assert.equal(technicianContext.statusCode, 200, technicianContext.body);
  assert.deepEqual(technicianContext.json(), {
    workspace: { id: workspaceA, name: 'F05 Workspace' },
    role: 'technician',
  });
  const adminContext = await call(
    'GET',
    `/api/workspaces/${workspaceA}/context`,
    sessions.get(admin.id),
  );
  assert.equal(adminContext.statusCode, 200, adminContext.body);
  assert.equal(adminContext.json().role, 'admin');
  const adminGuardForTechnician = await workspaceAuthorization.authorizeWorkspace(
    requestHeaders(sessions.get(technician.id)),
    workspaceA,
    ['admin'],
  );
  assert.equal(adminGuardForTechnician.status, 'forbidden', 'role guards must reject technicians');
  const adminGuardForAdmin = await workspaceAuthorization.authorizeWorkspace(
    requestHeaders(sessions.get(admin.id)),
    workspaceA,
    ['admin'],
  );
  assert.equal(adminGuardForAdmin.status, 'ok', 'role guards must admit an active administrator');
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceB}/context`, sessions.get(technician.id)))
      .statusCode,
    403,
    'membership in workspace A must not grant access to B',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/context`, sessions.get(workspaceBUser.id)))
      .statusCode,
    403,
    'membership in workspace B must not grant access to A',
  );
  const workspaceBContext = await call(
    'GET',
    `/api/workspaces/${workspaceB}/context`,
    sessions.get(workspaceBUser.id),
  );
  assert.equal(workspaceBContext.statusCode, 200, workspaceBContext.body);
  assert.equal(workspaceBContext.json().role, 'technician');
  assert.deepEqual(
    (await call('GET', '/api/me', sessions.get(workspaceBUser.id))).json().workspaces,
    [{ id: workspaceB, name: 'F05 Other Workspace', role: 'technician' }],
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/context`, sessions.get(orphan.id)))
      .statusCode,
    403,
    'orphan users must not access workspace context',
  );
  const orphanMe = await call('GET', '/api/me', sessions.get(orphan.id));
  assert.equal(orphanMe.statusCode, 200);
  assert.deepEqual(orphanMe.json().workspaces, []);
  assert.equal(
    (await call('GET', `/api/workspaces/${randomUUID()}/context`, sessions.get(admin.id)))
      .statusCode,
    403,
    'unknown and unauthorized workspaces must return the same denial',
  );

  runAdminSql(`UPDATE public.workspace_members SET revoked_at = clock_timestamp()
    WHERE workspace_id = '${workspaceA}' AND user_id = '${technician.id}'`);
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/context`, sessions.get(technician.id)))
      .statusCode,
    403,
    'membership revocation must apply on the next request',
  );
  assert.deepEqual(
    (await call('GET', '/api/me', sessions.get(technician.id))).json().workspaces,
    [],
  );
  console.log(
    'Workspace integration passed: bootstrap idempotency/conflicts, API restart, authenticated identity, orphan denial, tenant isolation, roles and immediate revocation.',
  );
} finally {
  if (app) await app.close();
  if (pool) await pool.end();
  if (databaseCreated) {
    docker([
      ...compose,
      'exec',
      '-T',
      'postgres',
      'dropdb',
      '--if-exists',
      '--force',
      '-U',
      'windops',
      database,
    ]);
  }
}
