import type { JournalRow } from './types';

export function planJournalRetention(
  currentRows: Iterable<JournalRow>,
  rows: JournalRow[],
  removedIds: string[] = [],
) {
  const next = new Map<string, JournalRow>([...currentRows].map((row) => [row.id, row]));
  for (const id of removedIds) next.delete(id);
  for (const row of rows) next.set(row.id, row);
  const protectedIds = new Set(
    [...next.values()].flatMap((row) =>
      row.kind === 'command' && !['confirmed', 'superseded'].includes(row.value.status)
        ? [row.value.issueId]
        : [],
    ),
  );
  const evicted = new Set(removedIds);
  const inactive = [...next.values()]
    .filter(
      (row): row is Extract<JournalRow, { kind: 'issue' }> =>
        row.kind === 'issue' && row.value.serverActive === false && !protectedIds.has(row.value.id),
    )
    .sort(
      (a, b) =>
        (b.value.serverIssue?.updatedAt ?? b.value.updatedAt).localeCompare(
          a.value.serverIssue?.updatedAt ?? a.value.updatedAt,
        ) || b.id.localeCompare(a.id),
    );
  const retainedIssueRows = new Set(inactive.slice(0, 250).map((row) => row.id));
  for (const row of inactive) {
    if (retainedIssueRows.has(row.id)) continue;
    evicted.add(row.id);
    rows.push({
      id: `revision:${row.value.id}`,
      kind: 'revision',
      value: {
        revision: Math.max(row.value.serverRevision ?? 0, row.value.serverIssue?.revision ?? 0),
      },
    });
    evicted.add(`replica:issues:${row.value.id}`);
  }

  const events = [...next.values()]
    .filter(
      (row): row is Extract<JournalRow, { kind: 'replica' }> =>
        row.kind === 'replica' &&
        row.value.collection === 'issue-events' &&
        !row.value.active &&
        !protectedIds.has(String(row.value.row.issueId)),
    )
    .sort(
      (a, b) =>
        String(b.value.row.occurredAt ?? b.value.cachedAt).localeCompare(
          String(a.value.row.occurredAt ?? a.value.cachedAt),
        ) || b.id.localeCompare(a.id),
    );
  for (const row of events.slice(1000)) evicted.add(row.id);

  const finalRemovedIds = [...evicted];
  return {
    rows: rows.filter((row) => !evicted.has(row.id)),
    removedIds: finalRemovedIds,
  };
}
