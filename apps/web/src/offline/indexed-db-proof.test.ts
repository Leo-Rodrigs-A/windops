import {
  createCollection,
  createIndexedDB,
  createTransaction,
  indexedDBCollectionOptions,
} from '@tanstack/db';
import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';

type JournalRow = {
  id: string;
  kind: 'issue' | 'command';
  body: string;
  invalidValue?: () => void;
};

const openDatabase = (name: string, version: number, stores = ['journal']) =>
  createIndexedDB({ idbFactory: indexedDB, name, version, stores });

const createJournal = (db: Awaited<ReturnType<typeof openDatabase>>) =>
  createCollection(
    indexedDBCollectionOptions<JournalRow>({
      db,
      name: 'journal',
      getKey: (row) => row.id,
    }),
  );

async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 2_000;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  expect(predicate()).toBe(true);
}

const liveResources: Array<{ cleanup: () => Promise<void>; close: () => void }> = [];

afterEach(async () => {
  for (const resource of liveResources.splice(0).reverse()) {
    await resource.cleanup();
    resource.close();
  }
});

describe('prova isolada do IndexedDB do TanStack DB 0.15.2', () => {
  it('restaura comandos e projeções após reabrir e atualizar o schema', async () => {
    const name = `windops-s01-reopen-${crypto.randomUUID()}`;
    const firstDb = await openDatabase(name, 1);
    const first = createJournal(firstDb);
    liveResources.push({ cleanup: () => first.cleanup(), close: () => firstDb.close() });
    await first.preload();

    const batch = createTransaction({
      autoCommit: false,
      mutationFn: async ({ transaction }) => first.utils.acceptMutations(transaction),
    });
    batch.mutate(() => {
      first.insert({ id: 'issue-1', kind: 'issue', body: 'Falha na turbina' });
      first.insert({ id: 'command-1', kind: 'command', body: 'Criar issue-1' });
    });
    await batch.commit();

    const peerDb = await openDatabase(name, 1);
    const peer = createJournal(peerDb);
    liveResources.push({ cleanup: () => peer.cleanup(), close: () => peerDb.close() });
    await peer.preload();
    expect(peer.get('issue-1')?.body).toBe('Falha na turbina');
    expect(peer.get('command-1')?.body).toBe('Criar issue-1');

    const issueWrite = first.insert({ id: 'issue-2', kind: 'issue', body: 'Segundo registro' });
    await issueWrite.isPersisted.promise;
    await waitFor(() => peer.get('issue-2')?.body === 'Segundo registro');

    const commandWrite = peer.insert({
      id: 'command-2',
      kind: 'command',
      body: 'Criar issue-2',
    });
    await commandWrite.isPersisted.promise;
    await waitFor(() => first.get('command-2')?.body === 'Criar issue-2');

    const concurrentIssue = first.insert({
      id: 'issue-concurrent-a',
      kind: 'issue',
      body: 'Gravação simultânea A',
    });
    const concurrentCommand = peer.insert({
      id: 'command-concurrent-b',
      kind: 'command',
      body: 'Gravação simultânea B',
    });
    await Promise.all([concurrentIssue.isPersisted.promise, concurrentCommand.isPersisted.promise]);
    await Promise.all([
      waitFor(() => peer.get('issue-concurrent-a')?.body === 'Gravação simultânea A'),
      waitFor(() => first.get('command-concurrent-b')?.body === 'Gravação simultânea B'),
    ]);

    firstDb.close();
    peerDb.close();
    const upgradedDb = await openDatabase(name, 2, ['journal', 'outbox-meta']);
    const upgraded = createJournal(upgradedDb);
    liveResources.push({ cleanup: () => upgraded.cleanup(), close: () => upgradedDb.close() });
    await upgraded.preload();

    expect(upgradedDb.db.objectStoreNames.contains('outbox-meta')).toBe(true);
    expect(upgraded.get('issue-1')?.body).toBe('Falha na turbina');
    expect(upgraded.get('command-1')?.body).toBe('Criar issue-1');
    expect(upgraded.get('issue-concurrent-a')?.body).toBe('Gravação simultânea A');
    expect(upgraded.get('command-concurrent-b')?.body).toBe('Gravação simultânea B');
  });

  it('aborta o lote inteiro quando qualquer linha não pode ser serializada', async () => {
    const name = `windops-s01-atomic-${crypto.randomUUID()}`;
    const db = await openDatabase(name, 1);
    const journal = createJournal(db);
    liveResources.push({ cleanup: () => journal.cleanup(), close: () => db.close() });
    await journal.preload();

    const batch = createTransaction({
      autoCommit: false,
      mutationFn: async ({ transaction }) => journal.utils.acceptMutations(transaction),
    });
    batch.mutate(() => {
      journal.insert({ id: 'issue-2', kind: 'issue', body: 'Relato local' });
      journal.insert({
        id: 'command-2',
        kind: 'command',
        body: 'Criar issue-2',
        invalidValue: () => undefined,
      });
    });

    await expect(batch.commit()).rejects.toThrow();
    expect(journal.get('issue-2')).toBeUndefined();
    expect(journal.get('command-2')).toBeUndefined();

    await journal.cleanup();
    db.close();
    const reopenedDb = await openDatabase(name, 1);
    const reopened = createJournal(reopenedDb);
    liveResources.push({ cleanup: () => reopened.cleanup(), close: () => reopenedDb.close() });
    await reopened.preload();
    expect(reopened.get('issue-2')).toBeUndefined();
    expect(reopened.get('command-2')).toBeUndefined();
  });
});
