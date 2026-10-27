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
      serverActive: false,
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
});
