import { describe, expect, it } from 'vitest';
import type {
  LocalIssueCommand,
  LocalIssueProjection,
  LocalIssueStore,
} from '../../offline/local-issue-store';
import {
  compareIssuesByRecency,
  localIssueListEntries,
  localLocations,
  offlineIssueListEntries,
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
        ? [{ id: 'park-1', code: 'Parque 01' }]
        : [{ id: 'turbine-1', parkId: 'park-1', code: 'ZAC-01-01' }],
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
      'park-1:turbine-1': { park: 'Parque 01', turbine: 'ZAC-01-01' },
    });
  });

  it('keeps a newly created offline issue ahead of older cached issues', () => {
    const serverIssue = projection.serverIssue;
    if (!serverIssue) throw new Error('Fixture must contain a server issue.');
    const olderProjection: LocalIssueProjection = {
      ...projection,
      id: 'issue-october',
      createdAt: '2026-10-31T18:00:00.000Z',
      updatedAt: '2026-10-31T18:00:00.000Z',
      serverIssue: {
        ...serverIssue,
        id: 'issue-october',
        createdAt: '2026-10-31T18:00:00.000Z',
      },
    };
    const newOfflineProjection: LocalIssueProjection = {
      ...projection,
      id: 'issue-november',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
      serverIssue: null,
      local: { ...projection.local, status: 'local', text: 'Criada sem conexão' },
    };
    const createCommand: LocalIssueCommand = {
      ...command,
      id: 'command-create-november',
      issueId: 'issue-november',
      kind: 'create',
      status: 'pending',
      createdAt: '2026-11-02T12:00:00.000Z',
    };
    const store = {
      listPendingCommands: () => [createCommand],
      listIssues: () => [olderProjection, newOfflineProjection],
    } as unknown as LocalIssueStore;

    expect(localIssueListEntries(store, 'all').map((issue) => issue.id)).toEqual([
      'issue-november',
      'issue-october',
    ]);
    expect(localIssueListEntries(store, 'all')[0]?.createdAt).toBe(createCommand.createdAt);
  });

  it('places issues without parseable timestamps after dated issues', () => {
    const newest = {
      id: 'issue-november',
      createdAt: '2026-11-02T12:00:00.000Z',
    };
    const older = {
      id: 'issue-october',
      createdAt: '2026-10-28T12:00:00.000Z',
    };
    const missingTime = { id: 'zz-issue-with-invalid-date', createdAt: 'unknown' };

    expect([older, missingTime, newest].sort(compareIssuesByRecency)).toEqual([
      newest,
      older,
      missingTime,
    ]);
  });

  it('preserves chronological order when offline filtering journal insertion order', () => {
    const serverIssue = projection.serverIssue;
    if (!serverIssue) throw new Error('Fixture must contain a server issue.');
    const octoberIssue: LocalIssueProjection = {
      ...projection,
      id: 'issue-october',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
      serverIssue: {
        ...serverIssue,
        id: 'issue-october',
        createdAt: '2026-10-28T12:00:00.000Z',
      },
    };
    const novemberIssue: LocalIssueProjection = {
      ...projection,
      id: 'issue-november-later',
      createdAt: '2026-11-02T12:10:00.000Z',
      updatedAt: '2026-11-02T12:10:00.000Z',
      serverIssue: null,
      local: { ...projection.local, status: 'local', text: 'Primeira criada offline' },
    };
    const firstCreateCommand: LocalIssueCommand = {
      ...command,
      id: 'command-create-november-later',
      issueId: 'issue-november-later',
      kind: 'create',
      status: 'pending',
      createdAt: '2026-11-02T12:10:00.000Z',
    };
    const secondNovemberIssue: LocalIssueProjection = {
      ...novemberIssue,
      id: 'issue-november-earlier',
      createdAt: '2026-11-02T12:00:00.000Z',
      updatedAt: '2026-11-02T12:00:00.000Z',
      local: { ...novemberIssue.local, text: 'Segunda criada offline' },
    };
    const secondCreateCommand: LocalIssueCommand = {
      ...firstCreateCommand,
      id: 'command-create-november-earlier',
      issueId: 'issue-november-earlier',
      createdAt: '2026-11-02T12:00:00.000Z',
    };
    const projections = new Map([
      [octoberIssue.id, octoberIssue],
      [novemberIssue.id, novemberIssue],
      [secondNovemberIssue.id, secondNovemberIssue],
    ]);
    const store = {
      listPendingCommands: () => [firstCreateCommand, secondCreateCommand],
      listIssues: () => [octoberIssue, novemberIssue, secondNovemberIssue],
      getIssue: (id: string) => projections.get(id),
    } as unknown as LocalIssueStore;

    expect(
      offlineIssueListEntries(store, 'all', { status: 'active' }).map((issue) => issue.id),
    ).toEqual(['issue-november-later', 'issue-november-earlier', 'issue-october']);
  });
});
