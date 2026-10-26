import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  acceptWorkspaceInvitationSchema,
  createParkSchema,
  createTurbineSchema,
  createWorkspaceInvitationSchema,
  errorSchema,
  healthSchema,
  parkSchema,
  parksQuerySchema,
  revokeWorkspaceMemberSchema,
  turbineSchema,
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
  expect(parksQuerySchema.parse({})).toEqual({ limit: 25 });
  expect(parksQuerySchema.parse({ search: ' P0 ', limit: 100 })).toEqual({
    limit: 100,
    search: 'P0',
  });
  expect(parksQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  expect(parksQuerySchema.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
  expect(parksQuerySchema.safeParse({ workspaceId: randomUUID() }).success).toBe(false);
});
