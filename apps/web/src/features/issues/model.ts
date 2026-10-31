import type { Issue, IssueEvent, IssueStatus } from '@windops/contracts';
import { ApiRequestError } from '../../lib/auth-api';
import { confirmedIssue, selectIssueProjection } from '../../offline/issue-query';
import type {
  LocalIssueCommand,
  LocalIssueProjection,
  LocalIssueStore,
} from '../../offline/local-issue-store';

export type StatusFilter = 'all' | Exclude<IssueStatus, 'completed'>;
export type IssueListEntry = {
  id: string;
  status: IssueStatus;
  parkId: string;
  turbineId: string;
  text: string;
  creatorLabel: string;
  handlerLabel: string | null;
  createdAt: string;
};
export type IssueDetailEntry = {
  id: string;
  workspaceId: string;
  parkId: string;
  turbineId: string;
  status: IssueStatus;
  text: string;
  completionReport: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  creatorId: string | null;
  creatorLabel: string;
  handlerId: string | null;
  handlerLabel: string | null;
  locallyCreated: boolean;
};

export function issueDetailEntry(issue: Issue): IssueDetailEntry {
  return {
    id: issue.id,
    workspaceId: issue.workspaceId,
    parkId: issue.parkId,
    turbineId: issue.turbineId,
    status: issue.status,
    text: issue.text,
    completionReport: issue.completionReport,
    archivedAt: issue.archivedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    revision: issue.revision,
    creatorId: issue.creator.id,
    creatorLabel: issue.creator.name,
    handlerId: issue.handler?.id ?? null,
    handlerLabel: issue.handler?.name ?? null,
    locallyCreated: false,
  };
}

export function localIssueDetailEntry(
  projection: LocalIssueProjection,
  accountId: string,
  store?: LocalIssueStore,
): IssueDetailEntry {
  const isLocalCreate = projection.serverIssue === null;
  const commands =
    store?.listPendingCommands().filter((command) => command.issueId === projection.id) ?? [];
  const unresolvedStatuses = new Set(['pending', 'sending', 'waiting_auth', 'waiting_eligibility']);
  const pendingStatusChange = commands.some(
    (command) =>
      ['start', 'return', 'complete'].includes(command.kind) &&
      unresolvedStatuses.has(command.status),
  );
  const pendingTextChange = commands.some(
    (command) =>
      ['create', 'update'].includes(command.kind) &&
      [
        'pending',
        'sending',
        'waiting_auth',
        'waiting_eligibility',
        'conflict',
        'rejected',
      ].includes(command.status),
  );
  const pendingCompletionReport = commands.some(
    (command) =>
      command.kind === 'complete' &&
      [
        'pending',
        'sending',
        'waiting_auth',
        'waiting_eligibility',
        'confirmed_waiting_replica',
      ].includes(command.status),
  );
  const acknowledged = confirmedIssue(projection, commands);
  const confirmedStatus = acknowledged?.status ?? projection.serverIssue?.status;
  return {
    id: projection.id,
    workspaceId: projection.workspaceId,
    parkId: projection.local.parkId,
    turbineId: projection.local.turbineId,
    status:
      pendingStatusChange || confirmedStatus === undefined
        ? projection.local.status === 'local'
          ? 'pending'
          : projection.local.status
        : confirmedStatus,
    text:
      pendingTextChange || !projection.serverIssue
        ? projection.local.text
        : projection.serverIssue.text,
    completionReport:
      (pendingCompletionReport
        ? projection.local.completionReport
        : (projection.serverIssue?.completionReport ?? projection.local.completionReport)) ?? null,
    archivedAt: projection.serverIssue?.archivedAt ?? null,
    createdAt: projection.serverIssue?.createdAt ?? projection.createdAt ?? projection.updatedAt,
    updatedAt: projection.updatedAt,
    revision: projection.serverRevision ?? 1,
    creatorId: projection.localIdentity?.creatorUserId ?? null,
    creatorLabel:
      projection.localIdentity?.creatorName ??
      (isLocalCreate ? 'Criado neste aparelho' : 'Registrado no servidor'),
    handlerId: projection.localIdentity?.handlerUserId ?? null,
    handlerLabel: projection.localIdentity?.handlerName ?? null,
    locallyCreated: isLocalCreate && projection.localIdentity?.creatorUserId === accountId,
  };
}

export function issueListEntry(issue: Issue): IssueListEntry {
  return {
    id: issue.id,
    status: issue.status,
    parkId: issue.parkId,
    turbineId: issue.turbineId,
    text: issue.text,
    creatorLabel: issue.creator.name,
    handlerLabel: issue.handler?.name ?? null,
    createdAt: issue.createdAt,
  };
}

export function compareIssuesByRecency(
  left: Pick<IssueListEntry, 'createdAt' | 'id'> & { updatedAt?: string },
  right: Pick<IssueListEntry, 'createdAt' | 'id'> & { updatedAt?: string },
) {
  const recency = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  return Number.isFinite(recency) && recency !== 0 ? recency : right.id.localeCompare(left.id);
}

