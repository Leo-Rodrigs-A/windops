import {
  createCollection,
  createIndexedDB,
  createTransaction,
  type IndexedDBInstance,
  indexedDBCollectionOptions,
} from '@tanstack/db';
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

export type LocalCommandStatus =
  | 'pending'
  | 'sending'
  | 'waiting_auth'
  | 'waiting_eligibility'
  | 'conflict'
  | 'rejected'
  | 'confirmed_waiting_replica'
  | 'confirmed';
export type LocalCommandKind = keyof typeof commandSchemas;

export type LocalIssueProjection = {
  id: string;
  workspaceId: string;
  serverIssue: Issue | null;
  local: {
    parkId: string;
    turbineId: string;
    text: string;
    status: Issue['status'] | 'local';
  };
  serverRevision: number | null;
  localRevision: number;
  updatedAt: string;
};

export type LocalIssueCommand = {
  id: string;
  issueId: string;
  workspaceId: string;
  kind: LocalCommandKind;
  payload: unknown;
  status: LocalCommandStatus;
  dependsOn: string | null;
  baseServerRevision: number | null;
  createdAt: string;
  attemptedAt: string | null;
  frozenPayload: unknown | null;
  blockReason: string | null;
};

type JournalRow =
  | { id: string; kind: 'issue'; value: LocalIssueProjection }
  | { id: string; kind: 'command'; value: LocalIssueCommand };

type Partition = { accountId: string; workspaceId: string };

export function localIssueDatabaseName(partition: Partition) {
  return `windops-local-v1-${partition.accountId}-${partition.workspaceId}`;
}

function validatePartition(partition: Partition): Partition {
  return z.object({ accountId: z.uuid(), workspaceId: z.uuid() }).strict().parse(partition);
}

function makeJournal(db: IndexedDBInstance) {
  return createCollection(
    indexedDBCollectionOptions<JournalRow>({
      db,
      name: JOURNAL_STORE,
      getKey: (row) => row.id,
    }),
  );
}

export class LocalIssueStore {
  private constructor(
    readonly partition: Partition,
    private readonly db: IndexedDBInstance,
    private readonly journal: ReturnType<typeof makeJournal>,
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
      localRevision: 1,
      updatedAt: new Date().toISOString(),
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
    const command = this.newCommand(
      payload.commandId,
      input.issueId,
      'update',
      payload,
      dependency?.id ?? null,
      current.serverRevision,
    );
    await this.commitRows([
      { id: `issue:${projection.id}`, kind: 'issue', value: projection },
      { id: `command:${command.id}`, kind: 'command', value: command },
    ]);
    return { issue: projection, command };
  }

  async queueMutation(input: {
    issueId: string;
    commandId: string;
    kind: Exclude<LocalCommandKind, 'create' | 'update'>;
    payload: unknown;
  }) {
    const current = this.getIssue(input.issueId);
    if (!current) throw new Error('O chamado não existe nesta partição local.');
    const payload = commandSchemas[input.kind].parse(input.payload);
    const retry = this.retryFor(input.commandId, input.issueId, input.kind, payload);
    if (retry) return retry;
    const dependency = this.latestCommandFor(input.issueId);
    const command = this.newCommand(
      input.commandId,
      input.issueId,
      input.kind,
      payload,
      dependency?.id ?? null,
      current.serverRevision,
    );
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
      localRevision: current.localRevision + 1,
      updatedAt: new Date().toISOString(),
    };
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

  getIssue(id: string) {
    const row = this.journal.get(`issue:${id}`);
    return row?.kind === 'issue' ? row.value : undefined;
  }

  getCommand(id: string) {
    const row = this.journal.get(`command:${id}`);
    return row?.kind === 'command' ? row.value : undefined;
  }

  listPendingCommands() {
    return [...this.journal.values()]
      .flatMap((row) => (row.kind === 'command' ? [row.value] : []))
      .filter((command) => command.status !== 'confirmed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
        }) => ({
          id,
          issueId,
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
        }),
      ),
    });
    return JSON.stringify(document, null, 2);
  }

  private latestCommandFor(issueId: string) {
    return this.listPendingCommands()
      .filter((command) => command.issueId === issueId)
      .at(-1);
  }

  private retryFor(id: string, issueId: string, kind: LocalCommandKind, payload: unknown) {
    const existing = this.getCommand(id);
    if (!existing) return undefined;
    if (
      existing.issueId !== issueId ||
      existing.kind !== kind ||
      JSON.stringify(existing.payload) !== JSON.stringify(payload)
    ) {
      throw new Error('A chave local deste comando já está associada a outro conteúdo.');
    }
    return existing;
  }

  private newCommand(
    id: string,
    issueId: string,
    kind: LocalCommandKind,
    payload: unknown,
    dependsOn: string | null,
    baseServerRevision: number | null,
  ): LocalIssueCommand {
    return {
      id,
      issueId,
      workspaceId: this.partition.workspaceId,
      kind,
      payload,
      status: 'pending',
      dependsOn,
      baseServerRevision,
      createdAt: new Date().toISOString(),
      attemptedAt: null,
      frozenPayload: null,
      blockReason: null,
    };
  }

  private async commitRows(rows: JournalRow[]) {
    const tx = createTransaction({
      autoCommit: false,
      mutationFn: async ({ transaction }) => this.journal.utils.acceptMutations(transaction),
    });
    tx.mutate(() => {
      for (const row of rows) {
        if (this.journal.get(row.id))
          this.journal.update(row.id, (draft) => Object.assign(draft, row));
        else this.journal.insert(row);
      }
    });
    await tx.commit();
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
