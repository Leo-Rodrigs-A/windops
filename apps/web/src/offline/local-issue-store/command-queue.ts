import type { JournalRow, LocalCommandKind, LocalIssueCommand } from './types';

export function listPendingCommands(rows: Iterable<JournalRow>): LocalIssueCommand[] {
  return [...rows]
    .flatMap((row) => (row.kind === 'command' ? [row.value] : []))
    .filter((command) => command.status !== 'confirmed' && command.status !== 'superseded')
    .map((command) => ({ ...command, chainId: command.chainId ?? command.issueId }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function findRetryCommand(
  existing: LocalIssueCommand | undefined,
  issueId: string,
  kind: LocalCommandKind,
  payload: unknown,
) {
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

export function createLocalCommand(
  id: string,
  issueId: string,
  workspaceId: string,
  kind: LocalCommandKind,
  payload: unknown,
  dependsOn: string | null,
  baseServerRevision: number | null,
): LocalIssueCommand {
  return {
    id,
    issueId,
    chainId: issueId,
    workspaceId,
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
