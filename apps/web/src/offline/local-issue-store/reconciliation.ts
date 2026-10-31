import type { JournalRow, LocalIssueCommand, LocalIssueProjection, SyncedIssueRow } from './types';

function sameSyncedIssue(left: SyncedIssueRow | null, right: SyncedIssueRow) {
  return Boolean(
    left &&
      left.id === right.id &&
      left.workspaceId === right.workspaceId &&
      left.parkId === right.parkId &&
      left.turbineId === right.turbineId &&
      left.text === right.text &&
      left.completionReport === right.completionReport &&
      left.status === right.status &&
      (left.archivedAt ?? null) === (right.archivedAt ?? null) &&
      left.createdAt === right.createdAt &&
      left.updatedAt === right.updatedAt &&
      left.revision === right.revision,
  );
}

export function reconcileRemoteIssue(input: {
  id: string;
  remote: SyncedIssueRow;
  current: LocalIssueProjection | undefined;
  retainedRevision: number | undefined;
  pendingCommands: LocalIssueCommand[];
}): JournalRow[] {
  const { id, remote, current, retainedRevision, pendingCommands } = input;
  if (!current && retainedRevision !== undefined && remote.revision < retainedRevision) return [];
  if (!current) {
    return [
      {
        id: `issue:${id}`,
        kind: 'issue',
        value: {
          id,
          workspaceId: remote.workspaceId,
          serverIssue: remote,
          local: {
            parkId: remote.parkId,
            turbineId: remote.turbineId,
            text: remote.text,
            status: remote.status,
          },
          serverRevision: remote.revision,
          serverActive: !remote.archivedAt && remote.status !== 'completed',
          createdAt: remote.createdAt,
          localRevision: 0,
          updatedAt: remote.updatedAt,
        },
      },
    ];
  }
  if (Math.max(current.serverRevision ?? 0, current.serverIssue?.revision ?? 0) > remote.revision)
    return [];
  if (
    current.serverActive === false &&
    remote.revision <= (current.serverRevision ?? 0) &&
    !remote.archivedAt
  )
    return [];
  if ((current.serverRevision ?? 0) === remote.revision && current.serverActive) {
    if (sameSyncedIssue(current.serverIssue, remote)) return [];
    return [
      {
        id: `issue:${id}`,
        kind: 'issue',
        value: {
          ...current,
          serverIssue: remote,
          serverActive: !remote.archivedAt && remote.status !== 'completed',
          createdAt: current.createdAt ?? remote.createdAt,
          ...(pendingCommands.length === 0
            ? {
                local: {
                  parkId: remote.parkId,
                  turbineId: remote.turbineId,
                  text: remote.text,
                  status: remote.status,
                },
              }
            : {}),
        },
      },
    ];
  }

  const rows: JournalRow[] = [];
  const unresolved: LocalIssueCommand[] = [];
  for (const command of pendingCommands) {
    if (
      command.status === 'confirmed_waiting_replica' &&
      command.acknowledgedIssue &&
      remote.revision >= command.acknowledgedIssue.revision
    ) {
      rows.push({
        id: `command:${command.id}`,
        kind: 'command',
        value: { ...command, status: 'confirmed', blockReason: null },
      });
    } else unresolved.push(command);
  }
  const awaitingResponse = unresolved.some(
    (command) => command.attemptedAt !== null && command.frozenPayload !== null,
  );
  if (unresolved.length > 0 && !awaitingResponse) {
    for (const command of unresolved) {
      rows.push({
        id: `command:${command.id}`,
        kind: 'command',
        value: {
          ...command,
          status: 'conflict',
          blockReason: 'O servidor avançou a revisão antes da confirmação desta intenção.',
        },
      });
    }
  }
  rows.push({
    id: `issue:${id}`,
    kind: 'issue',
    value: {
      ...current,
      serverIssue: remote,
      serverRevision: remote.revision,
      serverActive: !remote.archivedAt && remote.status !== 'completed',
      createdAt: current.createdAt ?? remote.createdAt,
      ...(unresolved.length === 0
        ? {
            local: {
              parkId: remote.parkId,
              turbineId: remote.turbineId,
              text: remote.text,
              status: remote.status,
            },
          }
        : {}),
    },
  });
  return rows;
}

export function confirmCompletedIssueDeparture(
  issueId: string,
  pendingCommands: LocalIssueCommand[],
): JournalRow[] {
  return pendingCommands
    .filter(
      (command) =>
        command.issueId === issueId &&
        command.status === 'confirmed_waiting_replica' &&
        command.acknowledgedIssue?.status === 'completed',
    )
    .map((command) => ({
      id: `command:${command.id}`,
      kind: 'command' as const,
      value: { ...command, status: 'confirmed' as const, blockReason: null },
    }));
}
