import {
  isChangeMessage,
  isControlMessage,
  type Message,
  type Offset,
  ShapeStream,
} from '@electric-sql/client';
import { registerOfflineResource } from './local-access';
import type {
  LocalIssueStore,
  ReplicaChange,
  ReplicaCollection,
  ReplicaRow,
} from './local-issue-store';

export const replicaCollections: ReplicaCollection[] = [
  'workspace',
  'parks',
  'turbines',
  'issues',
  'issue-events',
];

type Stream = Pick<ShapeStream, 'lastOffset' | 'shapeHandle' | 'subscribe' | 'unsubscribeAll'>;
type StreamFactory = (
  collection: ReplicaCollection,
  offset: string,
  handle: string | null,
  signal: AbortSignal,
) => Stream;
export type ReplicaStatus = {
  ready: boolean;
  snapshots: Record<ReplicaCollection, boolean>;
  caughtUp: Record<ReplicaCollection, boolean>;
  errors: Partial<Record<ReplicaCollection, string>>;
};

function emptyStatus(): ReplicaStatus {
  return {
    ready: false,
    snapshots: Object.fromEntries(
      replicaCollections.map((name) => [name, false]),
    ) as ReplicaStatus['snapshots'],
    caughtUp: Object.fromEntries(
      replicaCollections.map((name) => [name, false]),
    ) as ReplicaStatus['caughtUp'],
    errors: {},
  };
}

function camelizeRow(
  collection: ReplicaCollection,
  value: Record<string, unknown>,
  workspaceId: string,
  messageKey: string,
): ReplicaRow {
  const row: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value))
    row[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = field;
  const id = String(row.id ?? messageKey ?? '');
  const rowWorkspaceId = String(row.workspaceId ?? (collection === 'workspace' ? id : workspaceId));
  if (!id || !rowWorkspaceId)
    throw new Error(`Linha inválida recebida em ${collection} (identidade ausente).`);
  return { ...row, id, workspaceId: rowWorkspaceId } as ReplicaRow;
}

function defaultStreamFactory(workspaceId: string): StreamFactory {
  return (collection, offset, handle, signal) => {
    const url = new URL(`/api/sync/${collection}`, window.location.origin);
    url.searchParams.set('workspaceId', workspaceId);
    return new ShapeStream({
      url: url.toString(),
      offset: offset as Offset,
      ...(handle ? { handle } : {}),
      subscribe: true,
      signal,
    });
  };
}

export class WorkspaceReplica {
  private readonly factory: StreamFactory;
  private readonly streams = new Map<ReplicaCollection, Stream>();
  private readonly controllers = new Map<ReplicaCollection, AbortController>();
  private readonly snapshots = new Map<ReplicaCollection, Map<string, ReplicaRow>>();
  private readonly listeners = new Set<(status: ReplicaStatus) => void>();
  private readonly status = emptyStatus();
  private started = false;
  private unregisterResource: (() => void) | undefined;

  constructor(
    private readonly store: LocalIssueStore,
    factory?: StreamFactory,
  ) {
    this.factory = factory ?? defaultStreamFactory(store.partition.workspaceId);
    for (const collection of replicaCollections) {
      const checkpoint = store.getCheckpoint(collection);
      this.status.snapshots[collection] = checkpoint?.snapshotComplete === true;
    }
    this.status.ready = store.isReplicaReady();
  }

  getStatus(): ReplicaStatus {
    return {
      ...this.status,
      snapshots: { ...this.status.snapshots },
      caughtUp: { ...this.status.caughtUp },
      errors: { ...this.status.errors },
    };
  }

