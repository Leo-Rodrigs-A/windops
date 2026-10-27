import {
  type CreateIssue,
  createIssueSchema,
  type Issue,
  type IssueEventPage,
  type IssueEventQuery,
  type IssuesPage,
  type IssuesQuery,
  issueEventPageSchema,
  issueSchema,
  issuesPageSchema,
  type ReleaseIssue,
  type ReturnIssue,
  releaseIssueSchema,
  returnIssueSchema,
  type StartIssue,
  startIssueSchema,
  type UpdateIssue,
  updateIssueSchema,
} from '@windops/contracts';
import { requestJson } from './auth-api';

function issuesPath(workspaceId: string, issueId?: string) {
  const root = `/api/workspaces/${encodeURIComponent(workspaceId)}/issues`;
  return issueId ? `${root}/${encodeURIComponent(issueId)}` : root;
}

function queryString(query: Partial<IssuesQuery> | Partial<IssueEventQuery>) {
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);
  if ('status' in query && query.status) params.set('status', query.status);
  if ('parkId' in query && query.parkId) params.set('parkId', query.parkId);
  if ('turbineId' in query && query.turbineId) params.set('turbineId', query.turbineId);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export async function getIssues(workspaceId: string, query: Partial<IssuesQuery> = {}) {
  return issuesPageSchema.parse(
    await requestJson(`${issuesPath(workspaceId)}${queryString(query)}`),
  ) as IssuesPage;
}

export async function getIssue(workspaceId: string, issueId: string) {
  return issueSchema.parse(await requestJson(issuesPath(workspaceId, issueId))) as Issue;
}

export async function getIssueEvents(
  workspaceId: string,
  issueId: string,
  query: Partial<IssueEventQuery> = {},
) {
  return issueEventPageSchema.parse(
    await requestJson(`${issuesPath(workspaceId, issueId)}/events${queryString(query)}`),
  ) as IssueEventPage;
}

export async function createIssue(workspaceId: string, input: CreateIssue) {
  const body = createIssueSchema.parse(input);
  return issueSchema.parse(
    await requestJson(issuesPath(workspaceId), { method: 'POST', body: JSON.stringify(body) }),
  ) as Issue;
}

export async function updateIssue(workspaceId: string, issueId: string, input: UpdateIssue) {
  const body = updateIssueSchema.parse(input);
  return issueSchema.parse(
    await requestJson(issuesPath(workspaceId, issueId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  ) as Issue;
}

export async function startIssue(workspaceId: string, issueId: string, input: StartIssue) {
  const body = startIssueSchema.parse(input);
  return issueSchema.parse(
    await requestJson(`${issuesPath(workspaceId, issueId)}/start`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as Issue;
}

export async function returnIssue(workspaceId: string, issueId: string, input: ReturnIssue) {
  const body = returnIssueSchema.parse(input);
  return issueSchema.parse(
    await requestJson(`${issuesPath(workspaceId, issueId)}/return`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as Issue;
}

export async function releaseIssue(workspaceId: string, issueId: string, input: ReleaseIssue) {
  const body = releaseIssueSchema.parse(input);
  return issueSchema.parse(
    await requestJson(`${issuesPath(workspaceId, issueId)}/release`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ) as Issue;
}
