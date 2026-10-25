import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createIdentityProvider, createIdentityService } from '../src/modules/identity/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';
import { parseEnvironment } from '../src/platform/config.ts';
import { createEmailSender } from '../src/platform/email.ts';

const localEnvironment =
  config({
    path: fileURLToPath(new URL('../../../.env', import.meta.url)),
    quiet: true,
    processEnv: {},
  }).parsed ?? {};
const env = parseEnvironment({ ...localEnvironment, ...process.env });
assert.ok(env.SMTP_URL, 'SMTP_URL is required for Mailpit invitation integration.');
const smtpEmailSender = createEmailSender({ ...env, EMAIL_TRANSPORT: 'smtp' });
const mailpitUrl = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
const database = `windops_f05_workspace_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const testSecret = randomBytes(48).toString('base64url');
const bootstrapSql = readFileSync(new URL('./bootstrap-workspace.sql', import.meta.url));
const workspaceA = randomUUID();
const workspaceB = randomUUID();
const legacyUserId = randomUUID();
const admin = { id: randomUUID(), email: `f05-admin-${process.pid}@example.invalid` };
const technician = { id: randomUUID(), email: `f05-tech-${process.pid}@example.invalid` };
const workspaceBUser = { id: randomUUID(), email: `f05-other-${process.pid}@example.invalid` };
const orphan = { id: randomUUID(), email: `f05-orphan-${process.pid}@example.invalid` };
const revokedOnly = { id: randomUUID(), email: `f05-revoked-only-${process.pid}@example.invalid` };
const revokedPlusActive = {
  id: randomUUID(),
  email: `f05-revoked-plus-active-${process.pid}@example.invalid`,
};
const unverified = { id: randomUUID(), email: `f05-unverified-${process.pid}@example.invalid` };
const pendingUser = { id: randomUUID(), email: `f05-pending-${process.pid}@example.invalid` };
const sessions = new Map();
const trackedMailIds = new Set();
const seenMailIds = new Set();
let databaseCreated = false;
let pool;
let replicationPool;
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
      MIGRATION_DATABASE_URL: connectionFor(
        process.env.MIGRATION_DATABASE_URL ?? localEnvironment.MIGRATION_DATABASE_URL,
      ),
    },
    stdio: 'inherit',
  });
}

async function installPreInvitationSchemaWithData() {
  const migrationUrl =
    process.env.MIGRATION_DATABASE_URL ?? localEnvironment.MIGRATION_DATABASE_URL;
  const migrationPool = new Pool({ connectionString: connectionFor(migrationUrl), max: 1 });
  const client = await migrationPool.connect();
  const journal = JSON.parse(
    readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
  );
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`);
    for (const entry of journal.entries.filter(({ idx }) => idx < 2)) {
      const sql = readFileSync(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint').filter((part) => part.trim())) {
        await client.query(statement);
      }
      await client.query(
        'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [createHash('sha256').update(sql).digest('hex'), entry.when],
      );
    }
    await client.query(`INSERT INTO public.workspaces (id, name) VALUES ($1, 'F05 Workspace')`, [
      workspaceA,
    ]);
    await client.query(
      `INSERT INTO public.auth_users (id, name, email, email_verified)
       VALUES ($1, 'Legacy member', $2, true)`,
      [legacyUserId, `f05-legacy-${process.pid}@example.invalid`],
    );
    await client.query(
      `INSERT INTO public.workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'technician')`,
      [workspaceA, legacyUserId],
    );
  } finally {
    client.release();
    await migrationPool.end();
  }
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
  const values = [
    admin,
    technician,
    workspaceBUser,
    orphan,
    unverified,
    pendingUser,
    revokedOnly,
    revokedPlusActive,
  ]
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
  return { id, token };
}

