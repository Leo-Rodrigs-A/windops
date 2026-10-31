import {
  createCollection,
  createTransaction,
  type IndexedDBInstance,
  indexedDBCollectionOptions,
} from '@tanstack/db';
import { planJournalRetention } from './retention';
import type { JournalRow } from './types';

const JOURNAL_STORE = 'journal';

export function makeJournal(db: IndexedDBInstance) {
  return createCollection(
    indexedDBCollectionOptions<JournalRow>({
      db,
      name: JOURNAL_STORE,
      getKey: (row) => row.id,
    }),
  );
}

export type LocalJournal = ReturnType<typeof makeJournal>;

export async function commitJournalRows(input: {
  journal: LocalJournal;
  listeners: Set<() => void>;
  rows: JournalRow[];
  removedIds?: string[];
}) {
  const planned = planJournalRetention(input.journal.values(), input.rows, input.removedIds ?? []);
  const tx = createTransaction({
    autoCommit: false,
    mutationFn: async ({ transaction }) => input.journal.utils.acceptMutations(transaction),
  });
  tx.mutate(() => {
    for (const id of planned.removedIds) if (input.journal.get(id)) input.journal.delete(id);
    for (const row of planned.rows) {
      if (input.journal.get(row.id))
        input.journal.update(row.id, (draft) => Object.assign(draft, row));
      else input.journal.insert(row);
    }
  });
  await tx.commit();
  for (const listener of input.listeners) listener();
}
