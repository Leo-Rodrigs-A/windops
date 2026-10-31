import { createIndexedDB, type IndexedDBInstance } from '@tanstack/db';
import {
  completeIssueSchema,
  createIssueSchema,
  type Issue,
  releaseIssueSchema,
  returnIssueSchema,
  startIssueSchema,
  updateIssueSchema,
} from '@windops/contracts';
import { z } from 'zod';

export type {
  LocalCommandKind,
  LocalCommandStatus,
  LocalIssueCommand,
  LocalIssueProjection,
  ReplicaChange,
  ReplicaCheckpoint,
  ReplicaCollection,
  ReplicaRow,
  SyncedIssueRow,
} from './local-issue-store/types.js';

import {
  createLocalCommand,
  findRetryCommand,
  listPendingCommands,
} from './local-issue-store/command-queue';
import { commitJournalRows, type LocalJournal, makeJournal } from './local-issue-store/persistence';
import {
  confirmCompletedIssueDeparture,
  reconcileRemoteIssue,
} from './local-issue-store/reconciliation';
import type {
  JournalRow,
  LocalCommandKind,
  LocalCommandStatus,
  LocalIssueCommand,
  LocalIssueProjection,
  Partition,
  ReplicaChange,
  ReplicaCheckpoint,
  ReplicaCollection,
  ReplicaRow,
  SyncedIssueRow,
} from './local-issue-store/types.js';

const DB_VERSION = 2;
const JOURNAL_STORE = 'journal';
const LEASE_STORE = 'leases';
const METADATA_STORE = 'metadata';
const exportSchema = z
  .object({
    format: z.literal('windops-pending-commands'),
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    partition: z.object({ accountId: z.uuid(), workspaceId: z.uuid() }).strict(),
    commands: z.array(z.unknown()),
  })
  .strict();

const commandSchemas = {
  create: createIssueSchema,
  update: updateIssueSchema,
  start: startIssueSchema,
  return: returnIssueSchema,
  release: releaseIssueSchema,
  complete: completeIssueSchema,
};

export function localIssueDatabaseName(partition: Partition) {
  return `windops-local-v1-${partition.accountId}-${partition.workspaceId}`;
}

function validatePartition(partition: Partition): Partition {
  return z.object({ accountId: z.uuid(), workspaceId: z.uuid() }).strict().parse(partition);
}

export class LocalIssueStore {
  private readonly listeners = new Set<() => void>();
  private constructor(
    readonly partition: Partition,
    private readonly db: IndexedDBInstance,
    private readonly journal: LocalJournal,
  ) {}

  static async open(partitionInput: Partition, idbFactory?: IDBFactory): Promise<LocalIssueStore> {
    const partition = validatePartition(partitionInput);
    const db = await createIndexedDB({
      name: localIssueDatabaseName(partition),
      version: DB_VERSION,
      stores: [JOURNAL_STORE, LEASE_STORE, METADATA_STORE],
      ...(idbFactory ? { idbFactory } : {}),
    });
    try {
      const journal = makeJournal(db);
      await journal.preload();
      return new LocalIssueStore(partition, db, journal);
    } catch (error) {
      db.close();
      throw error;
    }
  }

