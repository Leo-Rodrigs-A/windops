import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { buildApp } from '../src/app.ts';
import { createSyncShapeProxy } from '../src/modules/sync/index.ts';
import { createWorkspaceAuthorizationService } from '../src/modules/workspaces/index.ts';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
for (const key of ['DATABASE_URL', 'ELECTRIC_URL', 'ELECTRIC_SECRET'])
  assert.ok(process.env[key], `${key} is required.`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
let expireAfterFirstAuthorization = false;
let authorizationCalls = 0;

const identity = {
  async resolveAuthenticatedUser(headers) {
    authorizationCalls += 1;
    if (!headers['x-sync-user'] || headers['x-sync-step'] === 'pending') return null;
    if (expireAfterFirstAuthorization && authorizationCalls > 1) return null;
    return {
      id: headers['x-sync-user'],
      name: 'S03 sync proxy integration',
      email: 's03-sync-proxy@example.invalid',
    };
  },
};
const authorization = createWorkspaceAuthorizationService(
  pool,
  identity,
  { send: async () => {} },
  'http://localhost:5173',
);
const proxy = createSyncShapeProxy({
  authorization,
  electricUrl: process.env.ELECTRIC_URL,
  electricSecret: process.env.ELECTRIC_SECRET,
});
const app = buildApp({
  ready: async () => {},
  workspaceAuthorization: authorization,
  syncProxy: proxy,
});
try {
  const member = await pool.query(
    `SELECT workspace_id AS "workspaceId", user_id AS "userId"
     FROM public.workspace_members
     WHERE revoked_at IS NULL
     ORDER BY workspace_id, id
     LIMIT 1`,
  );
  const active = member.rows[0];
  assert.ok(active, 'The dev database needs one active workspace member for this smoke test.');
  const workspaceId = active.workspaceId;
  const anonymous = await app.inject(`/api/sync/workspace?workspaceId=${workspaceId}`);
  assert.equal(anonymous.statusCode, 401);
  const pending = await app.inject({
    url: `/api/sync/workspace?workspaceId=${workspaceId}`,
    headers: { 'x-sync-user': active.userId, 'x-sync-step': 'pending' },
  });
  assert.equal(pending.statusCode, 401);
  const crossTenant = await app.inject({
    url: `/api/sync/workspace?workspaceId=90000000-0000-4000-8000-000000000001`,
    headers: { 'x-sync-user': active.userId },
  });
  assert.equal(crossTenant.statusCode, 403);
  const injectedFilter = await app.inject({
    url: `/api/sync/issues?workspaceId=${workspaceId}&where=workspace_id%20%3D%20true`,
    headers: { 'x-sync-user': active.userId },
  });
  assert.equal(injectedFilter.statusCode, 400);

  const initial = await app.inject({
    url: `/api/sync/workspace?workspaceId=${workspaceId}&offset=-1`,
    headers: { 'x-sync-user': active.userId, cookie: 'session=must-not-reach-electric' },
  });
  assert.equal(initial.statusCode, 200, initial.body);
  assert.equal(initial.headers['cache-control'], 'no-store, private');
  const handle = initial.headers['electric-handle'];
  const offset = initial.headers['electric-offset'];
  assert.ok(handle && offset, 'Electric should return the shape handle and offset.');
  const swappedHandle = await app.inject({
    url: `/api/sync/workspace?workspaceId=90000000-0000-4000-8000-000000000001&handle=${encodeURIComponent(handle)}&offset=${encodeURIComponent(offset)}`,
    headers: { 'x-sync-user': active.userId },
  });
  assert.equal(swappedHandle.statusCode, 403, 'A handle must not grant access to another tenant.');
  const snapshot = initial.json();
  assert.ok(Array.isArray(snapshot));
  assert.ok(
    snapshot.some((message) => message.value?.id === workspaceId),
    'The authorized workspace shape should contain exactly its workspace row.',
  );
  assert.ok(
    snapshot
      .filter((message) => message.value)
      .every((message) => message.value.id === workspaceId),
    'Every row in the workspace shape must match the authorized workspace.',
  );

  const activeIssues = await app.inject({
    url: `/api/sync/issues?workspaceId=${workspaceId}&offset=-1`,
    headers: { 'x-sync-user': active.userId },
  });
  assert.equal(activeIssues.statusCode, 200, activeIssues.body);
  const activeIssueIds = new Set(
    activeIssues.json().flatMap((message) => (message.value?.id ? [message.value.id] : [])),
  );
  const issueEvents = await app.inject({
    url: `/api/sync/issue-events?workspaceId=${workspaceId}&offset=-1`,
    headers: { 'x-sync-user': active.userId },
  });
  assert.equal(issueEvents.statusCode, 200, issueEvents.body);
  assert.ok(
    issueEvents
      .json()
      .filter((message) => message.value)
      .every(
        (message) =>
          message.value.workspace_id === workspaceId && activeIssueIds.has(message.value.issue_id),
      ),
    'Issue events must be tenant-scoped and limited to issues in the active shape.',
  );

  authorizationCalls = 0;
  expireAfterFirstAuthorization = true;
  const startedAt = Date.now();
  const revokedDuringPoll = await app.inject({
    url: `/api/sync/workspace?workspaceId=${workspaceId}&handle=${encodeURIComponent(handle)}&offset=${encodeURIComponent(offset)}&live=true`,
    headers: { 'x-sync-user': active.userId },
  });
  const elapsedMs = Date.now() - startedAt;
  assert.equal(revokedDuringPoll.statusCode, 401, revokedDuringPoll.body);
  assert.ok(elapsedMs <= 12_000, `Revocation took ${elapsedMs}ms; maximum is 12000ms.`);
  assert.equal(authorizationCalls, 2);
  console.log(
    `Electric proxy auth, active issue/event shapes, fixed scope and revocation window verified (${elapsedMs}ms).`,
  );
} finally {
  await app.close();
  await pool.end();
}
