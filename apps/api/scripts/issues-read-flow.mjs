import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createAuditService } from '../src/modules/audit/index.ts';
import { createIssuesService } from '../src/modules/issues/index.ts';
import { createParksCatalogService } from '../src/modules/parks/index.ts';
import { createSyncService } from '../src/modules/sync/index.ts';
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
  const parks = createParksCatalogService(pool, authorization);
  const issues = createIssuesService(pool, identity, {
    authorization,
    parks,
    audit: createAuditService(),
    sync: createSyncService(),
  });
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

  const createdIssueId = randomUUID();
  const createCommandId = randomUUID();
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
       (SELECT count(*)::int FROM public.sync_commands WHERE actor_user_id = $2
         AND command_id = ANY($3::uuid[])) AS receipts`,
    [createdIssueId, ids.tech.id, [createCommandId, updateCommandId]],
  );
  assert.deepEqual(countsAfterReplay.rows[0], { issues: 1, events: 2, receipts: 2 });
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
      audit: createAuditService(),
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
  const realAudit = createAuditService();
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
    audit: createAuditService(),
    sync: createSyncService(),
  });
  app = buildApp({
    ready: async () => {},
    workspaceAuthorization: authorization,
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

  const revokedHandlerIssueId = randomUUID();
  const revokedHandlerCreate = await issues.createIssue(headers(ids.tech), ids.workspaceA, {
    commandId: randomUUID(),
    issueId: revokedHandlerIssueId,
    parkId: parkIds.active,
    turbineId: turbineIds.active,
    text: 'Liberação após revogação',
  });
  assert.equal(revokedHandlerCreate.status, 'ok');
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
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/start']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/return']);
  assert.ok(app.swagger().paths['/api/workspaces/{workspaceId}/issues/{issueId}/release']);
  console.log(
    'Authorized issue reads and writes, tenant isolation, deterministic pagination, atomic audit/receipts, idempotent retries, revision conflicts, archived equipment rules, revocation and transactional equipment references verified.',
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
