import { expect, it } from 'vitest';
import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceInvitationSchema,
  errorSchema,
  healthSchema,
  revokeWorkspaceMemberSchema,
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
