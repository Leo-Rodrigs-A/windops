import {
  acceptWorkspaceInvitationSchema,
  createParkSchema,
  createTurbineSchema,
  createWorkspaceInvitationSchema,
  equipmentLifecycleCommandSchema,
  type Park,
  type ParkLifecycleResult,
  type ParksPage,
  type ParksQuery,
  parkLifecycleResultSchema,
  parkSchema,
  parksPageSchema,
  type Turbine,
  type TurbineLifecycleResult,
  type TurbinesPage,
  type TurbinesQuery,
  turbineLifecycleResultSchema,
  turbineSchema,
  turbinesPageSchema,
  updateParkSchema,
  updateTurbineSchema,
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

type PageQuery = { cursor?: string | undefined; limit?: number | undefined };

export async function getParks(workspaceId: string, query: Partial<ParksQuery> = {}) {
  return parksPageSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks${queryString(query)}`),
  ) as ParksPage;
}

export async function getPark(workspaceId: string, parkId: string) {
  return parkSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}`),
  ) as Park;
}

export async function getParkTurbines(
  workspaceId: string,
  parkId: string,
  query: Partial<TurbinesQuery> = {},
) {
  return turbinesPageSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines${queryString(query)}`,
    ),
  ) as TurbinesPage;
}

export async function getTurbine(workspaceId: string, parkId: string, turbineId: string) {
  return turbineSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines/${encodeURIComponent(turbineId)}`,
    ),
  ) as Turbine;
}

export async function createPark(workspaceId: string, input: { code: string }) {
  const body = createParkSchema.parse(input);
  return parkSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as Park;
}

export async function updatePark(
  workspaceId: string,
  parkId: string,
  input: { code: string; expectedRevision: number },
) {
  const body = updateParkSchema.parse(input);
  return parkSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  ) as Park;
}

export async function createTurbine(workspaceId: string, parkId: string, input: { code: string }) {
  const body = createTurbineSchema.parse(input);
  return turbineSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  ) as Turbine;
}

export async function updateTurbine(
  workspaceId: string,
  parkId: string,
  turbineId: string,
  input: { code: string; expectedRevision: number },
) {
  const body = updateTurbineSchema.parse(input);
  return turbineSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines/${encodeURIComponent(turbineId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  ) as Turbine;
}

export async function deletePark(
  workspaceId: string,
  parkId: string,
  input: { commandId: string; expectedRevision: number },
) {
  const body = equipmentLifecycleCommandSchema.parse(input);
  return parkLifecycleResultSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    }),
  ) as ParkLifecycleResult;
}

export async function restorePark(
  workspaceId: string,
  parkId: string,
  input: { commandId: string; expectedRevision: number },
) {
  const body = equipmentLifecycleCommandSchema.parse(input);
  return parkLifecycleResultSchema.parse(
    await requestJson(`${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/restore`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as ParkLifecycleResult;
}

export async function deleteTurbine(
  workspaceId: string,
  parkId: string,
  turbineId: string,
  input: { commandId: string; expectedRevision: number },
) {
  const body = equipmentLifecycleCommandSchema.parse(input);
  return turbineLifecycleResultSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines/${encodeURIComponent(turbineId)}`,
      { method: 'DELETE', body: JSON.stringify(body) },
    ),
  ) as TurbineLifecycleResult;
}

export async function restoreTurbine(
  workspaceId: string,
  parkId: string,
  turbineId: string,
  input: { commandId: string; expectedRevision: number },
) {
  const body = equipmentLifecycleCommandSchema.parse(input);
  return turbineLifecycleResultSchema.parse(
    await requestJson(
      `${workspacePath(workspaceId)}/parks/${encodeURIComponent(parkId)}/turbines/${encodeURIComponent(turbineId)}/restore`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  ) as TurbineLifecycleResult;
}

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

function queryString(query: PageQuery & { search?: string | undefined }) {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.search?.trim()) params.set('search', query.search.trim());
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}
