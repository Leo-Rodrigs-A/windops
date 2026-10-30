import type { LocalIssueCommand, LocalIssueProjection } from './local-issue-store';

export function confirmedIssue(projection: LocalIssueProjection, commands: LocalIssueCommand[]) {
  return commands.reduce((remote, command) => {
    const ack = command.acknowledgedIssue;
    return ack && (!remote || ack.revision > remote.revision) ? ack : remote;
  }, projection.serverIssue);
}

export function selectIssueProjection(
  projection: LocalIssueProjection,
  commands: LocalIssueCommand[],
  query: {
    status: 'active' | 'pending' | 'in_progress' | 'completed' | 'archived';
    parkId?: string;
    turbineId?: string;
  },
) {
  const remote = confirmedIssue(projection, commands);
  const eligible = commands.filter((command) =>
    ['pending', 'sending', 'waiting_auth', 'waiting_eligibility'].includes(command.status),
  );
  const statusCommand = [...eligible]
    .reverse()
    .find((command) => ['create', 'start', 'return', 'complete'].includes(command.kind));
  const status = statusCommand
    ? projection.local.status === 'local'
      ? 'pending'
      : projection.local.status
    : remote?.status;
  const localLocation = eligible.some((command) => ['create', 'update'].includes(command.kind));
  const location = localLocation ? projection.local : (remote ?? projection.local);
  if (query.parkId && location.parkId !== query.parkId) return null;
  if (query.turbineId && location.turbineId !== query.turbineId) return null;
  if (query.status === 'archived')
    return remote?.archivedAt ? { status, location, sortAt: remote.archivedAt } : null;
  if (remote?.archivedAt) return null;
  if (!statusCommand && projection.serverActive === false && status !== 'completed') return null;
  if (
    query.status === 'active'
      ? !['pending', 'in_progress'].includes(status ?? '')
      : status !== query.status
  )
    return null;
  return {
    status,
    location,
    sortAt:
      query.status === 'completed'
        ? ((statusCommand?.kind === 'complete' ? statusCommand.createdAt : remote?.updatedAt) ??
          projection.updatedAt)
        : (remote?.createdAt ?? projection.createdAt ?? projection.updatedAt),
  };
}