export function projectionStatus(projection: LocalIssueProjection, commands: LocalIssueCommand[]) {
  const unresolvedStatuses = new Set(['pending', 'sending', 'waiting_auth', 'waiting_eligibility']);
  const pendingStatusChange = commands.some(
    (command) =>
      ['start', 'return', 'complete'].includes(command.kind) &&
      unresolvedStatuses.has(command.status),
  );
  if (pendingStatusChange && projection.local.status !== 'local') return projection.local.status;
  const acknowledged = confirmedIssue(projection, commands);
  return (
    acknowledged?.status ??
    projection.serverIssue?.status ??
    (projection.local.status === 'local' ? 'pending' : projection.local.status)
  );
}

export function localIssueListEntries(
  store: LocalIssueStore,
  filter: StatusFilter,
): IssueListEntry[] {
  const commands = store.listPendingCommands();
  const commandsByIssue = new Map<string, LocalIssueCommand[]>();
  for (const command of commands) {
    const forIssue = commandsByIssue.get(command.issueId) ?? [];
    forIssue.push(command);
    commandsByIssue.set(command.issueId, forIssue);
  }
  const pendingIssueIds = new Set(commands.map((command) => command.issueId));
  return store
    .listIssues()
    .filter((projection) => projection.serverActive !== false || pendingIssueIds.has(projection.id))
    .map((projection) => {
      const issueCommands = commandsByIssue.get(projection.id) ?? [];
      const pendingTextChange = issueCommands.some(
        (command) =>
          ['create', 'update'].includes(command.kind) &&
          [
            'pending',
            'sending',
            'waiting_auth',
            'waiting_eligibility',
            'conflict',
            'rejected',
          ].includes(command.status),
      );
      return {
        id: projection.id,
        status: projectionStatus(projection, issueCommands),
        parkId: projection.local.parkId,
        turbineId: projection.local.turbineId,
        text:
          pendingTextChange || !projection.serverIssue
            ? projection.local.text
            : projection.serverIssue.text,
        creatorLabel:
          projection.localIdentity?.creatorName ??
          (projection.serverIssue ? 'Registrado no servidor' : 'Novo neste aparelho'),
        handlerLabel: projection.localIdentity?.handlerName ?? null,
        createdAt:
          projection.serverIssue?.createdAt ?? projection.createdAt ?? projection.updatedAt,
      };
    })
    .filter((issue) => filter === 'all' || issue.status === filter)
    .sort(compareIssuesByRecency);
}

export function localLocations(store: LocalIssueStore) {
  const parks = new Map(
    store.listReplica('parks').map((row) => [row.id, String(row.code ?? 'Parque')]),
  );
  const turbines = new Map(
    store
      .listReplica('turbines')
      .map((row) => [`${String(row.parkId)}:${row.id}`, String(row.code ?? 'Turbina')]),
  );
  return Object.fromEntries(
    [...turbines.entries()].map(([key, turbine]) => {
      const [parkId] = key.split(':');
      return [key, { park: parks.get(parkId ?? '') ?? 'Parque', turbine }];
    }),
  );
}

export function reconcileVisibleIssuesFromJournal(
  visible: IssueListEntry[],
  store: LocalIssueStore,
  filter: StatusFilter,
) {
  const pendingCommands = store.listPendingCommands();
  const pendingIssueIds = new Set(pendingCommands.map((command) => command.issueId));
  const locallyChangingStatuses = new Set([
    'pending',
    'sending',
    'waiting_auth',
    'waiting_eligibility',
  ]);
  return visible
    .flatMap((item) => {
      const projection = store.getIssue(item.id);
      if (!projection) return [item];
      if (projection.serverActive === false && !pendingIssueIds.has(item.id)) return [];
      const issueCommands = pendingCommands.filter((command) => command.issueId === item.id);
      const hasPendingStatusChange = issueCommands.some(
        (command) =>
          ['start', 'return', 'complete'].includes(command.kind) &&
          locallyChangingStatuses.has(command.status),
      );
      const hasPendingTextChange = issueCommands.some(
        (command) =>
          ['create', 'update'].includes(command.kind) &&
          locallyChangingStatuses.has(command.status),
      );
      const status =
        hasPendingStatusChange && projection.local.status !== 'local'
          ? projection.local.status
          : item.status;
      if (status === 'completed') return [];
      if (filter !== 'all' && status !== filter) return [];
      return [
        {
          ...item,
          status,
          ...(hasPendingTextChange ? { text: projection.local.text } : {}),
          createdAt: projection.serverIssue?.createdAt ?? item.createdAt,
          creatorLabel: projection.localIdentity?.creatorName ?? item.creatorLabel,
          handlerLabel: projection.localIdentity?.handlerName ?? item.handlerLabel,
        },
      ];
    })
    .sort(compareIssuesByRecency);
}

export function pendingLocalEntries(store: LocalIssueStore, filter: StatusFilter) {
  const pendingIds = new Set(store.listPendingCommands().map((command) => command.issueId));
  return localIssueListEntries(store, filter).filter(
    (entry) => pendingIds.has(entry.id) && entry.status !== 'completed',
  );
}

