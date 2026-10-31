import { describe, expect, it } from 'vitest';
import type {
  LocalIssueCommand,
  LocalIssueProjection,
  LocalIssueStore,
} from '../../offline/local-issue-store';
import {
  localIssueListEntries,
  localLocations,
  pendingLocalEntries,
  type StatusFilter,
} from './model';

const projection: LocalIssueProjection = {
  id: 'issue-1',
  workspaceId: 'workspace-1',
  serverRevision: 2,
  serverActive: true,
  localRevision: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
  local: { parkId: 'park-1', turbineId: 'turbine-1', text: 'Texto local', status: 'pending' },
  serverIssue: {
    id: 'issue-1',
    workspaceId: 'workspace-1',
    parkId: 'park-1',
    turbineId: 'turbine-1',
    text: 'Texto do servidor',
    status: 'pending',
    completionReport: null,
    revision: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
};

const command: LocalIssueCommand = {
  id: 'command-1',
  issueId: 'issue-1',
  chainId: 'issue-1',
  workspaceId: 'workspace-1',
  kind: 'update',
  payload: { text: 'Texto local' },
  status: 'waiting_auth',
  dependsOn: null,
  baseServerRevision: 2,
  createdAt: '2026-01-03T00:00:00.000Z',
  attemptedAt: null,
  frozenPayload: null,
  blockReason: null,
};

function createStore(filter: StatusFilter = 'all') {
  const store = {
    listPendingCommands: () => [command],
    listIssues: () => [projection],
    listReplica: (table: string) =>
      table === 'parks'
        ? [{ id: 'park-1', code: 'P001' }]
        : [{ id: 'turbine-1', parkId: 'park-1', code: 'T001' }],
  } as unknown as LocalIssueStore;
  return { store, filter };
}

describe('issue feature view model', () => {
  it('projects pending edits into the active list and pending journal section', () => {
    const { store, filter } = createStore();
    expect(localIssueListEntries(store, filter)).toMatchObject([
      { id: 'issue-1', status: 'pending', text: 'Texto local' },
    ]);
    expect(pendingLocalEntries(store, filter)).toHaveLength(1);
    expect(localIssueListEntries(store, 'in_progress')).toHaveLength(0);
  });

  it('resolves replica identifiers to catalog labels', () => {
    const { store } = createStore();
    expect(localLocations(store)).toEqual({
      'park-1:turbine-1': { park: 'P001', turbine: 'T001' },
    });
  });
});