  close() {
    this.db.close();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  listIssues() {
    return [...this.journal.values()].flatMap((row) => (row.kind === 'issue' ? [row.value] : []));
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    return navigator.storage.persist();
  }

  async saveCreate(input: {
    issueId: string;
    commandId: string;
    parkId: string;
    turbineId: string;
    text: string;
  }) {
    const payload = createIssueSchema.parse({ ...input });
    const retry = this.retryFor(payload.commandId, payload.issueId, 'create', payload);
    if (retry) {
      const issue = this.getIssue(payload.issueId);
      if (issue) return { issue, command: retry };
    }
    if (this.getIssue(payload.issueId))
      throw new Error('O ID do chamado já existe nesta partição local.');
    const createdAt = new Date().toISOString();
    const issue: LocalIssueProjection = {
      id: payload.issueId,
      workspaceId: this.partition.workspaceId,
      serverIssue: null,
      local: {
        parkId: payload.parkId,
        turbineId: payload.turbineId,
        text: payload.text,
        status: 'local',
      },
      serverRevision: null,
      serverActive: null,
      localRevision: 1,
      createdAt,
      updatedAt: createdAt,
      localIdentity: {
        creatorUserId: this.partition.accountId,
        creatorName: null,
        handlerUserId: null,
        handlerName: null,
      },
    };
    const command = this.newCommand(
      payload.commandId,
      payload.issueId,
      'create',
      payload,
      null,
      null,
    );
    await this.commitRows([
      { id: `issue:${issue.id}`, kind: 'issue', value: issue },
      { id: `command:${command.id}`, kind: 'command', value: command },
    ]);
    return { issue, command };
  }

  async saveUpdate(input: {
    issueId: string;
    commandId: string;
    expectedRevision?: number;
    parkId?: string;
    turbineId?: string;
    text?: string;
  }) {
    const current = this.getIssue(input.issueId);
    if (!current) throw new Error('O chamado não existe nesta partição local.');
    if (current.serverIssue?.archivedAt)
      throw new Error('O chamado está arquivado. Reative-o online antes de editar.');
    const payload = updateIssueSchema.parse({
      commandId: input.commandId,
      expectedRevision: input.expectedRevision ?? current.serverRevision ?? 1,
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.parkId !== undefined ? { parkId: input.parkId, turbineId: input.turbineId } : {}),
    });
    const retry = this.retryFor(payload.commandId, input.issueId, 'update', payload);
    if (retry) return { issue: current, command: retry };
    const dependency = this.latestCommandFor(input.issueId);
    const projection: LocalIssueProjection = {
      ...current,
      local: {
        ...current.local,
        ...(payload.text !== undefined ? { text: payload.text } : {}),
        ...(payload.parkId !== undefined && payload.turbineId !== undefined
          ? { parkId: payload.parkId, turbineId: payload.turbineId }
          : {}),
      },
      localRevision: current.localRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const command = {
      ...this.newCommand(
        payload.commandId,
        input.issueId,
        'update',
        payload,
        dependency?.id ?? null,
        current.serverRevision,
      ),
      baseServerIssue: current.serverIssue,
    };
    await this.commitRows([
      { id: `issue:${projection.id}`, kind: 'issue', value: projection },
      { id: `command:${command.id}`, kind: 'command', value: command },
    ]);
    return { issue: projection, command };
  }

  async recreateUpdateAfterConflict(input: {
    conflictedCommandId: string;
    commandId: string;
    text: string;
  }) {
    const previous = this.getCommand(input.conflictedCommandId);
    if (!previous || !['conflict', 'rejected'].includes(previous.status))
      throw new Error('Somente um conflito ou rejeição conhecida pode ser corrigido.');
    if (previous.kind !== 'update')
      throw new Error(
        'Esta recuperação é exclusiva de conflitos de conteúdo; status usa ação online.',
      );
    if (previous.frozenPayload === null && previous.status === 'rejected')
      throw new Error('A rejeição não contém uma tentativa conhecida para corrigir.');
    const current = this.getIssue(previous.issueId);
    if (!current?.serverIssue || current.serverRevision === null)
      throw new Error('A versão remota precisa ser recebida antes de corrigir o conflito.');
    const payload = updateIssueSchema.parse({
      commandId: input.commandId,
      expectedRevision: current.serverRevision,
      text: input.text,
    });
    if (this.getCommand(input.commandId))
      throw new Error('A correção precisa usar uma nova identidade de comando.');
    const descendants = this.listPendingCommands().filter((command) => {
      let parent = command.dependsOn;
      const seen = new Set<string>();
      while (parent && !seen.has(parent)) {
        if (parent === previous.id) return true;
        seen.add(parent);
        parent = this.getCommand(parent)?.dependsOn ?? null;
      }
      return false;
    });
    const command: LocalIssueCommand = {
      ...this.newCommand(
        input.commandId,
        previous.issueId,
        'update',
        payload,
        null,
        current.serverRevision,
      ),
      baseServerIssue: current.serverIssue,
    };
    const projection: LocalIssueProjection = {
      ...current,
      local: { ...current.local, text: input.text },
      localRevision: current.localRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.commitRows([
      { id: `issue:${projection.id}`, kind: 'issue', value: projection },
      { id: `command:${command.id}`, kind: 'command', value: command },
      {
        id: `command:${previous.id}`,
        kind: 'command',
        value: {
          ...previous,
          status: 'superseded',
          blockReason: 'Substituído por uma correção revisada pelo técnico.',
        },
      },
      ...descendants.map((child) => ({
        id: `command:${child.id}`,
        kind: 'command' as const,
        value: {
          ...child,
          status: 'blocked' as const,
          blockReason: 'Recrie esta etapa após resolver o conflito anterior.',
        },
      })),
    ]);
    return {
      issue: projection,
      command,
      preservedDescendantIds: descendants.map((item) => item.id),
    };
  }

  async queueMutation(input: {
    issueId: string;
    commandId: string;
    kind: Exclude<LocalCommandKind, 'create' | 'update'>;
    payload: unknown;
  }) {
    const current = this.getIssue(input.issueId);
    if (!current) throw new Error('O chamado não existe nesta partição local.');
    if (current.serverIssue?.archivedAt)
      throw new Error('O chamado está arquivado. Reative-o online antes de editar.');
    const payload = commandSchemas[input.kind].parse(input.payload);
    const retry = this.retryFor(input.commandId, input.issueId, input.kind, payload);
    if (retry) return retry;
    const dependency = this.latestCommandFor(input.issueId);
    const command = {
      ...this.newCommand(
        input.commandId,
        input.issueId,
        input.kind,
        payload,
        dependency?.id ?? null,
        current.serverRevision,
      ),
      baseServerIssue: current.serverIssue,
    };
    const nextStatus =
      input.kind === 'start'
        ? 'in_progress'
        : input.kind === 'return' || input.kind === 'release'
          ? 'pending'
          : input.kind === 'complete'
            ? 'completed'
            : current.local.status;
    const projection: LocalIssueProjection = {
      ...current,
      local: { ...current.local, status: nextStatus },
      ...(input.kind === 'start'
        ? {
            localIdentity: {
              creatorUserId: current.localIdentity?.creatorUserId ?? null,
              creatorName: current.localIdentity?.creatorName ?? null,
              handlerUserId: this.partition.accountId,
              handlerName: current.localIdentity?.handlerName ?? null,
            },
          }
        : input.kind === 'return'
          ? {
              localIdentity: {
                creatorUserId: current.localIdentity?.creatorUserId ?? null,
                creatorName: current.localIdentity?.creatorName ?? null,
                handlerUserId: null,
                handlerName: null,
              },
            }
          : {}),
      localRevision: current.localRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const completePayload = payload as unknown as { report?: unknown };
    if (input.kind === 'complete' && typeof completePayload.report === 'string')
      projection.local.completionReport = completePayload.report;
    await this.commitRows([
      { id: `issue:${projection.id}`, kind: 'issue', value: projection },
      { id: `command:${command.id}`, kind: 'command', value: command },
    ]);
    return command;
  }

  async setCommandStatus(
    id: string,
    status: LocalCommandStatus,
    blockReason: string | null = null,
  ) {
    const command = this.getCommand(id);
    if (!command) throw new Error('Comando local não encontrado.');
    const updated: LocalIssueCommand = {
      ...command,
      status,
      blockReason,
      ...(status === 'sending' && !command.attemptedAt
        ? { attemptedAt: new Date().toISOString(), frozenPayload: command.payload }
        : {}),
    };
    await this.commitRows([{ id: `command:${id}`, kind: 'command', value: updated }]);
    return updated;
  }

  async updatePendingCompletionReport(commandId: string, report: string) {
    const command = this.getCommand(commandId);
    if (
      command?.kind !== 'complete' ||
      command.status !== 'pending' ||
      command.attemptedAt !== null ||
      command.frozenPayload !== null
    )
      throw new Error('O relato já foi enviado ou não pode mais ser editado.');
    const payload = completeIssueSchema.parse({
      ...(command.payload as Record<string, unknown>),
      report,
    });
    const issue = this.getIssue(command.issueId);
    if (!issue) throw new Error('O chamado desta conclusão não existe na partição local.');
    const updatedCommand = { ...command, payload };
    const updatedIssue: LocalIssueProjection = {
      ...issue,
      local: { ...issue.local, completionReport: report },
      localRevision: issue.localRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.commitRows([
      { id: `command:${commandId}`, kind: 'command', value: updatedCommand },
      { id: `issue:${issue.id}`, kind: 'issue', value: updatedIssue },
    ]);
    return updatedCommand;
  }

  async prepareCommandForSend(id: string, payload: unknown) {
    const command = this.getCommand(id);
    if (!command) throw new Error('Comando local não encontrado.');
    if (!['pending', 'sending', 'waiting_auth', 'waiting_eligibility'].includes(command.status))
      return null;
    if (command.frozenPayload !== null) {
      if (command.status === 'sending') return command;
      const retry: LocalIssueCommand = { ...command, status: 'sending', blockReason: null };
      await this.commitRows([{ id: `command:${id}`, kind: 'command', value: retry }]);
      return retry;
    }
    const prepared: LocalIssueCommand = {
      ...command,
      status: 'sending',
      attemptedAt: command.attemptedAt ?? new Date().toISOString(),
      frozenPayload: payload,
    };
    await this.commitRows([{ id: `command:${id}`, kind: 'command', value: prepared }]);
    return prepared;
  }

  getIssue(id: string) {
    const row = this.journal.get(`issue:${id}`);
    return row?.kind === 'issue' ? row.value : undefined;
  }

  async recordIssueIdentity(input: {
    issueId: string;
    creatorUserId: string;
    creatorName: string;
    handlerUserId: string | null;
    handlerName: string | null;
  }) {
    const current = this.getIssue(input.issueId);
    if (!current) return;
    const localIdentity = {
      creatorUserId: input.creatorUserId,
      creatorName: input.creatorName,
      handlerUserId: input.handlerUserId,
      handlerName: input.handlerName,
    };
    if (JSON.stringify(current.localIdentity) === JSON.stringify(localIdentity)) return;
    await this.commitRows([
      {
        id: `issue:${input.issueId}`,
        kind: 'issue',
        value: { ...current, localIdentity },
      },
    ]);
  }

  async recordServerIssue(issue: Issue) {
    await this.recordServerIssuePage([issue]);
  }

  async recordServerIssuePage(issues: Issue[]) {
    const rows: JournalRow[] = [];
    for (const issue of issues) {
      if (issue.workspaceId !== this.partition.workspaceId)
        throw new Error('O chamado pertence a outro workspace.');
      const remote: SyncedIssueRow = {
        id: issue.id,
        workspaceId: issue.workspaceId,
        parkId: issue.parkId,
        turbineId: issue.turbineId,
        text: issue.text,
        completionReport: issue.completionReport,
        archivedAt: issue.archivedAt,
        status: issue.status,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        revision: issue.revision,
      };
      rows.push(...this.reconcileRemoteIssue(issue.id, remote));
    }
    if (rows.length > 0) await this.commitRows(rows);
  }

  getCommand(id: string) {
    const row = this.journal.get(`command:${id}`);
    return row?.kind === 'command'
      ? { ...row.value, chainId: row.value.chainId ?? row.value.issueId }
      : undefined;
  }

  getConflictReview(commandId: string) {
    const command = this.getCommand(commandId);
    if (command?.status !== 'conflict') return null;
    const issue = this.getIssue(command.issueId);
    if (!issue?.serverIssue) return null;
    return {
      command,
      base: command.baseServerIssue ?? null,
      local: issue.local,
      remote: issue.serverIssue,
    };
  }

  getCheckpoint(collection: ReplicaCollection) {
    const row = this.journal.get(`checkpoint:${collection}`);
    return row?.kind === 'checkpoint' ? row.value : undefined;
  }

  hasReplicaSnapshot(collection: ReplicaCollection) {
    return this.getCheckpoint(collection)?.snapshotComplete === true;
  }

  isReplicaReady() {
    const required: ReplicaCollection[] = [
      'workspace',
      'parks',
      'turbines',
      'issues',
      'issue-events',
    ];
    return required.every(
      (collection) => this.getCheckpoint(collection)?.snapshotComplete === true,
    );
  }

  listReplica(collection: ReplicaCollection, options: { includeInactive?: boolean } = {}) {
    return [...this.journal.values()]
      .flatMap((row) =>
        row.kind === 'replica' && row.value.collection === collection ? [row.value] : [],
      )
      .filter((record) => options.includeInactive || record.active)
      .map((record) => record.row);
  }

  async markReplicaSnapshotIncomplete(collection: ReplicaCollection) {
    const checkpoint: ReplicaCheckpoint = {
      collection,
      workspaceId: this.partition.workspaceId,
      offset: '-1',
      handle: null,
      snapshotComplete: false,
      updatedAt: new Date().toISOString(),
    };
    await this.commitRows([
      { id: `checkpoint:${collection}`, kind: 'checkpoint', value: checkpoint },
    ]);
  }

  async applyReplicaBatch(input: {
    collection: ReplicaCollection;
    changes: ReplicaChange[];
    checkpoint: ReplicaCheckpoint;
    snapshotRows?: ReplicaRow[];
  }) {
    if (
      input.checkpoint.workspaceId !== this.partition.workspaceId ||
      input.checkpoint.collection !== input.collection
    )
      throw new Error('O checkpoint pertence a outro workspace.');
    const { collection, changes, checkpoint, snapshotRows } = input;
    const records = new Map<string, JournalRow>();
    const dirtyIds = new Set<string>();
    const removedIds = new Set<string>();
    for (const item of this.journal.values()) {
      if (item.kind === 'replica' && item.value.collection === collection)
        records.set(item.value.row.id, item);
    }
    const rows: JournalRow[] = [];

    if (snapshotRows) {
      const incomingIds = new Set(snapshotRows.map((row) => row.id));
      for (const [id, record] of records) {
        if (incomingIds.has(id)) continue;
        if (
          (collection === 'issues' || collection === 'issue-events') &&
          record.kind === 'replica'
        ) {
          records.set(id, {
            ...record,
            value: { ...record.value, active: false, cachedAt: new Date().toISOString() },
          });
          dirtyIds.add(id);
          if (collection === 'issues') {
            const issue = this.getIssue(id);
            if (issue)
              rows.push({
                id: `issue:${id}`,
                kind: 'issue',
                value: { ...issue, serverActive: false },
              });
            rows.push(...this.confirmCompletedIssueDeparture(id));
          }
        } else {
          records.delete(id);
          removedIds.add(record.id);
        }
      }
      for (const row of snapshotRows) {
        if (row.workspaceId !== this.partition.workspaceId)
          throw new Error('A réplica contém uma linha de outro workspace.');
        records.set(row.id, {
          id: `replica:${collection}:${row.id}`,
          kind: 'replica',
          value: { collection, row, active: true, cachedAt: new Date().toISOString() },
        });
        dirtyIds.add(row.id);
      }
    }
    for (const change of changes) {
      if (change.operation === 'delete') {
        const existing = records.get(change.id);
        if (existing?.kind !== 'replica') continue;
        if (
          (collection === 'issues' || collection === 'issue-events') &&
          existing.kind === 'replica'
        ) {
          records.set(change.id, {
            ...existing,
            value: { ...existing.value, active: false, cachedAt: new Date().toISOString() },
          });
          dirtyIds.add(change.id);
          if (collection === 'issues') {
            const issue = this.getIssue(change.id);
            if (issue)
              rows.push({
                id: `issue:${change.id}`,
                kind: 'issue',
                value: { ...issue, serverActive: false },
              });
            rows.push(...this.confirmCompletedIssueDeparture(change.id));
          }
        } else {
          records.delete(change.id);
          removedIds.add(existing.id);
        }
      } else if (change.row) {
        if (change.row.workspaceId !== this.partition.workspaceId)
          throw new Error('A réplica contém uma linha de outro workspace.');
        records.set(change.id, {
          id: `replica:${collection}:${change.id}`,
          kind: 'replica',
          value: { collection, row: change.row, active: true, cachedAt: new Date().toISOString() },
        });
        dirtyIds.add(change.id);
      }
    }
    /*
     * Snapshot rows and post-snapshot changes are committed together. During an
     * incomplete snapshot, callers keep changes in memory and persist offset -1.
     */

    for (const id of dirtyIds) {
      const row = records.get(id);
      if (row) rows.push(row);
    }
    rows.push({ id: `checkpoint:${collection}`, kind: 'checkpoint', value: checkpoint });
    if (collection === 'issues') {
      const incoming = new Map<string, SyncedIssueRow>();
      if (snapshotRows) for (const row of snapshotRows) incoming.set(row.id, row as SyncedIssueRow);
      for (const change of changes) {
        if (change.operation !== 'delete' && change.row)
          incoming.set(change.id, change.row as SyncedIssueRow);
      }
      for (const [id, remote] of incoming) rows.push(...this.reconcileRemoteIssue(id, remote));
    }
    await this.commitRows(rows, [...removedIds]);
  }

  private reconcileRemoteIssue(id: string, remote: SyncedIssueRow): JournalRow[] {
    const current = this.getIssue(id);
    const retained = this.journal.get(`revision:${id}`);
    return reconcileRemoteIssue({
      id,
      remote,
      current,
      retainedRevision: retained?.kind === 'revision' ? retained.value.revision : undefined,
      pendingCommands: this.listPendingCommands().filter((command) => command.issueId === id),
    });
  }

  private confirmCompletedIssueDeparture(issueId: string): JournalRow[] {
    return confirmCompletedIssueDeparture(issueId, this.listPendingCommands());
  }

  async recordCommandAck(commandId: string, issue: SyncedIssueRow) {
    const command = this.getCommand(commandId);
    if (
      !command ||
      command.issueId !== issue.id ||
      issue.workspaceId !== this.partition.workspaceId
    )
      throw new Error('A confirmação não corresponde ao comando local.');
    const current = this.getIssue(issue.id);
    const observedRevision = Math.max(
      current?.serverRevision ?? 0,
      current?.serverIssue?.revision ?? 0,
    );
    const confirmedByDeparture =
      current?.serverActive === false &&
      issue.status === 'completed' &&
      (current.serverRevision ?? 0) <= issue.revision;
    const updatedCommand: LocalIssueCommand = {
      ...command,
      status:
        observedRevision >= issue.revision || confirmedByDeparture
          ? 'confirmed'
          : 'confirmed_waiting_replica',
      blockReason: null,
      acknowledgedIssue: issue,
    };
    const rows: JournalRow[] = [
      {
        id: `command:${commandId}`,
        kind: 'command',
        value: updatedCommand,
      },
    ];
    if (current && observedRevision < issue.revision) {
      rows.push({
        id: `issue:${issue.id}`,
        kind: 'issue',
        value: {
          ...current,
          serverIssue: issue,
          local: { ...current.local, status: issue.status },
        },
      });
    }
    await this.commitRows(rows);
    return updatedCommand;
  }

  listPendingCommands() {
    return listPendingCommands(this.journal.values());
  }

  async recoverInterruptedSends() {
    const interrupted = this.listPendingCommands().filter(
      (command) => command.status === 'sending',
    );
    for (const command of interrupted) {
      await this.setCommandStatus(
        command.id,
        'pending',
        'Envio interrompido; retry mantém a chave e o payload originais.',
      );
    }
    return interrupted.length;
  }

  async acquireLease(ownerId: string, ttlMs = 30_000): Promise<boolean> {
    const tx = this.db.db.transaction(LEASE_STORE, 'readwrite');
    const store = tx.objectStore(LEASE_STORE);
    const existing = (await requestResult(store.get('outbox'))) as
      | { ownerId: string; expiresAt: number }
      | undefined;
    const now = Date.now();
    if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
      await transactionDone(tx);
      return false;
    }
    store.put({ ownerId, expiresAt: now + ttlMs }, 'outbox');
    await transactionDone(tx);
    return true;
  }

  async releaseLease(ownerId: string) {
    const tx = this.db.db.transaction(LEASE_STORE, 'readwrite');
    const store = tx.objectStore(LEASE_STORE);
    const existing = (await requestResult(store.get('outbox'))) as { ownerId: string } | undefined;
    if (existing?.ownerId === ownerId) store.delete('outbox');
    await transactionDone(tx);
  }

  exportPending(): string {
    const document = exportSchema.parse({
      format: 'windops-pending-commands',
      version: 1,
      exportedAt: new Date().toISOString(),
      partition: this.partition,
      commands: this.listPendingCommands().map(
        ({
          id,
          issueId,
          chainId,
          workspaceId,
          kind,
          payload,
          status,
          dependsOn,
          baseServerRevision,
          createdAt,
          attemptedAt,
          frozenPayload,
          blockReason,
          baseServerIssue,
        }) => ({
          id,
          issueId,
          chainId,
          workspaceId,
          kind,
          payload,
          status,
          dependsOn,
          baseServerRevision,
          createdAt,
          attemptedAt,
          frozenPayload,
          blockReason,
          baseServerIssue: baseServerIssue ?? null,
        }),
      ),
    });
    return JSON.stringify(document, null, 2);
  }

  downloadPendingExport() {
    const blob = new Blob([this.exportPending()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `windops-pendencias-${this.partition.accountId}-${this.partition.workspaceId}.json`;
    anchor.click();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  private latestCommandFor(issueId: string) {
    return this.listPendingCommands()
      .filter((command) => command.issueId === issueId)
      .at(-1);
  }

  private retryFor(id: string, issueId: string, kind: LocalCommandKind, payload: unknown) {
    return findRetryCommand(this.getCommand(id), issueId, kind, payload);
  }

  private newCommand(
    id: string,
    issueId: string,
    kind: LocalCommandKind,
    payload: unknown,
    dependsOn: string | null,
    baseServerRevision: number | null,
  ): LocalIssueCommand {
    return createLocalCommand(
      id,
      issueId,
      this.partition.workspaceId,
      kind,
      payload,
      dependsOn,
      baseServerRevision,
    );
  }

  private async commitRows(rows: JournalRow[], removedIds: string[] = []) {
    await commitJournalRows({ journal: this.journal, listeners: this.listeners, rows, removedIds });
  }
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha no IndexedDB.'));
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transação local cancelada.'));
    tx.onerror = () => reject(tx.error ?? new Error('Falha na transação local.'));
  });
}

export async function openLocalIssueStore(partition: Partition, idbFactory?: IDBFactory) {
  return LocalIssueStore.open(partition, idbFactory);
}

export function parsePendingExport(value: string) {
  return exportSchema.parse(JSON.parse(value));
}
