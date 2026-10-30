import {
  createCollection,
  createIndexedDB,
  createTransaction,
  indexedDBCollectionOptions,
} from '@tanstack/db';
import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type LocalIssueProjection,
  localIssueDatabaseName,
  openLocalIssueStore,
  parsePendingExport,
} from './local-issue-store';

const partition = {
  accountId: '10000000-0000-4000-8000-000000000001',
  workspaceId: '20000000-0000-4000-8000-000000000001',
};
const issueId = '30000000-0000-4000-8000-000000000001';
const parkId = '40000000-0000-4000-8000-000000000001';
const turbineId = '50000000-0000-4000-8000-000000000001';

const stores: Array<{ close: () => void }> = [];

async function open(partitionInput = partition) {
  const store = await openLocalIssueStore(partitionInput, indexedDB);
  stores.push(store);
  return store;
}

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('armazenamento local de issues e outbox', () => {
  it('limita histórico API, preserva pendências e revisões após restart', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const base = {
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      creatorMembershipId: crypto.randomUUID(),
      creator: { id: partition.accountId, name: 'Técnico', email: 'test@example.invalid' },
      handlerMembershipId: null,
      handler: null,
      text: 'Texto',
      completionReport: null,
      archivedAt: null,
      status: 'pending' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      revision: 1,
    };
    await store.recordServerIssue(base);
    const commandId = crypto.randomUUID();
    await store.queueMutation({
      issueId,
      commandId,
      kind: 'start',
      payload: { commandId, expectedRevision: 1 },
    });
    await store.recordServerIssue({ ...base, revision: 2, archivedAt: base.updatedAt });
    const history = Array.from({ length: 260 }, (_, index) => ({
      ...base,
      id: crypto.randomUUID(),
      status: 'completed' as const,
      revision: 3,
      updatedAt: new Date(Date.UTC(2026, 1, 1, 0, 0, index)).toISOString(),
    }));
    const oldest = history[0];
    if (!oldest) throw new Error('Missing fixture');
    await store.recordServerIssuePage(history);
    expect(store.listIssues()).toHaveLength(251);
    expect(store.getCommand(commandId)?.status).toBe('conflict');
    expect(store.getIssue(oldest.id)).toBeUndefined();
    store.close();
    const reopened = await open(scope);
    expect(reopened.listIssues()).toHaveLength(251);
    expect(reopened.getCommand(commandId)).toBeDefined();
    await reopened.recordServerIssue({ ...oldest, status: 'pending', revision: 2 });
    expect(reopened.getIssue(oldest.id)).toBeUndefined();
    await reopened.recordServerIssue({ ...oldest, status: 'pending', revision: 4 });
    await reopened.recordServerIssuePage([]);
    expect(reopened.getIssue(oldest.id)?.serverActive).toBe(true);
  });

  it('preserva chamados concluídos recebidos para consulta offline do histórico', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    await store.recordServerIssue({
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      creatorMembershipId: '70000000-0000-4000-8000-000000000001',
      creator: {
        id: partition.accountId,
        email: 'tecnico@example.test',
        name: 'Técnico',
      },
      handlerMembershipId: null,
      handler: null,
      text: 'Falha no alternador',
      completionReport: 'Troca concluída',
      archivedAt: null,
      status: 'completed',
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:10:00.000Z',
      revision: 3,
    });
    await store.recordIssueIdentity({
      issueId,
      creatorUserId: partition.accountId,
      creatorName: 'Técnico',
      handlerUserId: null,
      handlerName: null,
    });
    store.close();

    const reopened = await open(scope);
    expect(reopened.getIssue(issueId)).toMatchObject({
      serverIssue: { status: 'completed', text: 'Falha no alternador' },
      localIdentity: { creatorName: 'Técnico' },
    });
  });

  it('preserva pendência e arquivo após restart e rejeita resposta antiga', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const remote = {
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      creatorMembershipId: '70000000-0000-4000-8000-000000000001',
      creator: {
        id: partition.accountId,
        email: 'tecnico@example.test',
        name: 'Técnico',
      },
      handlerMembershipId: null,
      handler: null,
      text: 'Versão confirmada pela API',
      completionReport: null,
      archivedAt: null,
      status: 'pending',
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:05:00.000Z',
      revision: 2,
    } as const;

    await store.recordServerIssue(remote);
    const commandId = crypto.randomUUID();
    await store.queueMutation({
      issueId,
      commandId,
      kind: 'start',
      payload: { commandId, expectedRevision: 2 },
    });
    await store.recordServerIssue({
      ...remote,
      revision: 3,
      archivedAt: '2026-10-28T12:00:00.000Z',
    });
    await store.recordServerIssue(remote);
    expect(store.getIssue(issueId)).toMatchObject({ serverActive: false, serverRevision: 3 });
    expect(store.getCommand(commandId)?.status).toBe('conflict');
    store.close();
    const reopened = await open(scope);
    expect(reopened.getIssue(issueId)?.serverIssue?.archivedAt).toBeTruthy();
    expect(reopened.getCommand(commandId)).toBeDefined();
    await expect(
      reopened.queueMutation({
        issueId,
        commandId: crypto.randomUUID(),
        kind: 'start',
        payload: { commandId: crypto.randomUUID(), expectedRevision: 3 },
      }),
    ).rejects.toThrow('arquivado');
    await reopened.recordServerIssue({ ...remote, revision: 4 });
    expect(reopened.getIssue(issueId)?.serverActive).toBe(true);
    expect(reopened.getCommand(commandId)).toBeDefined();
  });

  it('grava no IndexedDB a versão atual do chamado recebida pela API', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    await store.recordServerIssue({
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      creatorMembershipId: '70000000-0000-4000-8000-000000000001',
      creator: {
        id: partition.accountId,
        email: 'tecnico@example.test',
        name: 'Técnico',
      },
      handlerMembershipId: null,
      handler: null,
      text: 'Versão confirmada pela API',
      completionReport: null,
      archivedAt: null,
      status: 'pending',
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:05:00.000Z',
      revision: 2,
    });

    expect(store.getIssue(issueId)).toMatchObject({
      serverRevision: 2,
      serverIssue: { text: 'Versão confirmada pela API', revision: 2 },
      local: { text: 'Versão confirmada pela API', status: 'pending' },
      serverActive: true,
    });

    const completeCommandId = '60000000-0000-4000-8000-000000000021';
    await store.queueMutation({
      issueId,
      commandId: completeCommandId,
      kind: 'complete',
      payload: { commandId: completeCommandId, expectedRevision: 2, report: 'Concluído' },
    });
    await store.recordCommandAck(completeCommandId, {
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      text: 'Versão confirmada pela API',
      completionReport: 'Concluído',
      status: 'completed',
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:10:00.000Z',
      revision: 3,
    });
    expect(store.getCommand(completeCommandId)?.status).toBe('confirmed_waiting_replica');

    await store.recordServerIssuePage([]);
    expect(store.getIssue(issueId)?.serverActive).toBe(true);
    expect(store.getCommand(completeCommandId)?.status).toBe('confirmed_waiting_replica');
  });

  it('persiste criação, edição e dependências após reabrir, isolado por conta', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const first = await open(scope);
    const created = await first.saveCreate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000001',
      parkId,
      turbineId,
      text: 'Falha encontrada na inspeção',
    });
    const edited = await first.saveUpdate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000002',
      text: 'Falha confirmada na inspeção',
    });
    expect(edited.issue.createdAt).toBe(created.issue.createdAt);
    expect(edited.command.dependsOn).toBe(created.command.id);
    expect(edited.issue.serverRevision).toBeNull();
    expect(edited.issue.localRevision).toBe(2);
    await first.setCommandStatus(created.command.id, 'sending');

    first.close();
    const reopened = await open(scope);
    expect(reopened.getIssue(issueId)?.local.text).toBe('Falha confirmada na inspeção');
    expect(reopened.listPendingCommands()).toHaveLength(2);
    expect(await reopened.recoverInterruptedSends()).toBe(1);
    expect(reopened.getCommand(created.command.id)?.frozenPayload).toEqual(created.command.payload);
    expect(
      (await open({ ...scope, accountId: '10000000-0000-4000-8000-000000000002' })).getIssue(
        issueId,
      ),
    ).toBeUndefined();
  });

  it('rejeita gravação inválida sem alterar a projeção e exporta comandos sem credenciais', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    await store.saveCreate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000003',
      parkId,
      turbineId,
      text: 'Relato original',
    });
    const retried = await store.saveCreate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000003',
      parkId,
      turbineId,
      text: 'Relato original',
    });
    expect(retried.issue.localRevision).toBe(1);
    await expect(
      store.saveUpdate({
        issueId,
        commandId: '60000000-0000-4000-8000-000000000004',
        text: '   ',
      }),
    ).rejects.toThrow();
    expect(store.getIssue(issueId)?.local.text).toBe('Relato original');

    const text = store.exportPending();
    const document = parsePendingExport(text);
    expect(document.commands).toHaveLength(1);
    expect(text).not.toMatch(/cookie|token|password|authorization/i);
    expect(document.partition).toEqual(scope);
  });

  it('usa lease recuperável entre instâncias e libera lease abandonada ao expirar', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const owner = await open(scope);
    const peer = await open(scope);
    expect(await owner.acquireLease('tab-a', 20)).toBe(true);
    expect(await peer.acquireLease('tab-b', 20)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(await peer.acquireLease('tab-b', 20)).toBe(true);
    await peer.releaseLease('tab-b');
    expect(await owner.acquireLease('tab-a', 20)).toBe(true);
  });

  it('propaga falha do IndexedDB sem reportar projeção salva', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    store.close();
    await expect(
      store.saveCreate({
        issueId,
        commandId: '60000000-0000-4000-8000-000000000005',
        parkId,
        turbineId,
        text: 'Não deve aparecer como salvo',
      }),
    ).rejects.toThrow();

    const reopened = await open(scope);
    expect(reopened.getIssue(issueId)).toBeUndefined();
    expect(reopened.listPendingCommands()).toHaveLength(0);
  });

  it('preserva comandos ao atualizar o banco da versão 1 para a versão 2', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const name = localIssueDatabaseName(scope);
    const oldDb = await createIndexedDB({
      name,
      version: 1,
      stores: ['journal', 'leases'],
      idbFactory: indexedDB,
    });
    const oldJournal = createCollection(
      indexedDBCollectionOptions<{ id: string; kind: 'issue'; value: LocalIssueProjection }>({
        db: oldDb,
        name: 'journal',
        getKey: (row) => row.id,
      }),
    );
    await oldJournal.preload();
    const projection: LocalIssueProjection = {
      id: issueId,
      workspaceId: scope.workspaceId,
      serverIssue: null,
      local: { parkId, turbineId, text: 'Pendente antes do upgrade', status: 'local' },
      serverRevision: null,
      serverActive: null,
      localRevision: 1,
      updatedAt: new Date().toISOString(),
    };
    const write = createTransaction({
      autoCommit: false,
      mutationFn: async ({ transaction }) => oldJournal.utils.acceptMutations(transaction),
    });
    write.mutate(() => {
      oldJournal.insert({ id: `issue:${issueId}`, kind: 'issue', value: projection });
    });
    await write.commit();
    await oldJournal.cleanup();
    oldDb.close();

    const upgraded = await open(scope);
    expect(upgraded.getIssue(issueId)?.local.text).toBe('Pendente antes do upgrade');
  });

  it('propaga quota excedida e não grava projeção nem comando parcialmente', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const nativeDb = (store as unknown as { db: { db: IDBDatabase } }).db.db;
    const nativeTransaction = nativeDb.transaction.bind(nativeDb);
    nativeDb.transaction = ((...args: Parameters<IDBDatabase['transaction']>) => {
      const transaction = nativeTransaction(...args);
      const nativeObjectStore = transaction.objectStore.bind(transaction);
      return new Proxy(transaction, {
        get(target, property) {
          if (property === 'objectStore') {
            return (storeName: string) => {
              const objectStore = nativeObjectStore(storeName);
              if (storeName !== 'journal') return objectStore;
              return new Proxy(objectStore, {
                get(targetStore, storeProperty) {
                  if (storeProperty === 'put') {
                    return () => {
                      throw new DOMException('Armazenamento cheio', 'QuotaExceededError');
                    };
                  }
                  const result = Reflect.get(targetStore, storeProperty, targetStore);
                  return typeof result === 'function' ? result.bind(targetStore) : result;
                },
              });
            };
          }
          const result = Reflect.get(target, property, target);
          return typeof result === 'function' ? result.bind(target) : result;
        },
      });
    }) as IDBDatabase['transaction'];

    await expect(
      store.saveCreate({
        issueId,
        commandId: '60000000-0000-4000-8000-000000000006',
        parkId,
        turbineId,
        text: 'Não deve salvar com quota excedida',
      }),
    ).rejects.toMatchObject({ name: 'QuotaExceededError' });
    store.close();
    const reopened = await open(scope);
    expect(reopened.getIssue(issueId)).toBeUndefined();
    expect(reopened.listPendingCommands()).toHaveLength(0);
  });

  it('recria uma edição conflitante com nova identidade e conserva a intenção anterior', async () => {
    const scope = { ...partition, workspaceId: crypto.randomUUID() };
    const store = await open(scope);
    const remoteV1 = {
      id: issueId,
      workspaceId: scope.workspaceId,
      parkId,
      turbineId,
      text: 'Versão base',
      completionReport: null,
      status: 'pending' as const,
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:00:00.000Z',
      revision: 1,
    };
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [],
      snapshotRows: [remoteV1],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '10',
        handle: null,
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    await store.saveUpdate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000011',
      text: 'Texto local em conflito',
    });
    await store.applyReplicaBatch({
      collection: 'issues',
      changes: [
        {
          operation: 'update',
          id: issueId,
          row: {
            ...remoteV1,
            text: 'Versão remota vencedora',
            updatedAt: '2026-10-27T12:10:00.000Z',
            revision: 2,
          },
        },
      ],
      checkpoint: {
        collection: 'issues',
        workspaceId: scope.workspaceId,
        offset: '11',
        handle: 'next',
        snapshotComplete: true,
        updatedAt: new Date().toISOString(),
      },
    });
    const old = store.listPendingCommands()[0];
    if (!old) throw new Error('O comando local deveria estar pendente.');
    expect(old.status).toBe('conflict');
    expect(store.getConflictReview(old.id)).toMatchObject({
      base: { text: 'Versão base', revision: 1 },
      local: { text: 'Texto local em conflito' },
      remote: { text: 'Versão remota vencedora', revision: 2 },
    });
    const replacement = await store.recreateUpdateAfterConflict({
      conflictedCommandId: old.id,
      commandId: '60000000-0000-4000-8000-000000000012',
      text: 'Texto local revisado',
    });
    expect(replacement.command.id).not.toBe(old.id);
    expect(replacement.command.payload).toMatchObject({ expectedRevision: 2 });
    expect(replacement.command.dependsOn).toBeNull();
    expect(store.getIssue(issueId)?.serverIssue?.text).toBe('Versão remota vencedora');
    expect(store.getIssue(issueId)?.local.text).toBe('Texto local revisado');
    expect(store.getCommand(old.id)?.status).toBe('superseded');
    expect(store.listPendingCommands().map((command) => command.id)).toEqual([
      replacement.command.id,
    ]);
    const unknown = await store.saveUpdate({
      issueId,
      commandId: '60000000-0000-4000-8000-000000000013',
      text: 'Outra edição em voo',
    });
    await store.setCommandStatus(unknown.command.id, 'sending');
    await expect(
      store.recreateUpdateAfterConflict({
        conflictedCommandId: unknown.command.id,
        commandId: '60000000-0000-4000-8000-000000000014',
        text: 'Substituição não permitida',
      }),
    ).rejects.toThrow('Somente um conflito ou rejeição conhecida');
  });
});
