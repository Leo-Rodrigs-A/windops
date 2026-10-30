import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createAuditService } from '../src/modules/audit/index.ts';
import { createIssuesService } from '../src/modules/issues/index.ts';
import {
  createNotificationsService,
  createNotificationWorker,
} from '../src/modules/notifications/index.ts';
import { createParksCatalogService } from '../src/modules/parks/index.ts';
import { createSyncService } from '../src/modules/sync/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';
import { verifyIssueQueries } from './issues-query-matrix.mjs';

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
  raceTech: {
    id: randomUUID(),
    name: 'I03 Race Technician',
    email: `i03-race-tech-${process.pid}@example.invalid`,
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
const issueIdsByRecency = [...issueIds].reverse();
const eventIds = ['00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202'];
const issueBId = randomUUID();
const parkIds = {
  active: randomUUID(),
  archived: randomUUID(),
  other: randomUUID(),
  destination: randomUUID(),
};
const turbineIds = {
  active: randomUUID(),
  archived: randomUUID(),
  other: randomUUID(),
  destination: randomUUID(),
};
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

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
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
            ($2, $5, 'admin', NULL), ($1, $6, 'technician', clock_timestamp()),
            ($1, $7, 'technician', NULL)
     RETURNING id, user_id`,
    [
      ids.workspaceA,
      ids.workspaceB,
      ids.admin.id,
      ids.tech.id,
      ids.other.id,
      ids.revoked.id,
      ids.raceTech.id,
    ],
  );
  const membershipByUser = new Map(memberships.rows.map((row) => [row.user_id, row.id]));

  await pool.query(
    `INSERT INTO public.parks(id, workspace_id, code, deactivated_at) VALUES
       ($1, $2, 'P01', NULL), ($3, $2, 'P02', clock_timestamp()),
       ($4, $5, 'P01', NULL), ($6, $2, 'P03', NULL)`,
    [
      parkIds.active,
      ids.workspaceA,
      parkIds.archived,
      parkIds.other,
      ids.workspaceB,
      parkIds.destination,
    ],
  );
  await pool.query(
    `INSERT INTO public.turbines(id, workspace_id, park_id, code, deactivated_at) VALUES
       ($1, $2, $3, 'T01', NULL), ($4, $2, $5, 'T01', clock_timestamp()),
       ($6, $7, $8, 'T01', NULL), ($9, $2, $10, 'T01', NULL)`,
    [
      turbineIds.active,
      ids.workspaceA,
      parkIds.active,
      turbineIds.archived,
      parkIds.archived,
      turbineIds.other,
      ids.workspaceB,
      parkIds.other,
      turbineIds.destination,
      parkIds.destination,
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
  const sync = createSyncService();
  const parks = createParksCatalogService(pool, authorization, sync);
  const notifications = createNotificationsService(pool, 'A'.repeat(87));
  const issues = createIssuesService(pool, identity, {
    authorization,
    parks,
    audit: createAuditService(notifications),
    sync,
  });
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
    parksCatalog: parks,
    issues,
    notifications,
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
  const pushStatus = await app.inject({
    url: `${root}/notifications/push/status`,
    headers: headers(ids.admin),
  });
  assert.deepEqual(pushStatus.json(), { enabled: true, publicKey: 'A'.repeat(87) });
  const deviceId = randomUUID();
  const pushBody = {
    deviceId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
    keys: { p256dh: 'public-key', auth: 'auth-secret' },
  };
  const subscribed = await app.inject({
    method: 'PUT',
    url: `${root}/notifications/push-subscriptions`,
    headers: headers(ids.admin),
    payload: pushBody,
  });
  assert.equal(subscribed.statusCode, 200, subscribed.body);
  const repeatedSubscription = await app.inject({
    method: 'PUT',
    url: `${root}/notifications/push-subscriptions`,
    headers: headers(ids.admin),
    payload: pushBody,
  });
  assert.deepEqual(repeatedSubscription.json(), subscribed.json());
  const subscriptionCount = await pool.query(
    `SELECT count(*)::int AS count FROM public.push_subscriptions
     WHERE workspace_id = $1 AND user_id = $2 AND device_id = $3 AND revoked_at IS NULL`,
    [ids.workspaceA, ids.admin.id, deviceId],
  );
  assert.equal(subscriptionCount.rows[0].count, 1);
  const unsubscribed = await app.inject({
    method: 'DELETE',
    url: `${root}/notifications/push-subscriptions/${deviceId}`,
    headers: headers(ids.admin),
  });
  assert.equal(unsubscribed.statusCode, 204, unsubscribed.body);
  const unsubscribedAgain = await app.inject({
    method: 'DELETE',
    url: `${root}/notifications/push-subscriptions/${deviceId}`,
    headers: headers(ids.admin),
  });
  assert.equal(unsubscribedAgain.statusCode, 204);
  const resubscribed = await app.inject({
    method: 'PUT',
    url: `${root}/notifications/push-subscriptions`,
    headers: headers(ids.admin),
    payload: pushBody,
  });
  assert.equal(resubscribed.statusCode, 200, resubscribed.body);
  const rejectedEndpoint = await app.inject({
    method: 'PUT',
    url: `${root}/notifications/push-subscriptions`,
    headers: headers(ids.admin),
    payload: { ...pushBody, deviceId: randomUUID(), endpoint: 'https://127.0.0.1:443/internal' },
  });
  assert.equal(rejectedEndpoint.statusCode, 400);

  for (const user of [ids.admin, ids.tech]) {
    const page = await app.inject({ url: `${root}/issues?limit=2`, headers: headers(user) });
    assert.equal(page.statusCode, 200, page.body);
    assert.deepEqual(
      page.json().items.map(({ id }) => id),
      issueIdsByRecency.slice(0, 2),
    );
    assert.equal(page.json().nextCursor, issueIdsByRecency[1]);
    const next = await app.inject({
      url: `${root}/issues?limit=2&cursor=${page.json().nextCursor}`,
      headers: headers(user),
    });
    assert.equal(next.statusCode, 200, next.body);
    assert.deepEqual(
      next.json().items.map(({ id }) => id),
      [issueIdsByRecency[2]],
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
  assert.equal(eventPage.json().items[0].id, eventIds[1]);
  assert.equal(eventPage.json().items[0].actorLabel, 'Usuário excluído');
  const eventPage2 = await app.inject({
    url: `${root}/issues/${issueIds[0]}/events?limit=1&cursor=${eventIds[1]}`,
    headers: headers(ids.tech),
  });
  assert.equal(eventPage2.statusCode, 200, eventPage2.body);
  assert.equal(eventPage2.json().items[0].id, eventIds[0]);
  assert.equal(eventPage2.json().items[0].actorMembershipId, membershipByUser.get(ids.revoked.id));
  assert.equal(eventPage2.json().items[0].actorLabel, 'Técnico removido');
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

  const createdIssueId = randomUUID();
  const createCommandId = randomUUID();
  const adminPushEndpoint = `https://push.example.test/${randomUUID()}`;
  await pool.query(
    `INSERT INTO public.push_subscriptions
       (id, workspace_id, user_id, device_id, endpoint, endpoint_hash, p256dh, auth_secret)
     VALUES ($1, $2, $3, $4, $5, $6, 'public-key', 'auth-secret')`,
    [
      randomUUID(),
      ids.workspaceA,
      ids.admin.id,
      randomUUID(),
      adminPushEndpoint,
      createHash('sha256').update(adminPushEndpoint).digest(),
    ],
  );
  const createBody = {
    commandId: createCommandId,
    issueId: createdIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Falha registrada pela integração',
  };
  await expectError(
    await app.inject({ method: 'POST', url: `${root}/issues`, payload: createBody }),
    401,
    'AUTHENTICATION_REQUIRED',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.revoked),
      payload: { ...createBody, issueId: randomUUID(), commandId: randomUUID() },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  const created = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: createBody,
  });
  assert.equal(created.statusCode, 201, created.body);
  assert.equal(created.json().creator.id, ids.tech.id);
  assert.equal(created.json().revision, 1);
  const createdNoticeCounts = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM public.notifications
         WHERE workspace_id = $1 AND issue_id = $2 AND type = 'created') AS notices,
       (SELECT count(*)::int FROM public.notifications
         WHERE workspace_id = $1 AND issue_id = $2 AND recipient_user_id = $3) AS actor_notices,
       (SELECT count(*)::int FROM public.notifications
         WHERE workspace_id = $1 AND issue_id = $2 AND recipient_user_id = $4) AS revoked_notices,
       (SELECT count(*)::int FROM public.notifications
         WHERE workspace_id = $5 AND issue_id = $2) AS cross_tenant_notices,
       (SELECT count(*)::int FROM public.notification_deliveries
         WHERE workspace_id = $1 AND issue_id = $2) AS deliveries`,
    [ids.workspaceA, createdIssueId, ids.tech.id, ids.revoked.id, ids.workspaceB],
  );
  assert.deepEqual(createdNoticeCounts.rows[0], {
    notices: 2,
    actor_notices: 0,
    revoked_notices: 0,
    cross_tenant_notices: 0,
    deliveries: 2,
  });
  await expectError(await app.inject(`${root}/notifications`), 401, 'AUTHENTICATION_REQUIRED');
  const adminNotices = await app.inject({
    url: `${root}/notifications?limit=1`,
    headers: headers(ids.admin),
  });
  assert.equal(adminNotices.statusCode, 200, adminNotices.body);
  assert.equal(adminNotices.json().items[0].issueId, createdIssueId);
  assert.equal(adminNotices.json().items[0].type, 'created');
  assert.equal(adminNotices.json().unreadCount, 1);
  const adminNoticeId = adminNotices.json().items[0].id;
  const readNotice = await app.inject({
    method: 'POST',
    url: `${root}/notifications/${adminNoticeId}/read`,
    headers: headers(ids.admin),
  });
  assert.equal(readNotice.statusCode, 200, readNotice.body);
  assert.ok(readNotice.json().readAt);
  const readAgain = await app.inject({
    method: 'POST',
    url: `${root}/notifications/${adminNoticeId}/read`,
    headers: headers(ids.admin),
  });
  assert.deepEqual(readAgain.json(), readNotice.json());
  const wrongRecipient = await app.inject({
    method: 'POST',
    url: `${root}/notifications/${adminNoticeId}/read`,
    headers: headers(ids.tech),
  });
  assert.equal(wrongRecipient.statusCode, 404);
  const createdReplay = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: createBody,
  });
  assert.equal(createdReplay.statusCode, 201, createdReplay.body);
  assert.deepEqual(createdReplay.json(), created.json());
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.tech),
      payload: { ...createBody, text: 'Outro conteúdo' },
    }),
    409,
    'IDEMPOTENCY_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.tech),
      payload: { ...createBody, commandId: randomUUID() },
    }),
    409,
    'ISSUE_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.tech),
      payload: { ...createBody, issueId: issueBId, commandId: randomUUID() },
    }),
    409,
    'ISSUE_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.tech),
      payload: {
        ...createBody,
        issueId: randomUUID(),
        commandId: randomUUID(),
        parkId: parkIds.archived,
        turbineId: turbineIds.archived,
      },
    }),
    409,
    'EQUIPMENT_UNAVAILABLE',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.tech),
      payload: {
        ...createBody,
        issueId: randomUUID(),
        commandId: randomUUID(),
        parkId: parkIds.active,
        turbineId: turbineIds.other,
      },
    }),
    409,
    'EQUIPMENT_UNAVAILABLE',
  );

  const updateCommandId = randomUUID();
  const updateBody = {
    commandId: updateCommandId,
    expectedRevision: 1,
    text: 'Texto revisado',
  };
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${createdIssueId}`,
      headers: headers(ids.admin),
      payload: updateBody,
    }),
    403,
    'ISSUE_ACTION_FORBIDDEN',
  );
  const updated = await app.inject({
    method: 'PATCH',
    url: `${root}/issues/${createdIssueId}`,
    headers: headers(ids.tech),
    payload: updateBody,
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().revision, 2);
  assert.equal(updated.json().text, 'Texto revisado');
  const notificationPageOne = await app.inject({
    url: `${root}/notifications?limit=1`,
    headers: headers(ids.admin),
  });
  assert.equal(notificationPageOne.statusCode, 200, notificationPageOne.body);
  assert.equal(notificationPageOne.json().items[0].type, 'edited');
  assert.equal(notificationPageOne.json().unreadCount, 1);
  const notificationPageTwo = await app.inject({
    url: `${root}/notifications?limit=1&cursor=${notificationPageOne.json().nextCursor}`,
    headers: headers(ids.admin),
  });
  assert.equal(notificationPageTwo.statusCode, 200, notificationPageTwo.body);
  assert.equal(notificationPageTwo.json().items[0].type, 'created');
  assert.notEqual(notificationPageTwo.json().items[0].id, notificationPageOne.json().items[0].id);
  const foreignCursor = await app.inject({
    url: `/api/workspaces/${ids.workspaceB}/notifications?cursor=${notificationPageOne.json().items[0].id}`,
    headers: headers(ids.other),
  });
  assert.equal(foreignCursor.statusCode, 400);
  const updatedReplay = await app.inject({
    method: 'PATCH',
    url: `${root}/issues/${createdIssueId}`,
    headers: headers(ids.tech),
    payload: updateBody,
  });
  assert.equal(updatedReplay.statusCode, 200, updatedReplay.body);
  assert.deepEqual(updatedReplay.json(), updated.json());
  const countsAfterReplay = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM public.issues WHERE id = $1) AS issues,
       (SELECT count(*)::int FROM public.issue_events WHERE issue_id = $1) AS events,
       (SELECT count(*)::int FROM public.issue_sync_rows WHERE id = $1) AS sync_rows,
       (SELECT bool_and(park_id IS NOT NULL AND turbine_id IS NOT NULL AND text = 'Texto revisado')
          FROM public.issue_sync_rows WHERE id = $1) AS sync_row_matches_issue,
       (SELECT count(*)::int FROM public.issue_sync_events WHERE issue_id = $1) AS sync_events,
       (SELECT bool_and(
          (before IS NULL OR NOT (before ? 'handler') AND NOT (before ? 'handlerMembershipId'))
          AND (after IS NULL OR NOT (after ? 'handler') AND NOT (after ? 'handlerMembershipId'))
        ) FROM public.issue_sync_events WHERE issue_id = $1) AS sync_snapshots_sanitized,
       (SELECT count(*)::int FROM public.sync_commands WHERE actor_user_id = $2
         AND command_id = ANY($3::uuid[])) AS receipts`,
    [createdIssueId, ids.tech.id, [createCommandId, updateCommandId]],
  );
  assert.deepEqual(countsAfterReplay.rows[0], {
    issues: 1,
    events: 2,
    sync_rows: 1,
    sync_row_matches_issue: true,
    sync_events: 2,
    sync_snapshots_sanitized: true,
    receipts: 2,
  });
  const replayNoticeCount = await pool.query(
    `SELECT count(*)::int AS count FROM public.notifications WHERE issue_id = $1`,
    [createdIssueId],
  );
  assert.equal(replayNoticeCount.rows[0].count, 4);
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${createdIssueId}`,
      headers: headers(ids.tech),
      payload: { ...updateBody, text: 'Divergente' },
    }),
    409,
    'IDEMPOTENCY_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${createdIssueId}`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 1, text: 'Stale' },
    }),
    409,
    'REVISION_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${createdIssueId}`,
      headers: headers(ids.tech),
      payload: {
        commandId: randomUUID(),
        expectedRevision: 2,
        parkId: parkIds.archived,
        turbineId: turbineIds.archived,
      },
    }),
    409,
    'EQUIPMENT_UNAVAILABLE',
  );
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${createdIssueId}`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 2, parkId: parkIds.active },
    }),
    400,
    'VALIDATION_ERROR',
  );

  const startForCompletion = await app.inject({
    method: 'POST',
    url: `${root}/issues/${createdIssueId}/start`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 2 },
  });
  assert.equal(startForCompletion.statusCode, 200, startForCompletion.body);
  const completeForNotification = await app.inject({
    method: 'POST',
    url: `${root}/issues/${createdIssueId}/complete`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 3 },
  });
  assert.equal(completeForNotification.statusCode, 200, completeForNotification.body);
  const suppressedCreate = await pool.query(
    `SELECT count(*)::int AS notices,
       (SELECT count(*)::int FROM public.notification_deliveries
         WHERE issue_id = $1 AND status = 'cancelled' AND cancelled_at IS NOT NULL) AS cancelled
     FROM public.notifications WHERE issue_id = $1 AND type = 'created' AND suppressed_at IS NOT NULL`,
    [createdIssueId],
  );
  assert.deepEqual(suppressedCreate.rows[0], { notices: 1, cancelled: 2 });

  const concurrentEditIssueId = randomUUID();
  const concurrentCreate = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: {
      commandId: randomUUID(),
      issueId: concurrentEditIssueId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Concorrência de revisão',
    },
  });
  assert.equal(concurrentCreate.statusCode, 201, concurrentCreate.body);
  const concurrentEdits = await Promise.all([
    issues.editIssue(headers(ids.tech), ids.workspaceA, concurrentEditIssueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
      text: 'Concorrente A',
    }),
    issues.editIssue(headers(ids.tech), ids.workspaceA, concurrentEditIssueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
      text: 'Concorrente B',
    }),
  ]);
  assert.deepEqual(concurrentEdits.map((result) => result.status).sort(), [
    'ok',
    'revision_conflict',
  ]);

  const archivedTextEdit = await app.inject({
    method: 'PATCH',
    url: `${root}/issues/${issueIds[1]}`,
    headers: headers(ids.tech),
    payload: { commandId: randomUUID(), expectedRevision: 1, text: 'Histórico corrigido' },
  });
  assert.equal(archivedTextEdit.statusCode, 200, archivedTextEdit.body);
  assert.equal(archivedTextEdit.json().parkId, parkIds.archived);

  const simultaneousId = randomUUID();
  const simultaneousBody = {
    commandId: randomUUID(),
    issueId: simultaneousId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Retry simultâneo',
  };
  const simultaneous = await Promise.all([
    issues.createIssue(headers(ids.tech), ids.workspaceA, simultaneousBody),
    issues.createIssue(headers(ids.tech), ids.workspaceA, simultaneousBody),
  ]);
  assert.deepEqual(
    simultaneous.map((result) => result.status),
    ['ok', 'ok'],
  );
  assert.deepEqual(
    simultaneous.map((result) => result.status === 'ok' && result.value.id),
    [simultaneousId, simultaneousId],
  );

  async function verifyLifecycleSerializesWithIssueMutation(
    mutate,
    referencedParkId,
    referencedTurbineId,
  ) {
    const reachedLocationLock = deferred();
    const releaseMutation = deferred();
    const blockingParks = {
      ...parks,
      lockIssueLocations: async (...args) => {
        const locked = await parks.lockIssueLocations(...args);
        reachedLocationLock.resolve();
        await releaseMutation.promise;
        return locked;
      },
    };
    const blockedIssues = createIssuesService(pool, identity, {
      authorization,
      parks: blockingParks,
      audit: createAuditService(notifications),
      sync: createSyncService(),
    });
    const mutationPromise = mutate(blockedIssues);
    await Promise.race([
      reachedLocationLock.promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location lock was not reached.')), 10_000),
      ),
    ]);
    const lifecycleStarted = deferred();
    const lifecycleCheck = (async () => {
      const transaction = await pool.connect();
      try {
        await transaction.query('BEGIN');
        lifecycleStarted.resolve();
        const permission = await authorization.authorizeWorkspaceInTransaction(
          transaction,
          headers(ids.admin),
          ids.workspaceA,
          ['admin'],
        );
        assert.equal(permission.status, 'ok');
        const references = await issues.getEquipmentIssueReferences(
          transaction,
          ids.workspaceA,
          referencedParkId,
          referencedTurbineId,
        );
        await transaction.query('ROLLBACK');
        return references;
      } catch (error) {
        await transaction.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        transaction.release();
      }
    })();
    await lifecycleStarted.promise;
    releaseMutation.resolve();
    const mutation = await mutationPromise;
    assert.equal(mutation.status, 'ok');
    const references = await lifecycleCheck;
    assert.equal(references.hasReferences, true);
    assert.equal(references.hasOpenIssues, true);
  }

  const archiveRaceIssue = randomUUID();
  await verifyLifecycleSerializesWithIssueMutation(
    (blockedIssues) =>
      blockedIssues.createIssue(headers(ids.tech), ids.workspaceA, {
        commandId: randomUUID(),
        issueId: archiveRaceIssue,
        parkId: parkIds.active,
        turbineId: turbineIds.active,
        text: 'Corrida de criação com lifecycle',
      }),
    parkIds.active,
    turbineIds.active,
  );
  const moveRaceIssue = randomUUID();
  const moveRaceCreate = await issues.createIssue(headers(ids.tech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: moveRaceIssue,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Corrida de mudança de localização',
  });
  assert.equal(moveRaceCreate.status, 'ok');
  await verifyLifecycleSerializesWithIssueMutation(
    (blockedIssues) =>
      blockedIssues.editIssue(headers(ids.tech), ids.workspaceA, moveRaceIssue, {
        commandId: randomUUID(),
        expectedRevision: 1,
        parkId: parkIds.destination,
        turbineId: turbineIds.destination,
      }),
    parkIds.active,
    turbineIds.active,
  );

  const failedIssueId = randomUUID();
  const realAudit = createAuditService(notifications);
  const failingIssues = createIssuesService(pool, identity, {
    authorization,
    parks,
    audit: {
      appendIssueEvent: async (transaction, event) => {
        await realAudit.appendIssueEvent(transaction, event);
        throw new Error('Injected audit failure');
      },
    },
    sync: createSyncService(),
  });
  await assert.rejects(
    failingIssues.createIssue(headers(ids.admin), ids.workspaceA, {
      commandId: randomUUID(),
      issueId: failedIssueId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Rollback integral',
    }),
    /Injected audit failure/,
  );
  const failedCount = await pool.query(
    'SELECT count(*)::int AS count FROM public.issues WHERE id = $1',
    [failedIssueId],
  );
  assert.equal(failedCount.rows[0].count, 0);

  const committedId = randomUUID();
  const committedCommand = {
    commandId: randomUUID(),
    issueId: committedId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Resposta perdida após commit',
  };
  const committed = await issues.createIssue(headers(ids.admin), ids.workspaceA, committedCommand);
  assert.equal(committed.status, 'ok');
  await app.close();
  const restartedIssues = createIssuesService(pool, identity, {
    authorization,
    parks,
    audit: createAuditService(notifications),
    sync: createSyncService(),
  });
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
    parksCatalog: parks,
    issues: restartedIssues,
    docs: true,
  });
  await app.ready();
  const afterRestart = await restartedIssues.createIssue(
    headers(ids.admin),
    ids.workspaceA,
    committedCommand,
  );
  assert.deepEqual(afterRestart, committed);

  const transitionIssueId = randomUUID();
  const transitionCreate = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: {
      commandId: randomUUID(),
      issueId: transitionIssueId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Concorrência de início',
    },
  });
  assert.equal(transitionCreate.statusCode, 201, transitionCreate.body);
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [transitionIssueId, ids.workspaceA],
  );
  const techStartBody = { commandId: randomUUID(), expectedRevision: 1 };
  const adminStartBody = { commandId: randomUUID(), expectedRevision: 1 };
  const [techStart, adminStart] = await Promise.all([
    app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/start`,
      headers: headers(ids.tech),
      payload: techStartBody,
    }),
    app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/start`,
      headers: headers(ids.admin),
      payload: adminStartBody,
    }),
  ]);
  const successfulStart = [techStart, adminStart].find((response) => response.statusCode === 200);
  const rejectedStart = [techStart, adminStart].find((response) => response.statusCode !== 200);
  assert.ok(successfulStart, `${techStart.body} ${adminStart.body}`);
  assert.equal(successfulStart.json().status, 'in_progress');
  assert.equal(successfulStart.json().revision, 2);
  assert.ok(rejectedStart);
  await expectError(rejectedStart, 409, 'REVISION_CONFLICT');
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/start`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 2 },
    }),
    409,
    'ISSUE_STATE_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/release`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 2 },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  const responsible = successfulStart.json().handler.id === ids.tech.id ? ids.tech : ids.admin;
  const otherActor = responsible.id === ids.tech.id ? ids.admin : ids.tech;
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/return`,
      headers: headers(otherActor),
      payload: { commandId: randomUUID(), expectedRevision: 2 },
    }),
    403,
    'ISSUE_ACTION_FORBIDDEN',
  );
  const returnBody = { commandId: randomUUID(), expectedRevision: 2 };
  const returned = await app.inject({
    method: 'POST',
    url: `${root}/issues/${transitionIssueId}/return`,
    headers: headers(responsible),
    payload: returnBody,
  });
  assert.equal(returned.statusCode, 200, returned.body);
  assert.equal(returned.json().status, 'pending');
  assert.equal(returned.json().handler, null);
  assert.equal(returned.json().revision, 3);
  const oldStartReplay = await app.inject({
    method: 'POST',
    url: `${root}/issues/${transitionIssueId}/start`,
    headers: headers(responsible),
    payload: successfulStart === techStart ? techStartBody : adminStartBody,
  });
  assert.equal(oldStartReplay.statusCode, 200, oldStartReplay.body);
  assert.deepEqual(oldStartReplay.json(), successfulStart.json());
  const transitionEventCount = await pool.query(
    `SELECT count(*)::int AS count FROM public.issue_events
     WHERE issue_id = $1 AND type = 'started'`,
    [transitionIssueId],
  );
  assert.equal(transitionEventCount.rows[0].count, 1);
  const stillReturned = await app.inject({
    url: `${root}/issues/${transitionIssueId}`,
    headers: headers(ids.tech),
  });
  assert.equal(stillReturned.json().status, 'pending');
  assert.equal(stillReturned.json().revision, 3);
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/release`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 3 },
    }),
    409,
    'ISSUE_STATE_CONFLICT',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${transitionIssueId}/start`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 3, handlerUserId: ids.admin.id },
    }),
    400,
    'VALIDATION_ERROR',
  );

  const editStartIssueId = randomUUID();
  const editStartCreate = await issues.createIssue(headers(ids.tech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: editStartIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Edição concorrente com início',
  });
  assert.equal(editStartCreate.status, 'ok');
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [editStartIssueId, ids.workspaceA],
  );
  const concurrentEditStart = await Promise.all([
    issues.editIssue(headers(ids.tech), ids.workspaceA, editStartIssueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
      text: 'Edição concorrente',
    }),
    issues.startIssue(headers(ids.tech), ids.workspaceA, editStartIssueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
    }),
  ]);
  assert.deepEqual(concurrentEditStart.map((result) => result.status).sort(), [
    'ok',
    'revision_conflict',
  ]);

  const returnReleaseIssueId = randomUUID();
  const returnReleaseCreate = await issues.createIssue(headers(ids.tech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: returnReleaseIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Devolução contra liberação',
  });
  assert.equal(returnReleaseCreate.status, 'ok');
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [returnReleaseIssueId, ids.workspaceA],
  );
  const startedByTech = await issues.startIssue(
    headers(ids.tech),
    ids.workspaceA,
    returnReleaseIssueId,
    {
      commandId: randomUUID(),
      expectedRevision: 1,
    },
  );
  assert.equal(startedByTech.status, 'ok');
  assert.equal(startedByTech.value.handler?.id, ids.tech.id);
  const [returnRace, releaseRace] = await Promise.all([
    issues.returnIssue(headers(ids.tech), ids.workspaceA, returnReleaseIssueId, {
      commandId: randomUUID(),
      expectedRevision: 2,
    }),
    issues.releaseIssue(headers(ids.admin), ids.workspaceA, returnReleaseIssueId, {
      commandId: randomUUID(),
      expectedRevision: 2,
    }),
  ]);
  assert.deepEqual([returnRace.status, releaseRace.status].sort(), ['ok', 'revision_conflict']);
  const returnReleaseEventCount = await pool.query(
    'SELECT count(*)::int AS count FROM public.issue_events WHERE issue_id = $1',
    [returnReleaseIssueId],
  );
  assert.equal(returnReleaseEventCount.rows[0].count, 3);

  const ownerWaitIssueId = randomUUID();
  const ownerWaitCreated = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: {
      commandId: randomUUID(),
      issueId: ownerWaitIssueId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Aguardar uma hora para autoatendimento',
    },
  });
  assert.equal(ownerWaitCreated.statusCode, 201, ownerWaitCreated.body);
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${ownerWaitIssueId}/start`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    403,
    'ISSUE_CREATOR_WAIT',
  );
  const otherMemberStart = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/start`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 1 },
  });
  assert.equal(otherMemberStart.statusCode, 200, otherMemberStart.body);
  const completionCommand = {
    commandId: randomUUID(),
    expectedRevision: 2,
    report: 'Inspeção e reparo concluídos.',
  };
  const completed = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/complete`,
    headers: headers(ids.admin),
    payload: completionCommand,
  });
  assert.equal(completed.statusCode, 200, completed.body);
  assert.equal(completed.json().status, 'completed');
  assert.equal(completed.json().completionReport, completionCommand.report);
  await expectError(
    await app.inject({
      method: 'PATCH',
      url: `${root}/issues/${ownerWaitIssueId}`,
      headers: headers(ids.tech),
      payload: {
        commandId: randomUUID(),
        expectedRevision: 3,
        text: 'Tentativa de editar após conclusão',
      },
    }),
    409,
    'ISSUE_NOT_EDITABLE',
  );
  const completedReplay = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/complete`,
    headers: headers(ids.admin),
    payload: completionCommand,
  });
  assert.equal(completedReplay.statusCode, 200, completedReplay.body);
  assert.deepEqual(completedReplay.json(), completed.json());
  const completionEvents = await pool.query(
    `SELECT count(*)::int AS count FROM public.issue_events
     WHERE issue_id = $1 AND type = 'completed'`,
    [ownerWaitIssueId],
  );
  assert.equal(completionEvents.rows[0].count, 1);
  const expiredOwnerIssueId = randomUUID();
  const expiredOwnerCreated = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.tech),
    payload: {
      commandId: randomUUID(),
      issueId: expiredOwnerIssueId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Autoatendimento após uma hora',
    },
  });
  assert.equal(expiredOwnerCreated.statusCode, 201, expiredOwnerCreated.body);
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [expiredOwnerIssueId, ids.workspaceA],
  );
  const ownerStartAfterWait = await app.inject({
    method: 'POST',
    url: `${root}/issues/${expiredOwnerIssueId}/start`,
    headers: headers(ids.tech),
    payload: { commandId: randomUUID(), expectedRevision: 1 },
  });
  assert.equal(ownerStartAfterWait.statusCode, 200, ownerStartAfterWait.body);
  const newerCompletedId = randomUUID();
  const newerCreated = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(ids.admin),
    payload: {
      commandId: randomUUID(),
      issueId: newerCompletedId,
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Conclusão mais recente',
    },
  });
  assert.equal(newerCreated.statusCode, 201, newerCreated.body);
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '2 hours'
     WHERE id = $1 AND workspace_id = $2`,
    [newerCompletedId, ids.workspaceA],
  );
  const newerStarted = await app.inject({
    method: 'POST',
    url: `${root}/issues/${newerCompletedId}/start`,
    headers: headers(ids.tech),
    payload: { commandId: randomUUID(), expectedRevision: 1 },
  });
  assert.equal(newerStarted.statusCode, 200, newerStarted.body);
  const newerCompleted = await app.inject({
    method: 'POST',
    url: `${root}/issues/${newerCompletedId}/complete`,
    headers: headers(ids.tech),
    payload: { commandId: randomUUID(), expectedRevision: 2 },
  });
  assert.equal(newerCompleted.statusCode, 200, newerCompleted.body);
  const completedList = await app.inject({
    url: `${root}/issues?status=completed&limit=1`,
    headers: headers(ids.tech),
  });
  assert.equal(completedList.statusCode, 200, completedList.body);
  assert.equal(completedList.json().items[0].id, newerCompletedId);
  const olderCompletedList = await app.inject({
    url: `${root}/issues?status=completed&limit=1&cursor=${completedList.json().nextCursor}`,
    headers: headers(ids.tech),
  });
  assert.equal(olderCompletedList.statusCode, 200, olderCompletedList.body);
  assert.equal(olderCompletedList.json().items[0].id, ownerWaitIssueId);
  const activeList = await app.inject({
    url: `${root}/issues?status=active`,
    headers: headers(ids.tech),
  });
  assert.equal(activeList.statusCode, 200, activeList.body);
  assert.ok(activeList.json().items.every((issue) => issue.status !== 'completed'));
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${ownerWaitIssueId}/reopen`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 6 },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${newerCompletedId}/archive`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 3 },
    }),
    409,
    'ISSUE_STATE_CONFLICT',
  );

  const reopenCommand = { commandId: randomUUID(), expectedRevision: 3 };
  const reopened = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/reopen`,
    headers: headers(ids.admin),
    payload: reopenCommand,
  });
  assert.equal(reopened.statusCode, 200, reopened.body);
  assert.equal(reopened.json().status, 'pending');
  assert.equal(reopened.json().completionReport, null);
  const reopenedAgain = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/reopen`,
    headers: headers(ids.admin),
    payload: reopenCommand,
  });
  assert.equal(reopenedAgain.statusCode, 200, reopenedAgain.body);
  assert.deepEqual(reopenedAgain.json(), reopened.json());
  const archiveCommand = { commandId: randomUUID(), expectedRevision: 4 };
  const archivedByCreator = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/archive`,
    headers: headers(ids.tech),
    payload: archiveCommand,
  });
  assert.equal(archivedByCreator.statusCode, 200, archivedByCreator.body);
  assert.ok(archivedByCreator.json().archivedAt);
  const archivedPage = await app.inject({
    url: `${root}/issues?status=archived&parkId=${parkIds.active}&limit=1`,
    headers: headers(ids.tech),
  });
  assert.equal(archivedPage.statusCode, 200, archivedPage.body);
  assert.equal(archivedPage.json().items[0].id, ownerWaitIssueId);
  const withoutArchive = await app.inject({
    url: `${root}/issues?status=active&limit=100`,
    headers: headers(ids.tech),
  });
  assert.ok(withoutArchive.json().items.every((issue) => issue.id !== ownerWaitIssueId));

  const reactivated = await app.inject({
    method: 'POST',
    url: `${root}/issues/${ownerWaitIssueId}/reactivate`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 5 },
  });
  assert.equal(reactivated.statusCode, 200, reactivated.body);
  assert.equal(reactivated.json().archivedAt, null);
  assert.equal(reactivated.json().status, 'pending');
  const lifecycleEvents = await pool.query(
    `SELECT type FROM public.issue_events WHERE issue_id = $1 ORDER BY occurred_at, id`,
    [ownerWaitIssueId],
  );
  assert.ok(lifecycleEvents.rows.some((event) => event.type === 'reopened'));
  assert.ok(lifecycleEvents.rows.some((event) => event.type === 'archived'));
  assert.ok(lifecycleEvents.rows.some((event) => event.type === 'reactivated'));
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${parkIds.active}/turbines/${turbineIds.active}`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    409,
    'EQUIPMENT_HAS_OPEN_ISSUES',
  );
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${parkIds.active}`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    409,
    'EQUIPMENT_HAS_OPEN_ISSUES',
  );
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${parkIds.other}`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    404,
    'RESOURCE_NOT_FOUND',
  );
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${parkIds.active}/turbines/${turbineIds.active}`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );

  let lifecycleCode = 880000;
  async function createLifecyclePark() {
    const result = await parks.createPark(headers(ids.admin), ids.workspaceA, {
      code: `P${++lifecycleCode}`,
    });
    assert.equal(result.status, 'ok');
    return result.value;
  }
  async function createLifecycleTurbine(parkId) {
    const result = await parks.createTurbine(headers(ids.admin), ids.workspaceA, parkId, {
      code: `T${++lifecycleCode}`,
    });
    assert.equal(result.status, 'ok');
    return result.value;
  }
  async function createMovedIssue(parkId, turbineId, text) {
    const issueId = randomUUID();
    const createdIssue = await issues.createIssue(headers(ids.admin), ids.workspaceA, {
      commandId: randomUUID(),
      issueId,
      parkId,
      turbineId,
      text,
    });
    assert.equal(createdIssue.status, 'ok');
    const movedIssue = await issues.editIssue(headers(ids.admin), ids.workspaceA, issueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
      parkId: parkIds.destination,
      turbineId: turbineIds.destination,
    });
    assert.equal(movedIssue.status, 'ok');
    return issueId;
  }

  const emptyPark = await createLifecyclePark();
  const emptyFirstTurbine = await createLifecycleTurbine(emptyPark.id);
  const emptySecondTurbine = await createLifecycleTurbine(emptyPark.id);
  const emptyTurbineDelete = {
    commandId: randomUUID(),
    expectedRevision: emptyFirstTurbine.revision,
  };
  const deletedEmptyTurbine = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${emptyPark.id}/turbines/${emptyFirstTurbine.id}`,
    headers: headers(ids.admin),
    payload: emptyTurbineDelete,
  });
  assert.equal(deletedEmptyTurbine.statusCode, 200, deletedEmptyTurbine.body);
  assert.equal(deletedEmptyTurbine.json().result, 'deleted');
  const deletedTurbineReplay = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${emptyPark.id}/turbines/${emptyFirstTurbine.id}`,
    headers: headers(ids.admin),
    payload: emptyTurbineDelete,
  });
  assert.deepEqual(deletedTurbineReplay.json(), deletedEmptyTurbine.json());
  const emptyParkDelete = { commandId: randomUUID(), expectedRevision: emptyPark.revision };
  const deletedEmptyPark = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${emptyPark.id}`,
    headers: headers(ids.admin),
    payload: emptyParkDelete,
  });
  assert.equal(deletedEmptyPark.statusCode, 200, deletedEmptyPark.body);
  assert.equal(deletedEmptyPark.json().result, 'deleted');
  const deletedParkReplay = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${emptyPark.id}`,
    headers: headers(ids.admin),
    payload: emptyParkDelete,
  });
  assert.deepEqual(deletedParkReplay.json(), deletedEmptyPark.json());
  const orphanCount = await pool.query(
    'SELECT count(*)::int AS count FROM public.turbines WHERE workspace_id = $1 AND id = ANY($2::uuid[])',
    [ids.workspaceA, [emptyFirstTurbine.id, emptySecondTurbine.id]],
  );
  assert.equal(orphanCount.rows[0].count, 0);

  const historicalPark = await createLifecyclePark();
  const individuallyArchived = await createLifecycleTurbine(historicalPark.id);
  const stillActive = await createLifecycleTurbine(historicalPark.id);
  await createMovedIssue(
    historicalPark.id,
    individuallyArchived.id,
    'Histórico da turbina arquivada',
  );
  await createMovedIssue(historicalPark.id, stillActive.id, 'Histórico da turbina ativa');
  const turbineDeleteBody = {
    commandId: randomUUID(),
    expectedRevision: individuallyArchived.revision,
  };
  const archivedTurbine = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${historicalPark.id}/turbines/${individuallyArchived.id}`,
    headers: headers(ids.admin),
    payload: turbineDeleteBody,
  });
  assert.equal(archivedTurbine.statusCode, 200, archivedTurbine.body);
  assert.equal(archivedTurbine.json().result, 'archived');
  assert.ok(archivedTurbine.json().turbine.deactivatedAt);
  const repeatedTurbineArchive = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${historicalPark.id}/turbines/${individuallyArchived.id}`,
    headers: headers(ids.admin),
    payload: turbineDeleteBody,
  });
  assert.equal(repeatedTurbineArchive.statusCode, 200, repeatedTurbineArchive.body);
  assert.deepEqual(repeatedTurbineArchive.json(), archivedTurbine.json());
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.admin),
      payload: {
        commandId: randomUUID(),
        issueId: randomUUID(),
        parkId: historicalPark.id,
        turbineId: individuallyArchived.id,
        text: 'Não pode abrir em turbina arquivada',
      },
    }),
    409,
    'EQUIPMENT_UNAVAILABLE',
  );
  const historicalParkDelete = {
    commandId: randomUUID(),
    expectedRevision: historicalPark.revision,
  };
  const archivedPark = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${historicalPark.id}`,
    headers: headers(ids.admin),
    payload: historicalParkDelete,
  });
  assert.equal(archivedPark.statusCode, 200, archivedPark.body);
  assert.equal(archivedPark.json().result, 'archived');
  assert.ok(archivedPark.json().park.deactivatedAt);
  const lifecycleReceipt = await pool.query(
    `SELECT actor_user_id AS "actorUserId", result->>'result' AS result
     FROM public.sync_commands WHERE workspace_id = $1 AND actor_user_id = $2 AND command_id = $3`,
    [ids.workspaceA, ids.admin.id, historicalParkDelete.commandId],
  );
  assert.deepEqual(lifecycleReceipt.rows[0], { actorUserId: ids.admin.id, result: 'archived' });
  const blockedChildCreate = await app.inject({
    method: 'POST',
    url: `${root}/parks/${historicalPark.id}/turbines`,
    headers: headers(ids.admin),
    payload: { code: `T${++lifecycleCode}` },
  });
  await expectError(blockedChildCreate, 404, 'RESOURCE_NOT_FOUND');
  const restoreHistoricalPark = await app.inject({
    method: 'POST',
    url: `${root}/parks/${historicalPark.id}/restore`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 2 },
  });
  assert.equal(restoreHistoricalPark.statusCode, 200, restoreHistoricalPark.body);
  assert.equal(restoreHistoricalPark.json().result, 'restored');
  assert.equal(restoreHistoricalPark.json().park.deactivatedAt, null);
  const afterParkRestoreTurbines = await app.inject({
    url: `${root}/parks/${historicalPark.id}/turbines`,
    headers: headers(ids.admin),
  });
  const archivedChildAfterParentRestore = afterParkRestoreTurbines
    .json()
    .items.find(({ id }) => id === individuallyArchived.id);
  const activeChildAfterParentRestore = afterParkRestoreTurbines
    .json()
    .items.find(({ id }) => id === stillActive.id);
  assert.ok(archivedChildAfterParentRestore.deactivatedAt);
  assert.equal(activeChildAfterParentRestore.deactivatedAt, null);
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/parks/${historicalPark.id}/turbines`,
      headers: headers(ids.admin),
      payload: { code: archivedChildAfterParentRestore.code },
    }),
    409,
    'CATALOG_CODE_TAKEN',
  );
  const oldParkDeleteReplay = await app.inject({
    method: 'DELETE',
    url: `${root}/parks/${historicalPark.id}`,
    headers: headers(ids.admin),
    payload: historicalParkDelete,
  });
  assert.deepEqual(oldParkDeleteReplay.json(), archivedPark.json());
  const stillRestoredPark = await app.inject({
    url: `${root}/parks/${historicalPark.id}`,
    headers: headers(ids.admin),
  });
  assert.equal(stillRestoredPark.json().deactivatedAt, null);
  const restoreArchivedChild = await app.inject({
    method: 'POST',
    url: `${root}/parks/${historicalPark.id}/turbines/${individuallyArchived.id}/restore`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 2 },
  });
  assert.equal(restoreArchivedChild.statusCode, 200, restoreArchivedChild.body);
  assert.equal(restoreArchivedChild.json().turbine.deactivatedAt, null);
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/parks/${historicalPark.id}/turbines/${stillActive.id}/restore`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    409,
    'EQUIPMENT_NOT_ARCHIVED',
  );
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${historicalPark.id}`,
      headers: headers(ids.admin),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    409,
    'REVISION_CONFLICT',
  );

  const concurrentCreatePark = await createLifecyclePark();
  const concurrentCreateTurbine = await createLifecycleTurbine(concurrentCreatePark.id);
  const concurrentIssueId = randomUUID();
  const [raceIssueCreate, raceTurbineDelete] = await Promise.all([
    issues.createIssue(headers(ids.admin), ids.workspaceA, {
      commandId: randomUUID(),
      issueId: concurrentIssueId,
      parkId: concurrentCreatePark.id,
      turbineId: concurrentCreateTurbine.id,
      text: 'Corrida de abertura e exclusão',
    }),
    parks.deleteTurbine(
      headers(ids.admin),
      ids.workspaceA,
      concurrentCreatePark.id,
      concurrentCreateTurbine.id,
      { commandId: randomUUID(), expectedRevision: concurrentCreateTurbine.revision },
      issues,
    ),
  ]);
  if (raceIssueCreate.status === 'ok') assert.equal(raceTurbineDelete.status, 'open_issues');
  else {
    assert.equal(raceIssueCreate.status, 'equipment_unavailable');
    assert.equal(raceTurbineDelete.status, 'ok');
    assert.equal(raceTurbineDelete.value.result, 'deleted');
  }

  const concurrentMovePark = await createLifecyclePark();
  const concurrentMoveTurbine = await createLifecycleTurbine(concurrentMovePark.id);
  const concurrentMoveIssueId = await createMovedIssue(
    concurrentMovePark.id,
    concurrentMoveTurbine.id,
    'Movida para teste de corrida',
  );
  // Put a fresh open issue on this turbine, then race moving it away against archive.
  const raceMoveIssueId = randomUUID();
  const raceMoveCreated = await issues.createIssue(headers(ids.admin), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: raceMoveIssueId,
    parkId: concurrentMovePark.id,
    turbineId: concurrentMoveTurbine.id,
    text: 'Edição versus arquivo',
  });
  assert.equal(raceMoveCreated.status, 'ok');
  const [raceMove, raceArchive] = await Promise.all([
    issues.editIssue(headers(ids.admin), ids.workspaceA, raceMoveIssueId, {
      commandId: randomUUID(),
      expectedRevision: 1,
      parkId: parkIds.destination,
      turbineId: turbineIds.destination,
    }),
    parks.deleteTurbine(
      headers(ids.admin),
      ids.workspaceA,
      concurrentMovePark.id,
      concurrentMoveTurbine.id,
      { commandId: randomUUID(), expectedRevision: concurrentMoveTurbine.revision },
      issues,
    ),
  ]);
  assert.equal(raceMove.status, 'ok');
  assert.ok(['open_issues', 'ok'].includes(raceArchive.status));
  if (raceArchive.status === 'ok') assert.equal(raceArchive.value.result, 'archived');
  const movedIssueAfterRace = await issues.getIssue(ids.workspaceA, raceMoveIssueId);
  assert.equal(movedIssueAfterRace.status, 'ok');
  assert.equal(movedIssueAfterRace.value.turbineId, turbineIds.destination);
  assert.notEqual(concurrentMoveIssueId, raceMoveIssueId);

  const [turbineCreationRace, parkArchiveRace] = await Promise.all([
    parks.createTurbine(headers(ids.admin), ids.workspaceA, historicalPark.id, {
      code: `T${++lifecycleCode}`,
    }),
    parks.deletePark(
      headers(ids.admin),
      ids.workspaceA,
      historicalPark.id,
      { commandId: randomUUID(), expectedRevision: stillRestoredPark.json().revision },
      issues,
    ),
  ]);
  assert.equal(parkArchiveRace.status, 'ok');
  assert.equal(parkArchiveRace.value.result, 'archived');
  assert.ok(['ok', 'not_found'].includes(turbineCreationRace.status));
  if (turbineCreationRace.status === 'ok') {
    const effectivelyInactiveCreate = await issues.createIssue(headers(ids.admin), ids.workspaceA, {
      commandId: randomUUID(),
      issueId: randomUUID(),
      parkId: historicalPark.id,
      turbineId: turbineCreationRace.value.id,
      text: 'Parent arquivado durante a criação',
    });
    assert.equal(effectivelyInactiveCreate.status, 'equipment_unavailable');
  }
  const archivedAfterConcurrentCreate = await parks.getPark(ids.workspaceA, historicalPark.id);
  assert.equal(archivedAfterConcurrentCreate.status, 'ok');
  const concurrentParentRestore = await parks.restorePark(
    headers(ids.admin),
    ids.workspaceA,
    historicalPark.id,
    { commandId: randomUUID(), expectedRevision: archivedAfterConcurrentCreate.value.revision },
  );
  assert.equal(concurrentParentRestore.status, 'ok');
  const turbineTwoArchive = await parks.deleteTurbine(
    headers(ids.admin),
    ids.workspaceA,
    historicalPark.id,
    stillActive.id,
    { commandId: randomUUID(), expectedRevision: stillActive.revision },
    issues,
  );
  assert.equal(turbineTwoArchive.status, 'ok');
  assert.equal(turbineTwoArchive.value.result, 'archived');
  const parentRevisionBeforeRestoreRace = concurrentParentRestore.value.park.revision;
  const [turbineRestoreRace, parentArchiveRace] = await Promise.all([
    parks.restoreTurbine(headers(ids.admin), ids.workspaceA, historicalPark.id, stillActive.id, {
      commandId: randomUUID(),
      expectedRevision: 2,
    }),
    parks.deletePark(
      headers(ids.admin),
      ids.workspaceA,
      historicalPark.id,
      { commandId: randomUUID(), expectedRevision: parentRevisionBeforeRestoreRace },
      issues,
    ),
  ]);
  assert.equal(turbineRestoreRace.status, 'ok');
  assert.equal(turbineRestoreRace.value.result, 'restored');
  assert.equal(parentArchiveRace.status, 'ok');
  assert.equal(parentArchiveRace.value.result, 'archived');
  const parentAfterRestoreRace = await parks.getPark(ids.workspaceA, historicalPark.id);
  const turbineAfterRestoreRace = await parks.getTurbine(
    ids.workspaceA,
    historicalPark.id,
    stillActive.id,
  );
  assert.equal(parentAfterRestoreRace.status, 'ok');
  assert.ok(parentAfterRestoreRace.value.deactivatedAt);
  assert.equal(turbineAfterRestoreRace.status, 'ok');
  assert.equal(turbineAfterRestoreRace.value.deactivatedAt, null);
  const finalParentRestore = await parks.restorePark(
    headers(ids.admin),
    ids.workspaceA,
    historicalPark.id,
    { commandId: randomUUID(), expectedRevision: parentAfterRestoreRace.value.revision },
  );
  assert.equal(finalParentRestore.status, 'ok');
  assert.equal(finalParentRestore.value.result, 'restored');
  const finalRestoredChild = await parks.getTurbine(
    ids.workspaceA,
    historicalPark.id,
    stillActive.id,
  );
  assert.equal(finalRestoredChild.status, 'ok');
  assert.equal(finalRestoredChild.value.deactivatedAt, null);

  await verifyIssueQueries({ pool, app, ids, headers, membershipByUser });

  const revokedHandlerIssueId = randomUUID();
  const revokedHandlerCreate = await issues.createIssue(headers(ids.tech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: revokedHandlerIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Liberação após revogação',
  });
  assert.equal(revokedHandlerCreate.status, 'ok');
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [revokedHandlerIssueId, ids.workspaceA],
  );
  const revokedHandlerStart = await issues.startIssue(
    headers(ids.tech),
    ids.workspaceA,
    revokedHandlerIssueId,
    { commandId: randomUUID(), expectedRevision: 1 },
  );
  assert.equal(revokedHandlerStart.status, 'ok');

  const raceIssueId = randomUUID();
  const raceIssue = await issues.createIssue(headers(ids.raceTech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: raceIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Revogação concorrente com início',
  });
  assert.equal(raceIssue.status, 'ok');
  await pool.query(
    `UPDATE public.issues SET created_at = clock_timestamp() - interval '1 hour'
     WHERE id = $1 AND workspace_id = $2`,
    [raceIssueId, ids.workspaceA],
  );
  const [raceStartResponse, raceRevokeResponse] = await Promise.all([
    app.inject({
      method: 'POST',
      url: `${root}/issues/${raceIssueId}/start`,
      headers: headers(ids.raceTech),
      payload: { commandId: randomUUID(), expectedRevision: 1 },
    }),
    app.inject({
      method: 'POST',
      url: `${root}/members/${membershipByUser.get(ids.raceTech.id)}/revoke`,
      headers: headers(ids.admin),
      payload: { expectedRevision: 1 },
    }),
  ]);
  assert.equal(raceRevokeResponse.statusCode, 200, raceRevokeResponse.body);
  assert.ok([200, 403].includes(raceStartResponse.statusCode), raceStartResponse.body);
  if (raceStartResponse.statusCode === 403)
    assert.equal(raceStartResponse.json().error.code, 'WORKSPACE_ACCESS_DENIED');
  else assert.equal(raceStartResponse.json().status, 'in_progress');

  await pool.query(
    `UPDATE public.workspace_members SET revoked_at = clock_timestamp()
     WHERE workspace_id = $1 AND user_id = $2`,
    [ids.workspaceA, ids.tech.id],
  );
  const releasedAfterRevocation = await app.inject({
    method: 'POST',
    url: `${root}/issues/${revokedHandlerIssueId}/release`,
    headers: headers(ids.admin),
    payload: { commandId: randomUUID(), expectedRevision: 2 },
  });
  assert.equal(releasedAfterRevocation.statusCode, 200, releasedAfterRevocation.body);
  assert.equal(releasedAfterRevocation.json().status, 'pending');
  assert.equal(releasedAfterRevocation.json().handler, null);
  const releasedEvents = await app.inject({
    url: `${root}/issues/${revokedHandlerIssueId}/events`,
    headers: headers(ids.admin),
  });
  const releasedEvent = releasedEvents.json().items.find((event) => event.type === 'released');
  assert.equal(releasedEvent.before.handler.id, ids.tech.id);
  assert.equal(releasedEvent.after.handler, null);
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues/${revokedHandlerIssueId}/start`,
      headers: headers(ids.tech),
      payload: { commandId: randomUUID(), expectedRevision: 3 },
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await pool.query(
    `UPDATE public.workspace_members SET revoked_at = clock_timestamp()
     WHERE workspace_id = $1 AND user_id = $2`,
    [ids.workspaceA, ids.admin.id],
  );
  await expectError(
    await app.inject({
      method: 'POST',
      url: `${root}/issues`,
      headers: headers(ids.admin),
      payload: committedCommand,
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
  );
  await expectError(
    await app.inject({
      method: 'DELETE',
      url: `${root}/parks/${emptyPark.id}`,
      headers: headers(ids.admin),
      payload: emptyParkDelete,
    }),
    403,
    'WORKSPACE_ACCESS_DENIED',
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

  const workerIssueId = randomUUID();
  const workerActorId = randomUUID();
  const workerActor = {
    id: workerActorId,
    name: 'Worker actor',
    email: `worker-actor-${process.pid}@example.invalid`,
  };
  knownUsers.set(workerActorId, workerActor);
  await pool.query(
    `INSERT INTO public.auth_users(id, name, email, email_verified) VALUES ($1, $2, $3, true)`,
    [workerActorId, workerActor.name, workerActor.email],
  );
  await pool.query(
    `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'technician')`,
    [ids.workspaceA, workerActorId],
  );
  const pushRecipientId = randomUUID();
  await pool.query(
    `INSERT INTO public.auth_users(id, name, email, email_verified) VALUES ($1, 'Push recipient', $2, true)`,
    [pushRecipientId, `push-recipient-${process.pid}@example.invalid`],
  );
  await pool.query(
    `INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ($1, $2, 'technician')`,
    [ids.workspaceA, pushRecipientId],
  );
  for (let index = 0; index < 2; index += 1) {
    const endpoint = `https://push.mock.example/${randomUUID()}`;
    await pool.query(
      `INSERT INTO public.push_subscriptions
         (id, workspace_id, user_id, device_id, endpoint, endpoint_hash, p256dh, auth_secret)
       VALUES ($1, $2, $3, $4, $5, $6, 'public-key', 'auth-secret')`,
      [
        randomUUID(),
        ids.workspaceA,
        pushRecipientId,
        randomUUID(),
        endpoint,
        createHash('sha256').update(endpoint).digest(),
      ],
    );
  }
  const workerIssue = await app.inject({
    method: 'POST',
    url: `${root}/issues`,
    headers: headers(workerActor),
    payload: {
      issueId: workerIssueId,
      commandId: randomUUID(),
      parkId: parkIds.active,
      turbineId: turbineIds.active,
      text: 'Worker push fixture',
    },
  });
  assert.equal(workerIssue.statusCode, 201, workerIssue.body);
  const sentEndpoints = [];
  const mockSender = {
    async send(subscription) {
      sentEndpoints.push(subscription.endpoint);
      await new Promise((resolve) => setTimeout(resolve, 20));
    },
  };
  const workerA = createNotificationWorker(pool, mockSender, { batchSize: 1 });
  const workerB = createNotificationWorker(pool, mockSender, { batchSize: 1 });
  await Promise.all([workerA.runOnce(), workerB.runOnce()]);
  const parallelDeliveries = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE issue_id = $1 ORDER BY id`,
    [workerIssueId],
  );
  assert.equal(parallelDeliveries.rows.length, 2);
  assert.ok(
    parallelDeliveries.rows.every(({ status, attempts }) => status === 'sent' && attempts === 1),
  );
  assert.equal(new Set(sentEndpoints).size, 2);

  const expiredLease = await pool.query(
    `UPDATE public.notification_deliveries
     SET status = 'claimed', sent_at = NULL, claimed_at = clock_timestamp(),
         lease_until = clock_timestamp() - interval '1 second'
     WHERE id = (SELECT id FROM public.notification_deliveries WHERE issue_id = $1 ORDER BY id LIMIT 1)
     RETURNING id`,
    [workerIssueId],
  );
  const leaseWorker = createNotificationWorker(pool, mockSender, { batchSize: 1 });
  await leaseWorker.runOnce();
  const leaseRecovered = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE id = $1`,
    [expiredLease.rows[0].id],
  );
  assert.deepEqual(leaseRecovered.rows[0], { status: 'sent', attempts: 2 });

  const retryDelivery = await pool.query(
    `UPDATE public.notification_deliveries SET status = 'pending', sent_at = NULL, available_at = clock_timestamp()
     WHERE id = (SELECT id FROM public.notification_deliveries WHERE issue_id = $1 ORDER BY id LIMIT 1)
     RETURNING id`,
    [workerIssueId],
  );
  const retryId = retryDelivery.rows[0].id;
  let retryProviderAccepts = 0;
  const failingWorker = createNotificationWorker(
    pool,
    {
      async send() {
        retryProviderAccepts += 1;
        throw Object.assign(new Error('provider unavailable'), { statusCode: 503 });
      },
    },
    { batchSize: 1 },
  );
  await failingWorker.runOnce();
  const retryState = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE id = $1`,
    [retryId],
  );
  assert.deepEqual(retryState.rows[0], { status: 'pending', attempts: 3 });
  await pool.query(
    `UPDATE public.notification_deliveries SET available_at = clock_timestamp() WHERE id = $1`,
    [retryId],
  );
  const restartedWorker = createNotificationWorker(
    pool,
    {
      async send() {
        retryProviderAccepts += 1;
      },
    },
    { batchSize: 1 },
  );
  await restartedWorker.runOnce();
  const recovered = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE id = $1`,
    [retryId],
  );
  assert.deepEqual(recovered.rows[0], { status: 'sent', attempts: 4 });
  assert.equal(retryProviderAccepts, 2);

  await pool.query(
    `UPDATE public.notification_deliveries SET status = 'pending', sent_at = NULL,
       available_at = clock_timestamp()
     WHERE id = $1`,
    [retryId],
  );
  let acceptedBeforeLostResponse = 0;
  const lostResponseWorker = createNotificationWorker(
    pool,
    {
      async send() {
        acceptedBeforeLostResponse += 1;
        if (acceptedBeforeLostResponse === 1)
          throw new Error('Push provider accepted the message but its response was lost');
      },
    },
    { batchSize: 1 },
  );
  await lostResponseWorker.runOnce();
  const pendingAfterLostResponse = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE id = $1`,
    [retryId],
  );
  assert.deepEqual(pendingAfterLostResponse.rows[0], { status: 'pending', attempts: 5 });
  await pool.query(
    `UPDATE public.notification_deliveries SET available_at = clock_timestamp() WHERE id = $1`,
    [retryId],
  );
  const lostResponseRetryWorker = createNotificationWorker(
    pool,
    {
      async send() {
        acceptedBeforeLostResponse += 1;
      },
    },
    { batchSize: 1 },
  );
  await lostResponseRetryWorker.runOnce();
  const sentAfterLostResponse = await pool.query(
    `SELECT status, attempts FROM public.notification_deliveries WHERE id = $1`,
    [retryId],
  );
  assert.deepEqual(sentAfterLostResponse.rows[0], { status: 'sent', attempts: 6 });
  assert.equal(acceptedBeforeLostResponse, 2);
  const stableIntents = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM public.notifications WHERE issue_id = $1) AS notices,
       (SELECT count(*)::int FROM public.notification_deliveries WHERE issue_id = $1) AS deliveries`,
    [workerIssueId],
  );
  assert.deepEqual(stableIntents.rows[0], { notices: 1, deliveries: 2 });
  console.log(
    'Push worker verified: concurrent devices, lease recovery, transient retry, and at-least-once retry after provider acceptance with a lost response.',
  );

  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/events']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/start']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/return']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/release']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/complete']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/parks/{parkId}'].delete);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/parks/{parkId}/restore'].post);
  assert.ok(
    app.swagger().paths['/api/workspaces/{workspaceId}/parks/{parkId}/turbines/{turbineId}'].delete,
  );
  console.log(
    'Authorized issue reads/writes, tenant isolation, pagination, atomic receipts, revision conflicts, equipment lifecycle, revocation and transactional issue/equipment races verified.',
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
