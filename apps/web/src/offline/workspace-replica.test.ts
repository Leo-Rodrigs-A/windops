import type { Message } from '@electric-sql/client';
import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { openLocalIssueStore, type ReplicaCollection } from './local-issue-store';
import { replicaCollections, WorkspaceReplica } from './workspace-replica';

const partition = {
  accountId: '10000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
};
const issueId = '30000000-0000-4000-8000-000000000001';
const parkId = '40000000-0000-4000-8000-000000000001';
const turbineId = '50000000-0000-4000-8000-000000000001';
const commandId = '60000000-0000-4000-8000-000000000001';
const stores: Array<{ close: () => void }> = [];

async function open(scope = partition) {
  const store = await openLocalIssueStore(scope, indexedDB);
  stores.push(store);
  return store;
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

type TestStream = {
  lastOffset: string;
  shapeHandle?: string;
  callback?: (messages: Message[]) => Promise<void>;
  subscribe: (callback: (messages: Message[]) => Promise<void>) => () => void;
  unsubscribeAll: () => void;
  emit: (messages: Message[], offset?: string) => Promise<void>;
};

function streamFactory() {
  const streams = new Map<ReplicaCollection, TestStream>();
  const factory = (collection: ReplicaCollection) => {
    const stream: TestStream = {
      lastOffset: '-1',
      shapeHandle: `handle-${collection}`,
      subscribe(callback) {
        this.callback = callback;
        return () => {};
      },
      unsubscribeAll() {},
      async emit(messages, offset = '1_0') {
        this.lastOffset = offset;
        await this.callback?.(messages);
      },
    };
    streams.set(collection, stream);
    return stream as never;
  };
  return { factory, streams };
}

function insert(id: string, row: Record<string, unknown>): Message {
  return {
    key: id,
    value: { id, ...row },
    headers: { operation: 'insert' },
  } as Message;
}

function control(name: 'up-to-date' | 'must-refetch'): Message {
  return { headers: { control: name } } as Message;
}

function issueRow(workspaceId = partition.workspaceId, revision = 1, text = 'Relato do servidor') {
  return {
    id: issueId,
    workspace_id: workspaceId,
    park_id: parkId,
    turbine_id: turbineId,
    text,
    completion_report: null,
    status: 'pending',
    created_at: '2026-10-27T12:00:00.000Z',
    updated_at: '2026-10-27T12:00:00.000Z',
    revision,
  };
}

describe('réplica local Electric', () => {
  it('refaz snapshot interrompido e só marca pronto após persistir os cinco snapshots', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const first = streamFactory();
    const replica = new WorkspaceReplica(store, first.factory);
    replica.start();
    await first.streams
      .get('parks')
      ?.emit([insert(parkId, { workspace_id: partition.workspaceId, code: 'P-1' })]);
    expect(store.isReplicaReady()).toBe(false);
    expect(store.listReplica('parks')).toHaveLength(0);
    replica.close();
    store.close();

    const reopened = await open(scope);
    const second = streamFactory();
    const resumed = new WorkspaceReplica(reopened, second.factory);
    resumed.start();
    expect(second.streams.get('parks')?.lastOffset).toBe('-1');
    for (const collection of replicaCollections) {
      const rows = collection === 'issues' ? [insert(issueId, issueRow(scope.workspaceId))] : [];
      await second.streams.get(collection)?.emit([...rows, control('up-to-date')]);
    }
    expect(reopened.isReplicaReady()).toBe(true);
    expect(reopened.listReplica('issues')[0]).toMatchObject({
      id: issueId,
      text: 'Relato do servidor',
    });
    await second.streams.get('parks')?.emit(
      [
        {
          key: parkId,
          value: { id: parkId, workspace_id: scope.workspaceId, code: 'P-2' },
          headers: { operation: 'update' },
        } as Message,
      ],
      '1_1',
    );
    expect(reopened.listReplica('parks')[0]).toMatchObject({ code: 'P-2' });
    resumed.close();

    reopened.close();
    const afterRestart = await open(scope);
    expect(afterRestart.isReplicaReady()).toBe(true);
    expect(afterRestart.listReplica('issues')).toHaveLength(1);
    expect(afterRestart.listReplica('parks')[0]).toMatchObject({ code: 'P-2' });
    expect(afterRestart.getCheckpoint('parks')?.offset).toBe('1_1');
  });

  it('mantém cache anterior durante resnapshot e troca os dados junto ao checkpoint', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const initial = {
      collection: 'parks' as const,
      changes: [],
      checkpoint: {
        collection: 'parks' as const,
        workspaceId: scope.workspaceId,
        offset: '1_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
      snapshotRows: [{ id: parkId, workspaceId: scope.workspaceId, code: 'P-antigo' }],
    };
    await store.applyReplicaBatch(initial);
    const fake = streamFactory();
    const replica = new WorkspaceReplica(store, fake.factory);
    replica.start();
    await fake.streams.get('parks')?.emit([control('must-refetch')]);
    expect(store.isReplicaReady()).toBe(false);
    expect(store.listReplica('parks')).toMatchObject([{ code: 'P-antigo' }]);
    await fake.streams
      .get('parks')
      ?.emit([insert(parkId, { workspace_id: scope.workspaceId, code: 'P-novo' })]);
    expect(store.listReplica('parks')).toMatchObject([{ code: 'P-antigo' }]);
    await fake.streams.get('parks')?.emit([control('up-to-date')], '2_0');
    expect(store.listReplica('parks')).toMatchObject([{ code: 'P-novo' }]);
    expect(store.getCheckpoint('parks')?.offset).toBe('2_0');
    replica.close();
  });

  it('reconcilia ACK antes da réplica e preserva intenção local em revisão concorrente e tombstone', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    await store.saveCreate({ issueId, commandId, parkId, turbineId, text: 'Relato local' });
    const ackIssue = {
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      text: 'Relato local',
      completionReport: null,
      status: 'pending' as const,
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:00:00.000Z',
      revision: 1,
    };
    await store.recordCommandAck(commandId, ackIssue);
    expect(store.getIssue(issueId)?.serverRevision).toBeNull();
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '1_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
      snapshotRows: [ackIssue],
    });
    expect(store.getCommand(commandId)?.status).toBe('confirmed');
    expect(store.getIssue(issueId)?.serverRevision).toBe(1);

    await store.saveUpdate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000002',
      text: 'Texto preservado',
    });
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [
        {
          operation: 'update',
          id: issueId,
          row: { ...ackIssue, text: 'Texto remoto', revision: 2 },
        },
      ],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '2_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(store.getCommand('60000000-0000-4000-8000-000000000002')?.status).toBe('conflict');
    expect(store.getIssue(issueId)?.local.text).toBe('Texto preservado');

    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [{ operation: 'delete', id: issueId }],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '3_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(store.listReplica('issues')).toHaveLength(0);
    expect(store.listReplica('issues', { includeInactive: true })).toHaveLength(1);
    expect(store.getIssue(issueId)?.local.text).toBe('Texto preservado');
    expect(store.listPendingCommands()).toHaveLength(1);

    const nextIssueId = '30000000-0000-4000-8000-000000000002';
    const nextCommandId = '60000000-0000-4000-8000-000000000003';
    await store.saveCreate({
      issueId: nextIssueId,
      commandId: nextCommandId,
      parkId,
      turbineId,
      text: 'ACK posterior',
    });
    const nextIssue = { ...ackIssue, id: nextIssueId, text: 'ACK posterior', revision: 1 };
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '4_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
      snapshotRows: [nextIssue],
    });
    expect(store.getIssue(nextIssueId)?.serverRevision).toBe(1);
    await store.recordCommandAck(nextCommandId, nextIssue);
    expect(store.getCommand(nextCommandId)?.status).toBe('confirmed');
    expect(store.getIssue(nextIssueId)?.serverRevision).toBe(1);

    const completeCommandId = '60000000-0000-4000-8000-000000000004';
    await store.queueMutation({
      issueId: nextIssueId,
      commandId: completeCommandId,
      kind: 'complete',
      payload: { commandId: completeCommandId, expectedRevision: 1, report: 'Concluído' },
    });
    const completedIssue = {
      ...nextIssue,
      status: 'completed' as const,
      completionReport: 'Concluído',
      revision: 2,
    };
    await store.recordCommandAck(completeCommandId, completedIssue);
    expect(store.getCommand(completeCommandId)?.status).toBe('confirmed_waiting_replica');
    expect(store.getIssue(nextIssueId)?.local.status).toBe('completed');
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [{ operation: 'delete', id: nextIssueId }],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '5_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(store.getCommand(completeCommandId)?.status).toBe('confirmed');
    expect(store.getIssue(nextIssueId)?.serverIssue?.status).toBe('completed');

    const departedId = '30000000-0000-4000-8000-000000000003';
    const departedCreateId = '60000000-0000-4000-8000-000000000005';
    await store.saveCreate({
      issueId: departedId,
      commandId: departedCreateId,
      parkId,
      turbineId,
      text: 'Concluído antes do ACK',
    });
    await store.setCommandStatus(departedCreateId, 'sending');
    const departedIssue = { ...ackIssue, id: departedId, text: 'Concluído antes do ACK' };
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [{ operation: 'insert', id: departedId, row: departedIssue }],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '6_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    await store.recordCommandAck(departedCreateId, departedIssue);
    const departedCompleteId = '60000000-0000-4000-8000-000000000006';
    await store.queueMutation({
      issueId: departedId,
      commandId: departedCompleteId,
      kind: 'complete',
      payload: { commandId: departedCompleteId, expectedRevision: 1 },
    });
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [{ operation: 'delete', id: departedId }],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '7_0',
        handle: 'h',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    await store.recordCommandAck(departedCompleteId, {
      ...departedIssue,
      status: 'completed',
      revision: 2,
    });
    expect(store.getCommand(departedCompleteId)?.status).toBe('confirmed');
  });

  it('limita eventos inativos sem remover os que têm comandos pendentes', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    await store.saveCreate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000007',
      parkId,
      turbineId,
      text: 'Comando ainda pendente',
    });
    const snapshot = Array.from({ length: 1_002 }, (_, index) => ({
      id: `event-${index}`,
      workspaceId: scope.workspaceId,
      issueId: index === 0 ? issueId : `issue-${index}`,
      occurredAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    }));
    const checkpoint = {
      collection: 'issue-events' as const,
      workspaceId: scope.workspaceId,
      offset: '1_0',
      handle: 'h',
      snapshotComplete: true,
      updatedAt: new Date().toISOString(),
    };
    await store.applyReplicaBatch({
      collection: 'issue-events',
      changes: [],
      checkpoint,
      snapshotRows: snapshot,
    });
    await store.applyReplicaBatch({
      collection: 'issue-events',
      changes: snapshot.map((row) => ({ operation: 'delete' as const, id: row.id })),
      checkpoint: { ...checkpoint, offset: '2_0' },
    });
    const retained = store.listReplica('issue-events', { includeInactive: true });
    expect(retained).toHaveLength(1_001);
    expect(retained.some((event) => event.id === 'event-0')).toBe(true);
  });
});
