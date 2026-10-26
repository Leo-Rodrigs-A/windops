import {
  acceptWorkspaceInvitationSchema,
  createWorkspaceInvitationSchema,
  type WorkspaceContext,
  type WorkspaceDirectoryPage,
  type WorkspaceInvitation,
  type WorkspaceInvitationsPage,
  type WorkspaceMemberMutation,
  type WorkspaceMembersPage,
  workspaceContextSchema,
  workspaceDirectoryPageSchema,
  workspaceInvitationSchema,
  workspaceInvitationsPageSchema,
  workspaceMemberMutationSchema,
  workspaceMembersPageSchema,
} from '@windops/contracts';
import { requestJson } from './auth-api';

type PageQuery = { cursor?: string; limit?: number };

export async function getWorkspaceMembers(workspaceId: string, query: PageQuery = {}) {
  return workspaceMembersPageSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/members${queryString(query)}`),
  ) as WorkspaceMembersPage;
}

export async function getWorkspaceDirectory(
  workspaceId: string,
  query: PageQuery & { search?: string } = {},
) {
  return workspaceDirectoryPageSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/directory${queryString(query)}`),
  ) as WorkspaceDirectoryPage;
}

export async function getWorkspaceInvitations(workspaceId: string, query: PageQuery = {}) {
  return workspaceInvitationsPageSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/invitations${queryString(query)}`),
  ) as WorkspaceInvitationsPage;
}

export async function createWorkspaceInvitation(
  workspaceId: string,
  input: { email: string; role: 'admin' | 'technician' },
) {
  const body = createWorkspaceInvitationSchema.parse(input);
  return workspaceInvitationSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as WorkspaceInvitation;
}

export async function resendWorkspaceInvitation(workspaceId: string, invitationId: string) {
  return workspaceInvitationSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/invitations/${invitationId}/resend`, {
      method: 'POST',
    }),
  ) as WorkspaceInvitation;
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  membershipId: string,
  role: 'admin' | 'technician',
  expectedRevision: number,
) {
  return workspaceMemberMutationSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/members/${membershipId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, expectedRevision }),
    }),
  ) as WorkspaceMemberMutation;
}

export async function revokeWorkspaceMember(
  workspaceId: string,
  membershipId: string,
  expectedRevision: number,
) {
  return workspaceMemberMutationSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/members/${membershipId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ expectedRevision }),
    }),
  ) as WorkspaceMemberMutation;
}

export async function acceptWorkspaceInvitation(token: string): Promise<WorkspaceContext> {
  const body = acceptWorkspaceInvitationSchema.parse({ token });
  return workspaceContextSchema.parse(
    await requestJson('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

function workspacePath(workspaceId: string) {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}`;
}

function queryString(query: PageQuery & { search?: string }) {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.search?.trim()) params.set('search', query.search.trim());
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}