export function compareCompleted(
  left: { id: string; createdAt: string; updatedAt?: string },
  right: { id: string; createdAt: string; updatedAt?: string },
) {
  return (
    (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt) ||
    right.id.localeCompare(left.id)
  );
}

export function locallyCompletedEntries(store: LocalIssueStore) {
  const commands = store.listPendingCommands();
  const pendingTextChanges = new Set(
    commands
      .filter(
        (command) =>
          ['create', 'update'].includes(command.kind) &&
          ['pending', 'sending', 'waiting_auth', 'waiting_eligibility'].includes(command.status),
      )
      .map((command) => command.issueId),
  );
  return store
    .listIssues()
    .filter((projection) =>
      selectIssueProjection(
        projection,
        commands.filter((command) => command.issueId === projection.id),
        { status: 'completed' },
      ),
    )
    .map((projection) => ({
      id: projection.id,
      status: 'completed' as const,
      parkId: projection.local.parkId,
      turbineId: projection.local.turbineId,
      text:
        pendingTextChanges.has(projection.id) || !projection.serverIssue
          ? projection.local.text
          : projection.serverIssue.text,
      creatorLabel: projection.localIdentity?.creatorName ?? 'Registrado neste aparelho',
      handlerLabel: projection.localIdentity?.handlerName ?? null,
      updatedAt:
        commands.find(
          (command) =>
            command.issueId === projection.id &&
            command.kind === 'complete' &&
            ['pending', 'sending', 'waiting_auth', 'waiting_eligibility'].includes(command.status),
        )?.createdAt ??
        projection.serverIssue?.updatedAt ??
        projection.updatedAt,
      createdAt: projection.serverIssue?.createdAt ?? projection.createdAt ?? projection.updatedAt,
    }))
    .sort(compareCompleted);
}

export function statusLabel(status: IssueStatus) {
  return status === 'pending'
    ? 'Pendente'
    : status === 'in_progress'
      ? 'Em andamento'
      : 'Concluído';
}

export function statusVariant(status: IssueStatus, archived = false) {
  if (archived) return 'outline';
  return status === 'pending' ? 'secondary' : status === 'in_progress' ? 'outline' : 'default';
}

export function statusBadgeClass(status: IssueStatus, archived = false) {
  if (archived) return 'border-border bg-muted text-muted-foreground';
  return status === 'pending'
    ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
    : status === 'in_progress'
      ? 'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200'
      : 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
}

export function formatDate(value: string, withTime = true) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(value));
}

export function eventLabel(type: IssueEvent['type']) {
  const labels: Record<IssueEvent['type'], string> = {
    created: 'Chamado registrado',
    edited: 'Chamado atualizado',
    started: 'Atendimento iniciado',
    returned: 'Chamado devolvido para a fila',
    released: 'Atendimento liberado',
    completed: 'Chamado concluído',
    archived: 'Chamado arquivado',
    reopened: 'Chamado reaberto',
    reactivated: 'Chamado reativado',
  };
  return labels[type];
}

export function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function locationKey(value: Record<string, unknown> | null) {
  if (typeof value?.parkId !== 'string' || typeof value.turbineId !== 'string') return null;
  return `${value.parkId}:${value.turbineId}`;
}

export function eventStatusLabel(value: unknown) {
  if (value === 'pending') return 'Pendente';
  if (value === 'in_progress') return 'Em andamento';
  return null;
}
export function issueErrorMessage(error: unknown, action: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.status === 403)
      return 'Seu acesso ao workspace mudou. Atualize a sessão e tente novamente.';
    if (error.status === 404) return 'Este chamado não está mais disponível neste workspace.';
    if (error.code === 'REVISION_CONFLICT')
      return 'O chamado mudou em outra sessão. Atualize os dados antes de tentar novamente.';
    if (error.code === 'IDEMPOTENCY_CONFLICT')
      return 'A chave desta tentativa já foi usada com outro conteúdo. Confira o estado do chamado.';
    if (error.code === 'ISSUE_NOT_EDITABLE')
      return 'Este chamado não pode mais ser editado neste estado.';
    if (error.code === 'EQUIPMENT_UNAVAILABLE')
      return 'O parque ou a turbina estão arquivados. Reative o equipamento antes de criar ou reativar o chamado.';
    if (error.code === 'ISSUE_STATE_CONFLICT')
      return 'O estado do chamado mudou. Atualize os dados e tente novamente.';
    if (error.code === 'ISSUE_ACTION_FORBIDDEN')
      return 'Esta ação não está disponível para sua conta neste chamado.';
    if (error.code === 'ISSUE_CREATOR_WAIT')
      return 'Outro membro pode iniciar agora. Você poderá atender este chamado após uma hora da criação.';
  }
  if (error instanceof Error && error.message.startsWith('Não foi possível conectar'))
    return `Não foi possível confirmar ${action}. Tente novamente; o retry manterá a chave deste comando.`;
  return `Não foi possível ${action}. Confira a conexão e tente novamente.`;
}
