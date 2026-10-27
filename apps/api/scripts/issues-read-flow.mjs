import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createIssuesService } from '../src/modules/issues/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL'])
  assert.ok(process.env[key], `${key} is required.`);

const database = `windops_i03_reads_${process.pid}`;
const compose = ['compose', '-f', 'infra/compose.dev.yml'];
const timestamp = '2026-10-26T12:00:00.000Z';
const ids = {
  workspaceA: randomUUID(),
  workspaceB: randomUUID(),
  admin: { id: randomUUID(), name: 'I03 Admin', email: `i03-admin-${process.pid}@example.invalid` },
  tech: {
    id: randomUUID(),
    name: 'I03 Technician',
    email: `i03-tech-${process.pid}@example.invalid`,
  },
  other: { id: randomUUID(), name: 'I03 Other', email: `i03-other-${process.pid}@example.invalid` },
  revoked: {
    id: randomUUID(),
    name: 'I03 Revoked',
    email: `i03-revoked-${process.pid}@example.invalid`,
  },
  orphan: {
    id: randomUUID(),
    name: 'I03 Orphan',
    email: `i03-orphan-${process.pid}@example.invalid`,
  },
};
const issueIds = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
];
const eventIds = ['00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202'];
const issueBId = randomUUID();
const parkIds = { active: randomUUID(), archived: randomUUID(), other: randomUUID() };
const turbineIds = { active: randomUUID(), archived: randomUUID(), other: randomUUID() };
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
    await migrationPool.query('DROP INDEX public.workspaces_singleton');
    await pool.query(
      `INSERT INTO public.workspaces(id, name) VALUES ($1, 'I03 A'), ($2, 'I03 B')`,
      [ids.workspaceA, ids.workspaceB],
    );
  } finally {
    await migrationPool.end();
  }

  const users = Object.values(ids).filter(
    (value) => value && typeof value === 'object' && value.id,
  );
  for (const user of users)
    await pool.query(
      `INSERT INTO public.auth_users(id, name, email, email_verified) VALUES ($1, $2, $3, true)`,
      [user.id, user.name, user.email],
    );
  const memberships = await pool.query(
    `INSERT INTO public.workspace_members(workspace_id, user_id, role, revoked_at)
     VALUES ($1, $3, 'admin', NULL), ($1, $4, 'technician', NULL),
            ($2, $5, 'admin', NULL), ($1, $6, 'technician', clock_timestamp())
     RETURNING id, user_id`,
    [ids.workspaceA, ids.workspaceB, ids.admin.id, ids.tech.id, ids.other.id, ids.revoked.id],
  );
  const membershipByUser = new Map(memberships.rows.map((row) => [row.user_id, row.id]));

  await pool.query(
    `INSERT INTO public.parks(id, workspace_id, code, deactivated_at) VALUES
       ($1, $2, 'P01', NULL), ($3, $2, 'P02', clock_timestamp()),
       ($4, $5, 'P01', NULL)`,
    [parkIds.active, ids.workspaceA, parkIds.archived, parkIds.other, ids.workspaceB],
  );
  await pool.query(
    `INSERT INTO public.turbines(id, workspace_id, park_id, code, deactivated_at) VALUES
       ($1, $2, $3, 'T01', NULL), ($4, $2, $5, 'T01', clock_timestamp()),
       ($6, $7, $8, 'T01', NULL)`,
    [
      turbineIds.active,
      ids.workspaceA,
      parkIds.active,
      turbineIds.archived,
      parkIds.archived,
      turbineIds.other,
      ids.workspaceB,
      parkIds.other,
    ],
  );

  const issueRows = [
    [issueIds[0], ids.workspaceA, parkIds.active, turbineIds.active, ids.revoked.id, 'Pending A'],
    [issueIds[1], ids.workspaceA, parkIds.archived, turbineIds.archived, ids.tech.id, 'Archived B'],
    [issueIds[2], ids.workspaceA, parkIds.active, turbineIds.active, ids.admin.id, 'Pending C'],
    [issueBId, ids.workspaceB, parkIds.other, turbineIds.other, ids.other.id, 'Other tenant'],
  ];
  for (const [issueId, workspaceId, parkId, turbineId, creatorId, text] of issueRows) {
    await pool.query(
      `INSERT INTO public.issues
         (id, workspace_id, park_id, turbine_id, creator_membership_id, creator_user_id, text, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        issueId,
        workspaceId,
        parkId,
        turbineId,
        membershipByUser.get(creatorId),
        creatorId,
        text,
        timestamp,
      ],
    );
  }

  await pool.query(
    `INSERT INTO public.issue_events
       (id, workspace_id, issue_id, actor_membership_id, actor_user_id, actor_label, type, occurred_at, after)
     VALUES ($1, $2, $3, $4, $5, 'Técnico removido', 'created', $7, $8::jsonb),
            ($6, $2, $3, $4, $5, 'Usuário excluído', 'edited', $7, $9::jsonb)`,
    [
      eventIds[0],
      ids.workspaceA,
      issueIds[0],
      membershipByUser.get(ids.revoked.id),
      ids.revoked.id,
      eventIds[1],
      timestamp,
      JSON.stringify({
        text: 'Pending A',
        parkId: parkIds.archived,
        turbineId: turbineIds.archived,
      }),
      JSON.stringify({ text: 'Pending A', parkId: parkIds.active, turbineId: turbineIds.active }),
    ],
  );
  await pool.query(
    `INSERT INTO public.issue_location_references(event_id, issue_id, workspace_id, park_id, turbine_id)
     VALUES ($1, $2, $3, $4, $5), ($6, $2, $3, $7, $8)`,
    [
      eventIds[0],
      issueIds[0],
      ids.workspaceA,
      parkIds.archived,
      turbineIds.archived,
      eventIds[1],
      parkIds.active,
      turbineIds.active,
    ],
  );

  const knownUsers = new Map(users.map((user) => [user.id, user]));
  const identity = {
    resolveAuthenticatedUser: async (requestHeaders) => {
      const user = knownUsers.get(requestHeaders['x-test-user']);
      return user && requestHeaders['x-test-step'] === 'complete' ? user : null;
    },
    resolveInvitationAcceptor: async () => null,
    validateInvitationEmail: async () => 'missing',
    getUsersByIds: async (userIds) =>
      userIds.map((userId) => knownUsers.get(userId)).filter(Boolean),
    listVerifiedDirectoryAccounts: async () => ({ items: [], nextCursor: null }),
    consumeInvitationRateLimit: async () => true,
  };
  const authorization = createWorkspaceAuthorizationService(
    pool,
    identity,
    { send: async () => {} },
    'http://localhost:5173',
  );
  const issues = createIssuesService(pool, identity);
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
    issues,
    docs: true,
  });
  await app.ready();

  const root = `/api/workspaces/${ids.workspaceA}`;
  await expectError(await app.inject(`${root}/issues`), 401, 'AUTHENTICATION_REQUIRED');
  await expectError(
    await app.inject({ url: `${root}/issues`, headers: headers(ids.admin, 'pending') }),
    401,
    'AUTHENTICATION_REQUIRED',
  );
  await expectError(
    await app.inject({ url: `${root}/issues`, headers: headers(ids.orphan) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({ url: `${root}/issues`, headers: headers(ids.revoked) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({ url: `${root}/issues`, headers: headers(ids.other) }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );

  for (const user of [ids.admin, ids.tech]) {
    const page = await app.inject({ url: `${root}/issues?limit=2`, headers: headers(user) });
    assert.equal(page.statusCode, 200, page.body);
    assert.deepEqual(
      page.json().items.map(({ id }) => id),
      issueIds.slice(0, 2),
    );
    assert.equal(page.json().nextCursor, issueIds[1]);
    const next = await app.inject({
      url: `${root}/issues?limit=2&cursor=${page.json().nextCursor}`,
      headers: headers(user),
    });
    assert.equal(next.statusCode, 200, next.body);
    assert.deepEqual(
      next.json().items.map(({ id }) => id),
      [issueIds[2]],
    );
    assert.equal(next.json().nextCursor, null);
  }

  await expectError(
    await app.inject({ url: `${root}/issues?limit=101`, headers: headers(ids.admin) }),
    400,
    'VALIDATION_ERROR',
  );
  await expectError(
    await app.inject({
      url: `${root}/issues?where=workspace_id%3D...`,
      headers: headers(ids.admin),
    }),
    400,
    'VALIDATION_ERROR',
  );
  const mismatchedLocation = await app.inject({
    url: `${root}/issues?parkId=${parkIds.active}&turbineId=${turbineIds.other}`,
    headers: headers(ids.admin),
  });
  assert.deepEqual(mismatchedLocation.json(), { items: [], nextCursor: null });
  const outsideFilter = await app.inject({
    url: `${root}/issues?parkId=${parkIds.other}`,
    headers: headers(ids.admin),
  });
  assert.deepEqual(outsideFilter.json(), { items: [], nextCursor: null });

  const detail = await app.inject({
    url: `${root}/issues/${issueIds[0]}`,
    headers: headers(ids.tech),
  });
  assert.equal(detail.statusCode, 200, detail.body);
  assert.equal(detail.json().creator.id, ids.revoked.id);
  assert.equal(detail.json().creatorMembershipId, membershipByUser.get(ids.revoked.id));
  const archivedDetail = await app.inject({
    url: `${root}/issues/${issueIds[1]}`,
    headers: headers(ids.admin),
  });
  assert.equal(archivedDetail.statusCode, 200, archivedDetail.body);
  assert.equal(archivedDetail.json().parkId, parkIds.archived);
  assert.equal(archivedDetail.json().turbineId, turbineIds.archived);
  const archivedList = await app.inject({
    url: `${root}/issues?parkId=${parkIds.archived}&turbineId=${turbineIds.archived}`,
    headers: headers(ids.admin),
  });
  assert.equal(archivedList.statusCode, 200, archivedList.body);
  assert.deepEqual(
    archivedList.json().items.map(({ id }) => id),
    [issueIds[1]],
  );
  await expectError(
    await app.inject({ url: `${root}/issues/${issueBId}`, headers: headers(ids.admin) }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      url: `${root}/issues?cursor=${issueBId}`,
      headers: headers(ids.admin),
    }),
    400,
    'INVALID_CURSOR',
  );

  const eventPage = await app.inject({
    url: `${root}/issues/${issueIds[0]}/events?limit=1`,
    headers: headers(ids.tech),
  });
  assert.equal(eventPage.statusCode, 200, eventPage.body);
  assert.equal(eventPage.json().items[0].actorMembershipId, membershipByUser.get(ids.revoked.id));
  assert.equal(eventPage.json().items[0].actorLabel, 'Técnico removido');
  const eventPage2 = await app.inject({
    url: `${root}/issues/${issueIds[0]}/events?limit=1&cursor=${eventIds[0]}`,
    headers: headers(ids.tech),
  });
  assert.equal(eventPage2.statusCode, 200, eventPage2.body);
  assert.equal(eventPage2.json().items[0].id, eventIds[1]);
  assert.equal(eventPage2.json().items[0].actorLabel, 'Usuário excluído');
  await expectError(
    await app.inject({
      url: `${root}/issues/${issueIds[0]}/events?cursor=${randomUUID()}`,
      headers: headers(ids.admin),
    }),
    400,
    'INVALID_CURSOR',
  );
  await expectError(
    await app.inject({
      url: `${root}/issues/${issueBId}/events`,
      headers: headers(ids.admin),
    }),
    404,
    'RESOURCE_NOT_FOUND',
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const archivedHistorical = await issues.getEquipmentIssueReferences(
      client,
      ids.workspaceA,
      parkIds.archived,
      turbineIds.archived,
    );
    assert.deepEqual(archivedHistorical, { hasReferences: true, hasOpenIssues: true });
    const archivedPark = await issues.getEquipmentIssueReferences(
      client,
      ids.workspaceA,
      parkIds.archived,
    );
    assert.deepEqual(archivedPark, { hasReferences: true, hasOpenIssues: true });
    const otherTenant = await issues.getEquipmentIssueReferences(
      client,
      ids.workspaceA,
      parkIds.other,
      turbineIds.other,
    );
    assert.deepEqual(otherTenant, { hasReferences: false, hasOpenIssues: false });
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }

  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/events']);
  console.log(
    'Authorized issue list/detail/event reads, tenant filters, deterministic pagination, archived equipment visibility, revoked actor history and transactional equipment-reference queries verified.',
  );
} finally {
  if (app) await app.close();
  if (pool) await pool.end();
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