async function waitForMail(subject, recipient) {
  const until = Date.now() + 12_000;
  while (Date.now() < until) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`);
    assert.equal(response.status, 200, 'Mailpit API must be available');
    const result = await response.json();
    const message = result.messages
      ?.filter(
        (entry) =>
          entry.Subject === subject &&
          !seenMailIds.has(entry.ID) &&
          JSON.stringify(entry.To).toLowerCase().includes(recipient.toLowerCase()),
      )
      .sort((left, right) => new Date(right.Created) - new Date(left.Created))[0];
    if (message) {
      trackedMailIds.add(message.ID);
      seenMailIds.add(message.ID);
      const detail = await fetch(`${mailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`);
      assert.equal(detail.status, 200, 'Mailpit message details must be readable');
      return detail.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for test email: ${subject}`);
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

function extractInvitationToken(message) {
  const text = message?.text ?? message?.Text ?? '';
  const url = text.match(/https?:\/\/\S+/)?.[0];
  assert.ok(url, 'invitation email must contain a link');
  const parsed = new URL(url);
  assert.equal(parsed.origin, env.APP_ORIGIN, 'invitation links must use the configured origin');
  assert.match(parsed.hash, /^#token=[A-Za-z0-9_-]{43}$/);
  return parsed.hash.slice('#token='.length);
}

try {
  docker([...compose, 'exec', '-T', 'postgres', 'createdb', '-U', 'windops', database]);
  databaseCreated = true;
  provisionRoles();
  await installPreInvitationSchemaWithData();
  runMigrations();
  runMigrations();
  provisionRoles();
  pool = new Pool({ connectionString: connectionFor(env.DATABASE_URL), max: 5 });
  replicationPool = new Pool({
    connectionString: connectionFor(
      process.env.ELECTRIC_DATABASE_URL ?? localEnvironment.ELECTRIC_DATABASE_URL,
    ),
    max: 1,
  });
  await pool.query('SELECT id FROM public.workspace_invitations LIMIT 0');
  await assert.rejects(
    replicationPool.query('SELECT id FROM public.workspace_invitations LIMIT 0'),
    (error) => error.code === '42501',
    'Electric replication role must not read invitations',
  );
  assert.equal(
    psqlCount(
      `SELECT count(*) FROM pg_publication_tables
       WHERE pubname = 'electric_publication_default' AND schemaname = 'public'
         AND tablename = 'workspace_invitations'`,
    ),
    '0',
    'workspace invitations must not enter the Electric publication',
  );
  assert.equal(
    (
      await pool.query(
        `SELECT w.name, m.role FROM public.workspaces w
         JOIN public.workspace_members m ON m.workspace_id = w.id
         WHERE w.id = $1 AND m.user_id = $2`,
        [workspaceA, legacyUserId],
      )
    ).rows[0]?.role,
    'technician',
    'migration must preserve the pre-existing workspace membership',
  );
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
  runAdminSql(`INSERT INTO public.workspace_members (workspace_id, user_id, role, revoked_at)
    VALUES ('${workspaceA}', '${revokedOnly.id}', 'technician', clock_timestamp()),
           ('${workspaceA}', '${revokedPlusActive.id}', 'technician', clock_timestamp())`);
  const invitationId = randomUUID();
  await pool.query(
    `INSERT INTO public.workspace_invitations
      (id, workspace_id, email, role, invited_by_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, 'technician', $4, $5, now() + interval '48 hours')`,
    [invitationId, workspaceA, 'new-tech@example.invalid', admin.id, randomBytes(32)],
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO public.workspace_invitations
        (workspace_id, email, role, invited_by_user_id, token_hash, expires_at)
       VALUES ($1, 'new-tech@example.invalid', 'technician', $2, $3, now() + interval '48 hours')`,
      [workspaceA, admin.id, randomBytes(32)],
    ),
    (error) => error.code === '23505',
    'only one nonterminal invitation per normalized workspace email is allowed',
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO public.workspace_invitations
        (workspace_id, email, role, invited_by_user_id, token_hash, expires_at)
       VALUES ($1, ' INVALID@Example.com ', 'technician', $2, $3, now() + interval '48 hours')`,
      [workspaceA, admin.id, randomBytes(32)],
    ),
    (error) => error.code === '23514',
    'database rejects invitation emails that bypass contract normalization',
  );
  await assert.rejects(
    pool.query(
      `INSERT INTO public.workspace_invitations
        (workspace_id, email, role, invited_by_user_id, token_hash, expires_at)
       VALUES ($1, 'bad-hash@example.invalid', 'technician', $2, $3, now() + interval '48 hours')`,
      [workspaceA, admin.id, randomBytes(31)],
    ),
    (error) => error.code === '23514',
    'database requires a 32-byte token digest',
  );
  await assert.rejects(
    pool.query(
      `UPDATE public.workspace_invitations SET superseded_by_invitation_id = $2 WHERE id = $1`,
      [invitationId, randomUUID()],
    ),
    (error) => error.code === '23503',
    'superseding invite must reference an invitation in the same workspace',
  );
  await pool.query('DELETE FROM public.workspace_invitations WHERE id = $1', [invitationId]);
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
  runAdminSql(`INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('${workspaceB}', '${revokedPlusActive.id}', 'technician')`);
  createSession(admin);
  createSession(technician);
  createSession(workspaceBUser);
  createSession(orphan);
  createSession(unverified);
  const pendingSession = createSession(pendingUser, false);
  createSession(revokedOnly);
  createSession(revokedPlusActive);

  const sentInvitationEmails = [];
  let failInvitationDelivery = false;
  let sendViaMailpit = false;
  const emailSender = {
    async send(message) {
      sentInvitationEmails.push(message);
      if (failInvitationDelivery) throw new Error('simulated delivery failure');
      if (sendViaMailpit) await smtpEmailSender.send(message);
    },
  };
  const identity = createIdentityProvider(pool, env.APP_ORIGIN, testSecret, emailSender);
  const workspaceAuthorization = createWorkspaceAuthorizationService(
    pool,
    createIdentityService(identity, pool),
    emailSender,
    env.APP_ORIGIN,
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
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/directory`, sessions.get(pendingUser.id)))
      .statusCode,
    401,
    'sessions before the second step must not access the administrative directory',
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

  const members = await call(
    'GET',
    `/api/workspaces/${workspaceA}/members`,
    sessions.get(admin.id),
  );
  assert.equal(members.statusCode, 200, members.body);
  assert.equal(members.json().items.length, 3);
  assert.deepEqual(
    Object.keys(members.json().items[0].user).sort(),
    ['email', 'id', 'name'],
    'member DTOs must not expose authentication fields',
  );
  const membersFirstPage = await call(
    'GET',
    `/api/workspaces/${workspaceA}/members?limit=1`,
    sessions.get(admin.id),
  );
  assert.equal(membersFirstPage.json().items.length, 1);
  assert.ok(membersFirstPage.json().nextCursor);
  const membersSecondPage = await call(
    'GET',
    `/api/workspaces/${workspaceA}/members?limit=1&cursor=${membersFirstPage.json().nextCursor}`,
    sessions.get(admin.id),
  );
  assert.equal(membersSecondPage.json().items.length, 1);
  assert.notEqual(
    membersSecondPage.json().items[0].membershipId,
    membersFirstPage.json().items[0].membershipId,
  );
  const directory = await call(
    'GET',
    `/api/workspaces/${workspaceA}/directory?limit=100`,
    sessions.get(admin.id),
  );
  assert.equal(directory.statusCode, 200, directory.body);
  assert.deepEqual(
    directory
      .json()
      .items.map((account) => account.email)
      .sort(),
    [orphan.email, pendingUser.email, revokedOnly.email].sort(),
    'directory includes verified accounts without any active membership and excludes other workspace members',
  );
  assert.equal(
    directory.json().items.some((account) => account.id === revokedPlusActive.id),
    false,
    'a revoked link in this workspace does not make a user orphan while another workspace link is active',
  );
  assert.equal(
    directory.json().items.some((account) => account.id === unverified.id),
    false,
    'unverified accounts are omitted from the administrative directory',
  );
  assert.deepEqual(
    Object.keys(directory.json().items[0]).sort(),
    ['createdAt', 'email', 'id', 'name'],
    'directory DTOs contain only minimal identity fields',
  );
  const hiddenAccountSearch = await call(
    'GET',
    `/api/workspaces/${workspaceA}/directory?search=${encodeURIComponent(workspaceBUser.email)}`,
    sessions.get(admin.id),
  );
  assert.deepEqual(hiddenAccountSearch.json(), { items: [], nextCursor: null });
  const orphanSearch = await call(
    'GET',
    `/api/workspaces/${workspaceA}/directory?search=${encodeURIComponent(orphan.email)}`,
    sessions.get(admin.id),
  );
  assert.deepEqual(
    orphanSearch.json().items.map((account) => account.id),
    [orphan.id],
  );
  const directoryFirstPage = await call(
    'GET',
    `/api/workspaces/${workspaceA}/directory?limit=1`,
    sessions.get(admin.id),
  );
  const directorySecondPage = await call(
    'GET',
    `/api/workspaces/${workspaceA}/directory?limit=1&cursor=${directoryFirstPage.json().nextCursor}`,
    sessions.get(admin.id),
  );
  assert.equal(directoryFirstPage.json().items.length, 1);
  assert.equal(directorySecondPage.json().items.length, 1);
  assert.notEqual(
    directorySecondPage.json().items[0].id,
    directoryFirstPage.json().items[0].id,
    'directory cursor pagination must not repeat accounts',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/members`, sessions.get(technician.id)))
      .statusCode,
    403,
    'technicians must not access the member list',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/directory`, sessions.get(technician.id)))
      .statusCode,
    403,
    'technicians must not access the administrative directory',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceB}/directory`, sessions.get(admin.id)))
      .statusCode,
    403,
    'an admin must not use their workspace A membership to query workspace B',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${randomUUID()}/directory`, sessions.get(admin.id)))
      .statusCode,
    403,
    'unknown workspaces must not disclose whether a directory exists',
  );
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

  const createInvitation = (email, token = sessions.get(admin.id)) =>
    call('POST', `/api/workspaces/${workspaceA}/invitations`, token, { email });
  const duplicateInvites = await Promise.all([
    createInvitation(technician.email),
    createInvitation(technician.email),
  ]);
  assert.deepEqual(
    duplicateInvites.map((response) => response.statusCode).sort(),
    [201, 409],
    'concurrent creates for one workspace/email must produce one invitation',
  );
  const existingMemberInvite = duplicateInvites.find((response) => response.statusCode === 201);
  assert.ok(existingMemberInvite);
  assert.equal(existingMemberInvite.json().role, 'technician');
  assert.equal(existingMemberInvite.json().deliveryStatus, 'sent');
  assert.equal(existingMemberInvite.json().status, 'pending');
  assert.equal('token' in existingMemberInvite.json(), false);
  const existingMemberToken = extractInvitationToken(sentInvitationEmails.at(-1));
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(technician.id), {
        token: existingMemberToken,
      })
    ).statusCode,
    409,
    'accepting an invitation must not change the role of an active member',
  );
  assert.equal(
    psqlCount(
      `SELECT role FROM public.workspace_members
       WHERE workspace_id = '${workspaceA}' AND user_id = '${technician.id}' AND revoked_at IS NULL`,
    ),
    'technician',
  );
  assert.equal(
    (await createInvitation(orphan.email, sessions.get(technician.id))).statusCode,
    403,
    'technicians cannot issue invitations',
  );
  assert.equal(
    (
      await call('POST', `/api/workspaces/${workspaceA}/invitations`, sessions.get(admin.id), {
        email: technician.email,
        role: 'owner',
      })
    ).statusCode,
    400,
    'the request cannot forge an unsupported role',
  );

  const orphanInviteResponse = await createInvitation(orphan.email);
  assert.equal(orphanInviteResponse.statusCode, 201, orphanInviteResponse.body);
  assert.ok(
    Math.abs(
      Date.parse(orphanInviteResponse.json().expiresAt) -
        Date.parse(orphanInviteResponse.json().createdAt) -
        48 * 60 * 60 * 1000,
    ) < 1000,
    'issued invitations expire exactly 48 hours after creation',
  );
  const orphanInviteId = orphanInviteResponse.json().id;
  const orphanInviteToken = extractInvitationToken(sentInvitationEmails.at(-1));
  const tokenDigest = await pool.query(
    'SELECT token_hash FROM public.workspace_invitations WHERE id = $1',
    [orphanInviteId],
  );
  assert.deepEqual(
    tokenDigest.rows[0]?.token_hash,
    createHash('sha256').update(orphanInviteToken).digest(),
    'database stores only the SHA-256 token digest',
  );
  assert.equal(
    (
      await call(
        'GET',
        `/api/invitations/accept?token=${orphanInviteToken}`,
        sessions.get(orphan.id),
      )
    ).statusCode,
    404,
    'GET requests do not consume invitation tokens',
  );
  assert.equal(
    psqlCount(
      `SELECT count(*) FROM public.workspace_invitations
       WHERE id = '${orphanInviteId}' AND accepted_at IS NULL`,
    ),
    '1',
  );
  assert.equal(
    (await call('POST', '/api/invitations/accept', undefined, { token: orphanInviteToken }))
      .statusCode,
    401,
  );
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(pendingUser.id), {
        token: orphanInviteToken,
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(unverified.id), {
        token: orphanInviteToken,
      })
    ).statusCode,
    403,
    'an unverified account cannot accept an invitation',
  );
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(admin.id), {
        token: orphanInviteToken,
      })
    ).statusCode,
    422,
    'the signed-in email must match the invitation',
  );
  const orphanAccepted = await call('POST', '/api/invitations/accept', sessions.get(orphan.id), {
    token: orphanInviteToken,
  });
  assert.equal(orphanAccepted.statusCode, 200, orphanAccepted.body);
  assert.deepEqual(orphanAccepted.json(), {
    workspace: { id: workspaceA, name: 'F05 Workspace' },
    role: 'technician',
  });
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(orphan.id), {
        token: orphanInviteToken,
      })
    ).statusCode,
    409,
    'acceptance replay must fail',
  );
  assert.equal(
    psqlCount(
      `SELECT count(*) FROM public.workspace_members
       WHERE workspace_id = '${workspaceA}' AND user_id = '${orphan.id}' AND revoked_at IS NULL`,
    ),
    '1',
    'acceptance creates exactly one active membership',
  );

  const resendTargetInvite = await createInvitation(revokedPlusActive.email);
  assert.equal(resendTargetInvite.statusCode, 201, resendTargetInvite.body);
  const staleToken = extractInvitationToken(sentInvitationEmails.at(-1));
  const resendPath = `/api/workspaces/${workspaceA}/invitations/${resendTargetInvite.json().id}/resend`;
  const concurrentResends = await Promise.all([
    call('POST', resendPath, sessions.get(admin.id)),
    call('POST', resendPath, sessions.get(admin.id)),
  ]);
  assert.deepEqual(
    concurrentResends.map((response) => response.statusCode).sort(),
    [200, 409],
    'concurrent resends must atomically supersede exactly one prior invitation',
  );
  const latestToken = extractInvitationToken(sentInvitationEmails.at(-1));
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(revokedPlusActive.id), {
        token: staleToken,
      })
    ).statusCode,
    409,
    'a token from before resend must be unusable',
  );
  const resentAcceptance = await call(
    'POST',
    '/api/invitations/accept',
    sessions.get(revokedPlusActive.id),
    { token: latestToken },
  );
  assert.equal(resentAcceptance.statusCode, 200, resentAcceptance.body);

  failInvitationDelivery = true;
  const failedDelivery = await createInvitation(revokedOnly.email);
  assert.equal(failedDelivery.statusCode, 502);
  assert.equal(failedDelivery.json().error.code, 'EMAIL_DELIVERY_FAILED');
  const failedToken = extractInvitationToken(sentInvitationEmails.at(-1));
  const failedInvitationRow = await pool.query(
    `SELECT id, delivery_status, revoked_at FROM public.workspace_invitations
     WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
    [revokedOnly.email],
  );
  assert.equal(failedInvitationRow.rows[0]?.delivery_status, 'failed');
  assert.ok(failedInvitationRow.rows[0]?.revoked_at);
  failInvitationDelivery = false;
  const retriedDelivery = await createInvitation(revokedOnly.email);
  assert.equal(retriedDelivery.statusCode, 201, retriedDelivery.body);
  const retryToken = extractInvitationToken(sentInvitationEmails.at(-1));
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(revokedOnly.id), {
        token: failedToken,
      })
    ).statusCode,
    409,
    'failed delivery tokens stay revoked after a retry',
  );
  const concurrentAcceptances = await Promise.all([
    call('POST', '/api/invitations/accept', sessions.get(revokedOnly.id), { token: retryToken }),
    call('POST', '/api/invitations/accept', sessions.get(revokedOnly.id), { token: retryToken }),
  ]);
  assert.deepEqual(
    concurrentAcceptances.map((response) => response.statusCode).sort(),
    [200, 409],
    'simultaneous acceptance must reactivate one membership and consume once',
  );
  assert.equal(
    psqlCount(
      `SELECT count(*) FROM public.workspace_members
       WHERE workspace_id = '${workspaceA}' AND user_id = '${revokedOnly.id}' AND revoked_at IS NULL`,
    ),
    '1',
    'acceptance reactivates the existing membership without creating a duplicate',
  );

  sendViaMailpit = true;
  const mailpitInvite = await createInvitation(pendingUser.email);
  assert.equal(mailpitInvite.statusCode, 201, mailpitInvite.body);
  const invitationEmail = await waitForMail('Convite para o Wind Ops', pendingUser.email);
  const postOtpInviteToken = extractInvitationToken(invitationEmail);
  await identity.challenges.issueForNewSession(pendingSession.id, pendingUser.email);
  const otpEmail = await waitForMail('Seu código de acesso ao Wind Ops', pendingUser.email);
  const otp = (otpEmail.Text ?? '').match(/\b\d{8}\b/)?.[0];
  assert.ok(otp, 'the Mailpit second-step message must include its code');
  await identity.challenges.verify(pendingSession.id, otp);
  const acceptedAfterOtp = await call(
    'POST',
    '/api/invitations/accept',
    sessions.get(pendingUser.id),
    { token: postOtpInviteToken },
  );
  assert.equal(acceptedAfterOtp.statusCode, 200, acceptedAfterOtp.body);

  const expiryTestInvite = await createInvitation(pendingUser.email);
  assert.equal(expiryTestInvite.statusCode, 201, expiryTestInvite.body);
  const expiryEmail = await waitForMail('Convite para o Wind Ops', pendingUser.email);
  const expiryTestToken = extractInvitationToken(expiryEmail);
  await pool.query(
    `UPDATE public.workspace_invitations SET expires_at = clock_timestamp() WHERE id = $1`,
    [expiryTestInvite.json().id],
  );
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(pendingUser.id), {
        token: expiryTestToken,
      })
    ).statusCode,
    410,
    'expiry at the database clock boundary rejects acceptance',
  );
  sendViaMailpit = false;
  const deliveryThrottled = await createInvitation(`rate-limited-${process.pid}@example.invalid`);
  assert.equal(
    deliveryThrottled.statusCode,
    429,
    'admin invitation delivery is limited to ten attempts per hour',
  );
  const membersBeforeAdministration = await call(
    'GET',
    `/api/workspaces/${workspaceA}/members?limit=100`,
    sessions.get(admin.id),
  );
  const membershipFor = (userId) =>
    membersBeforeAdministration.json().items.find((item) => item.user.id === userId);
  const promotedMembership = membershipFor(revokedPlusActive.id);
  assert.ok(promotedMembership);
  const promotePath = `/api/workspaces/${workspaceA}/members/${promotedMembership.membershipId}/role`;
  const promoted = await call('PATCH', promotePath, sessions.get(admin.id), {
    role: 'admin',
    expectedRevision: promotedMembership.revision,
  });
  assert.equal(promoted.statusCode, 200, promoted.body);
  assert.equal(promoted.json().role, 'admin');
  const repeatedPromotion = await call('PATCH', promotePath, sessions.get(admin.id), {
    role: 'admin',
    expectedRevision: promotedMembership.revision,
  });
  assert.equal(repeatedPromotion.statusCode, 200, repeatedPromotion.body);
  assert.equal(repeatedPromotion.json().revision, promoted.json().revision);
  const adminCannotBeRemoved = await call(
    'POST',
    `/api/workspaces/${workspaceA}/members/${promotedMembership.membershipId}/revoke`,
    sessions.get(admin.id),
    { expectedRevision: promoted.json().revision },
  );
  assert.equal(adminCannotBeRemoved.statusCode, 409);
  const selfRemoval = await call(
    'POST',
    `/api/workspaces/${workspaceA}/members/${membershipFor(admin.id).membershipId}/revoke`,
    sessions.get(admin.id),
    { expectedRevision: membershipFor(admin.id).revision },
  );
  assert.equal(selfRemoval.statusCode, 409);
  const foreignMembership = await pool.query(
    `SELECT id FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceB, workspaceBUser.id],
  );
  assert.equal(
    (
      await call(
        'POST',
        `/api/workspaces/${workspaceA}/members/${foreignMembership.rows[0].id}/revoke`,
        sessions.get(admin.id),
        { expectedRevision: 1 },
      )
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await call(
        'POST',
        `/api/workspaces/${workspaceA}/members/${membershipFor(technician.id).membershipId}/revoke`,
        sessions.get(technician.id),
        { expectedRevision: membershipFor(technician.id).revision },
      )
    ).statusCode,
    403,
  );

  const racedMembership = membershipFor(orphan.id);
  assert.ok(racedMembership);
  const racedPath = `/api/workspaces/${workspaceA}/members/${racedMembership.membershipId}`;
  const racedChanges = await Promise.all([
    call('PATCH', `${racedPath}/role`, sessions.get(admin.id), {
      role: 'admin',
      expectedRevision: racedMembership.revision,
    }),
    call('POST', `${racedPath}/revoke`, sessions.get(admin.id), {
      expectedRevision: racedMembership.revision,
    }),
  ]);
  assert.deepEqual(
    racedChanges.map((response) => response.statusCode).sort(),
    [200, 409],
    'promotion and revocation races must have one winner',
  );

  const technicianMembership = membershipFor(technician.id);
  const technicianRevokePath = `/api/workspaces/${workspaceA}/members/${technicianMembership.membershipId}/revoke`;
  const revokedMembership = await call('POST', technicianRevokePath, sessions.get(admin.id), {
    expectedRevision: technicianMembership.revision,
  });
  assert.equal(revokedMembership.statusCode, 200, revokedMembership.body);
  const retriedRevocation = await call('POST', technicianRevokePath, sessions.get(admin.id), {
    expectedRevision: technicianMembership.revision,
  });
  assert.equal(retriedRevocation.statusCode, 200, retriedRevocation.body);
  assert.equal(retriedRevocation.json().revision, revokedMembership.json().revision);
  assert.ok(
    (
      await pool.query(`SELECT revoked_at FROM public.workspace_invitations WHERE id = $1`, [
        existingMemberInvite.json().id,
      ])
    ).rows[0].revoked_at,
    'revoking a member must atomically invalidate invitations for that email',
  );
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
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(technician.id), {
        token: existingMemberToken,
      })
    ).statusCode,
    409,
    'an invite issued before removal cannot restore the revoked membership',
  );
  const reactivationToken = randomBytes(32).toString('base64url');
  const reactivationInviteId = randomUUID();
  await pool.query(
    `INSERT INTO public.workspace_invitations
       (id, workspace_id, email, role, invited_by_user_id, token_hash, created_at,
        expires_at, delivery_status, sent_at)
     VALUES ($1, $2, $3, 'technician', $4, $5, clock_timestamp(),
             clock_timestamp() + interval '48 hours', 'sent', clock_timestamp())`,
    [
      reactivationInviteId,
      workspaceA,
      technician.email,
      admin.id,
      createHash('sha256').update(reactivationToken).digest(),
    ],
  );
  assert.equal(
    (
      await call('POST', '/api/invitations/accept', sessions.get(technician.id), {
        token: reactivationToken,
      })
    ).statusCode,
    200,
    'a fresh invitation can reactivate a revoked membership',
  );
  assert.equal(
    (
      await call('POST', technicianRevokePath, sessions.get(admin.id), {
        expectedRevision: technicianMembership.revision,
      })
    ).statusCode,
    409,
    'a stale retry cannot revoke membership reactivated by a newer invitation',
  );
  const raceInviteToken = randomBytes(32).toString('base64url');
  const raceInviteId = randomUUID();
  await pool.query(
    `INSERT INTO public.workspace_invitations
       (id, workspace_id, email, role, invited_by_user_id, token_hash, created_at,
        expires_at, delivery_status, sent_at)
     VALUES ($1, $2, $3, 'technician', $4, $5, clock_timestamp(),
             clock_timestamp() + interval '48 hours', 'sent', clock_timestamp())`,
    [
      raceInviteId,
      workspaceA,
      revokedOnly.email,
      admin.id,
      createHash('sha256').update(raceInviteToken).digest(),
    ],
  );
  const currentMembers = await call(
    'GET',
    `/api/workspaces/${workspaceA}/members?limit=100`,
    sessions.get(admin.id),
  );
  const revokeOnlyMembership = currentMembers
    .json()
    .items.find((item) => item.user.id === revokedOnly.id);
  assert.ok(revokeOnlyMembership);
  const acceptAndRevoke = await Promise.all([
    call('POST', '/api/invitations/accept', sessions.get(revokedOnly.id), {
      token: raceInviteToken,
    }),
    call(
      'POST',
      `/api/workspaces/${workspaceA}/members/${revokeOnlyMembership.membershipId}/revoke`,
      sessions.get(admin.id),
      { expectedRevision: revokeOnlyMembership.revision },
    ),
  ]);
  assert.deepEqual(
    acceptAndRevoke.map((response) => response.statusCode).sort(),
    [200, 409],
    'acceptance and revocation must serialize, with revocation taking effect exactly once',
  );
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/context`, sessions.get(revokedOnly.id)))
      .statusCode,
    403,
    'a concurrent invitation acceptance cannot bypass completed revocation',
  );
  runAdminSql(`UPDATE public.workspace_members SET revoked_at = clock_timestamp()
    WHERE workspace_id = '${workspaceA}' AND user_id = '${admin.id}'`);
  assert.equal(
    (await call('GET', `/api/workspaces/${workspaceA}/directory`, sessions.get(admin.id)))
      .statusCode,
    403,
    'an admin whose membership was revoked must lose directory access immediately',
  );
  const invalidTokenStatuses = [];
  for (let attempt = 0; attempt < 35; attempt++) {
    const response = await call('POST', '/api/invitations/accept', sessions.get(pendingUser.id), {
      token: randomBytes(32).toString('base64url'),
    });
    invalidTokenStatuses.push(response.statusCode);
  }
  assert.ok(invalidTokenStatuses.includes(404), 'unknown token attempts are indistinguishable');
  assert.equal(
    invalidTokenStatuses.at(-1),
    429,
    'invitation acceptance attempts are limited per client IP',
  );
  console.log(
    'Workspace integration passed: invitations, Mailpit second step, expiry, rate limits, membership promotion/revocation, concurrency and tenant isolation.',
  );
} finally {
  if (app) await app.close();
  if (pool) await pool.end();
  if (replicationPool) await replicationPool.end();
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
  for (const id of trackedMailIds) {
    await fetch(`${mailpitUrl}/api/v1/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
}
