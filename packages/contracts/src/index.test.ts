import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  acceptWorkspaceInvitationSchema,
  createIssueSchema,
  createParkSchema,
  createTurbineSchema,
  createWorkspaceInvitationSchema,
  equipmentLifecycleCommandSchema,
  errorSchema,
  healthSchema,
  issueEventQuerySchema,
  issueSchema,
  issuesQuerySchema,
  parkLifecycleResultSchema,
  parkSchema,
  parksQuerySchema,
  revokeWorkspaceMemberSchema,
  turbineLifecycleResultSchema,
  turbineSchema,
  updateIssueSchema,
  updateParkSchema,
  updateTurbineSchema,
  updateWorkspaceMemberRoleSchema,
  workspaceDirectoryAccountSchema,
  workspaceInvitationSchema,
  workspaceListQuerySchema,
  workspaceMembersQuerySchema,
} from './index.js';

it('rejects false-positive health', () => {
  expect(healthSchema.safeParse({ status: 'down', service: 'windops-api' }).success).toBe(false);
});
it('requires traceable errors', () => {
  expect(errorSchema.safeParse({ error: { code: 'FAIL', message: 'failure' } }).success).toBe(
    false,
  );
});

it('normalizes invitation email and defaults invited members to technician', () => {
  expect(createWorkspaceInvitationSchema.parse({ email: '  TECH@Example.com  ' })).toEqual({
    email: 'tech@example.com',
    role: 'technician',
  });
});

it('rejects malformed invitation tokens and roles', () => {
  expect(acceptWorkspaceInvitationSchema.safeParse({ token: 'short' }).success).toBe(false);
  expect(
    createWorkspaceInvitationSchema.safeParse({ email: 'tech@example.com', role: 'owner' }).success,
  ).toBe(false);
  expect(updateWorkspaceMemberRoleSchema.safeParse({ role: 'owner' }).success).toBe(false);
  expect(
    updateWorkspaceMemberRoleSchema.safeParse({ role: 'technician', expectedRevision: 1 }).success,
  ).toBe(true);
  expect(
    updateWorkspaceMemberRoleSchema.safeParse({ role: 'admin', expectedRevision: 0 }).success,
  ).toBe(false);
  expect(
    updateWorkspaceMemberRoleSchema.safeParse({ role: 'admin', expectedRevision: 1 }).success,
  ).toBe(true);
  expect(revokeWorkspaceMemberSchema.safeParse({ expectedRevision: 1 }).success).toBe(true);
  expect(revokeWorkspaceMemberSchema.safeParse({ expectedRevision: -1 }).success).toBe(false);
});