  subscribe(listener: (status: ReplicaStatus) => void) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.unregisterResource = registerOfflineResource(() => this.close());
    for (const collection of replicaCollections) this.openCollection(collection);
  }

  close() {
    for (const [collection, stream] of this.streams) {
      stream.unsubscribeAll();
      this.controllers.get(collection)?.abort();
    }
    this.streams.clear();
    this.controllers.clear();
    this.started = false;
    this.unregisterResource?.();
    this.unregisterResource = undefined;
  }

  retry() {
    this.close();
    for (const collection of replicaCollections) delete this.status.errors[collection];
    this.status.ready = this.store.isReplicaReady();
    this.start();
    this.publish();
  }

  private openCollection(collection: ReplicaCollection) {
    this.status.caughtUp[collection] = false;
    const checkpoint = this.store.getCheckpoint(collection);
    const complete = checkpoint?.snapshotComplete === true;
    const controller = new AbortController();
    const stream = this.factory(
      collection,
      complete ? checkpoint.offset : '-1',
      complete ? checkpoint.handle : null,
      controller.signal,
    );
    this.streams.set(collection, stream);
    this.controllers.set(collection, controller);
    if (!complete) this.snapshots.set(collection, new Map());
    stream.subscribe(
      async (messages) => {
        if (this.streams.get(collection) !== stream) return;
        try {
          await this.receive(collection, stream, messages);
        } catch (error) {
          if (this.streams.get(collection) !== stream) return;
          this.status.errors[collection] =
            error instanceof Error ? error.message : 'Falha ao persistir a réplica local.';
          this.status.caughtUp[collection] = false;
          this.status.ready = this.store.isReplicaReady();
          stream.unsubscribeAll();
          this.controllers.get(collection)?.abort();
          this.streams.delete(collection);
          this.controllers.delete(collection);
          this.publish();
        }
      },
      (error) => {
        if (this.streams.get(collection) !== stream) return;
        this.status.errors[collection] = error.message;
        this.publish();
      },
    );
  }

  private async receive(collection: ReplicaCollection, stream: Stream, messages: Message[]) {
    if (this.streams.get(collection) !== stream) return;
    let staging = this.snapshots.get(collection);
    let completedSnapshot: ReplicaRow[] | undefined;
    const changes: ReplicaChange[] = [];
    let reset = false;

    for (const message of messages) {
      if (isControlMessage(message)) {
        if (message.headers.control === 'must-refetch') {
          staging = new Map();
          this.snapshots.set(collection, staging);
          this.status.snapshots[collection] = false;
          this.status.caughtUp[collection] = false;
          reset = true;
        } else if (message.headers.control === 'up-to-date' && staging) {
          completedSnapshot = [...staging.values()];
          this.snapshots.delete(collection);
          staging = undefined;
          this.status.caughtUp[collection] = true;
        } else if (message.headers.control === 'up-to-date') {
          this.status.caughtUp[collection] = true;
        }
      } else if (isChangeMessage(message)) {
        const operation = message.headers.operation;
        const id = String(message.value.id ?? message.key);
        if (operation === 'delete') {
          if (staging) staging.delete(id);
          else changes.push({ operation, id });
        } else {
          const row = camelizeRow(
            collection,
            message.value as Record<string, unknown>,
            this.store.partition.workspaceId,
            String(message.key ?? ''),
          );
          if (staging) staging.set(id, row);
          else changes.push({ operation, id, row });
        }
      }
    }

    if (reset) {
      if (this.streams.get(collection) !== stream) return;
      await this.store.markReplicaSnapshotIncomplete(collection);
    }
    if (staging) {
      // Do not persist the advancing Electric offset while snapshot rows live only in memory.
      // A crash must restart this shape from -1 instead of skipping uncommitted snapshot data.
      if (this.streams.get(collection) !== stream) return;
      await this.store.markReplicaSnapshotIncomplete(collection);
      this.status.ready = false;
      this.publish();
      return;
    }

    const checkpoint = {
      collection,
      workspaceId: this.store.partition.workspaceId,
      offset: String(stream.lastOffset),
      handle: stream.shapeHandle ?? null,
      snapshotComplete:
        completedSnapshot !== undefined ||
        this.store.getCheckpoint(collection)?.snapshotComplete === true,
      updatedAt: new Date().toISOString(),
    };
    if (this.streams.get(collection) !== stream) return;
    await this.store.applyReplicaBatch({
      collection,
      changes,
      checkpoint,
      ...(completedSnapshot ? { snapshotRows: completedSnapshot } : {}),
    });
    this.status.snapshots[collection] = checkpoint.snapshotComplete;
    delete this.status.errors[collection];
    this.status.ready = this.store.isReplicaReady();
    this.publish();
  }

  private publish() {
    const snapshot = this.getStatus();
    for (const listener of this.listeners) listener(snapshot);
  }
}