it('bounds team directory pagination and search', () => {
  expect(workspaceListQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(workspaceListQuerySchema.safeParse({ limit: 1000 }).success).toBe(false);
  expect(workspaceListQuerySchema.safeParse({ limit: 10, workspaceId: 'forged' }).success).toBe(
    false,
  );
});

it('bounds member pagination and rejects sensitive fields in directory DTOs', () => {
  expect(workspaceMembersQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(workspaceMembersQuerySchema.parse({ search: '  leo@example.com ' })).toEqual({
    limit: 25,
    search: 'leo@example.com',
  });
  expect(workspaceMembersQuerySchema.safeParse({ cursor: 'invalid' }).success).toBe(false);
  expect(workspaceMembersQuerySchema.safeParse({ search: ' ' }).success).toBe(false);
  expect(workspaceListQuerySchema.safeParse({ limit: 10, search: '   ' }).success).toBe(false);
  const account = {
    id: 'c65e443d-9003-4e89-877c-11b42ea693dd',
    name: 'Tech',
    email: 'tech@example.com',
    createdAt: '2026-10-25T00:00:00.000Z',
  };
  expect(workspaceDirectoryAccountSchema.safeParse(account).success).toBe(true);
  expect(
    workspaceDirectoryAccountSchema.safeParse({ ...account, password: 'never-return' }).success,
  ).toBe(false);
});

it('requires invitation responses to omit raw tokens and include delivery state', () => {
  const response = {
    id: 'c65e443d-9003-4e89-877c-11b42ea693dd',
    email: 'tech@example.com',
    role: 'technician',
    status: 'pending',
    deliveryStatus: 'sent',
    createdAt: '2026-10-25T00:00:00.000Z',
    expiresAt: '2026-10-27T00:00:00.000Z',
    sentAt: '2026-10-25T00:00:00.000Z',
  };
  expect(workspaceInvitationSchema.safeParse(response).success).toBe(true);
  expect(
    workspaceInvitationSchema.safeParse({ ...response, token: 'should-not-be-returned' }).success,
  ).toBe(false);
});

it('normalizes park and turbine codes and rejects malformed or forged fields', () => {
  expect(createParkSchema.parse({ code: ' p01 ' })).toEqual({ code: 'P01' });
  expect(createTurbineSchema.parse({ code: 't000123' })).toEqual({ code: 'T000123' });
  for (const code of ['P1', 'P1234567', 'T01', 'P-01', 'P０１']) {
    expect(createParkSchema.safeParse({ code }).success).toBe(false);
  }
  expect(createTurbineSchema.safeParse({ code: 't1' }).success).toBe(false);
  expect(createParkSchema.safeParse({ code: 'P01', workspaceId: randomUUID() }).success).toBe(
    false,
  );
});

it('validates catalog DTOs, pagination, and optimistic revisions', () => {
  const timestamp = '2026-10-26T12:00:00.000Z';
  const parkId = randomUUID();
  const park = {
    id: parkId,
    workspaceId: randomUUID(),
    code: 'P01',
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
    deactivatedAt: null,
  };
  expect(parkSchema.safeParse(park).success).toBe(true);
  expect(turbineSchema.safeParse({ ...park, parkId, code: 'T01' }).success).toBe(true);
  expect(parkSchema.safeParse({ ...park, revision: 0 }).success).toBe(false);
  expect(updateParkSchema.safeParse({ code: 'P02', expectedRevision: 1 }).success).toBe(true);
  expect(updateParkSchema.safeParse({ code: 'P02', expectedRevision: 0 }).success).toBe(false);
  expect(updateTurbineSchema.safeParse({ code: 'T02', expectedRevision: 1 }).success).toBe(true);
  expect(
    equipmentLifecycleCommandSchema.safeParse({ commandId: randomUUID(), expectedRevision: 1 })
      .success,
  ).toBe(true);
  expect(
    equipmentLifecycleCommandSchema.safeParse({ commandId: randomUUID(), expectedRevision: 0 })
      .success,
  ).toBe(false);
  expect(parksQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(parksQuerySchema.parse({ search: ' P0 ', limit: 100 })).toEqual({
    limit: 100,
    search: 'P0',
  });
  expect(parksQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(parksQuerySchema.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
  expect(parksQuerySchema.safeParse({ workspaceId: randomUUID() }).success).toBe(false);
  const deletedPark = { result: 'deleted', id: parkId, workspaceId: randomUUID(), code: 'P01' };
  expect(parkLifecycleResultSchema.safeParse(deletedPark).success).toBe(true);
  expect(parkLifecycleResultSchema.safeParse({ ...deletedPark, result: 'archived' }).success).toBe(
    false,
  );
  expect(
    turbineLifecycleResultSchema.safeParse({
      result: 'deleted',
      id: randomUUID(),
      workspaceId: randomUUID(),
      parkId,
      code: 'T01',
    }).success,
  ).toBe(true);
});

it('validates issue contracts, strict fields, text limits, location pairs, and pagination', () => {
  const workspaceId = randomUUID();
  const user = { id: randomUUID(), name: 'Tech', email: 'tech@example.com' };
  const issue = {
    id: randomUUID(),
    workspaceId,
    parkId: randomUUID(),
    turbineId: randomUUID(),
    creatorMembershipId: randomUUID(),
    creator: user,
    handlerMembershipId: null,
    handler: null,
    text: 'Elevador parado',
    status: 'pending',
    createdAt: '2026-10-26T12:00:00.000Z',
    updatedAt: '2026-10-26T12:00:00.000Z',
    revision: 1,
  };
  expect(issueSchema.safeParse(issue).success).toBe(true);
  expect(issueSchema.safeParse({ ...issue, status: 'completed' }).success).toBe(false);
  expect(issueSchema.safeParse({ ...issue, password: 'private' }).success).toBe(false);
  expect(issuesQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(issuesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(issuesQuerySchema.safeParse({ where: 'workspace_id=...' }).success).toBe(false);
  expect(issuesQuerySchema.safeParse({ cursor: 'invalid' }).success).toBe(false);
  expect(issueEventQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(issueEventQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(
    createIssueSchema.safeParse({
      commandId: randomUUID(),
      issueId: randomUUID(),
      parkId: randomUUID(),
      turbineId: randomUUID(),
      text: '  problema  ',
    }).success,
  ).toBe(true);
  expect(
    createIssueSchema.safeParse({
      commandId: randomUUID(),
      issueId: randomUUID(),
      parkId: randomUUID(),
      turbineId: randomUUID(),
      text: '   ',
    }).success,
  ).toBe(false);
  expect(
    createIssueSchema.safeParse({
      commandId: 'invalid',
      issueId: randomUUID(),
      parkId: randomUUID(),
      turbineId: randomUUID(),
      text: 'problema',
    }).success,
  ).toBe(false);
  expect(
    createIssueSchema.safeParse({
      commandId: randomUUID(),
      issueId: randomUUID(),
      parkId: randomUUID(),
      turbineId: randomUUID(),
      text: 'x'.repeat(10_001),
    }).success,
  ).toBe(false);
  expect(
    createIssueSchema.safeParse({
      commandId: randomUUID(),
      issueId: randomUUID(),
      workspaceId,
      parkId: randomUUID(),
      turbineId: randomUUID(),
      text: 'problema',
    }).success,
  ).toBe(false);
  expect(
    updateIssueSchema.safeParse({ commandId: randomUUID(), expectedRevision: 1, text: 'ok' })
      .success,
  ).toBe(true);
  expect(
    updateIssueSchema.safeParse({
      commandId: randomUUID(),
      expectedRevision: 1,
      parkId: randomUUID(),
    }).success,
  ).toBe(false);
  expect(
    updateIssueSchema.safeParse({ commandId: randomUUID(), expectedRevision: 0, text: 'ok' })
      .success,
  ).toBe(false);
});
