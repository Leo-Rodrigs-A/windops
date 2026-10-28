import { Link, useParams } from '@tanstack/react-router';
import type { Issue, IssueEvent, IssueStatus, Park, Turbine } from '@windops/contracts';
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  Check,
  CircleHelp,
  ClipboardList,
  Clock3,
  History,
  LoaderCircle,
  type LucideIcon,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { SignOutButton } from '../components/sign-out-button';
import { ThemeToggle } from '../components/theme-toggle';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Feedback, LoadingState } from '../components/ui/feedback';
import { HomeNavigation } from '../components/ui/home-navigation';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SidebarTrigger } from '../components/ui/sidebar';
import { Textarea } from '../components/ui/textarea';
import { workspaceNavigationItems } from '../components/ui/workspace-navigation';
import { WorkspaceSidebarLayout } from '../components/ui/workspace-sidebar';
import { WorkspaceSystemActions } from '../components/workspace-system-actions';
import { ApiRequestError } from '../lib/auth-api';
import {
  getIssue,
  getIssueEvents,
  getIssues,
  lifecycleIssue,
  releaseIssue,
} from '../lib/issues-api';
import { getPark, getParks, getParkTurbines, getTurbine } from '../lib/workspace-api';
import type {
  LocalIssueCommand,
  LocalIssueProjection,
  LocalIssueStore,
} from '../offline/local-issue-store';
import { useOfflineWorkspace } from '../offline/offline-workspace-context';

const navigation = workspaceNavigationItems;
type StatusFilter = 'all' | Exclude<IssueStatus, 'completed'>;
type IssueListEntry = {
  id: string;
  status: IssueStatus;
  parkId: string;
  turbineId: string;
  text: string;
  creatorLabel: string;
  handlerLabel: string | null;
  createdAt: string;
};
type IssueDetailEntry = {
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

function issueDetailEntry(issue: Issue): IssueDetailEntry {
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

function localIssueDetailEntry(
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
  const acknowledged = commands.find(
    (command) => command.status === 'confirmed_waiting_replica' && command.acknowledgedIssue,
  )?.acknowledgedIssue;
  const confirmedStatus =
    acknowledged?.status ??
    (projection.serverActive === false ? 'completed' : projection.serverIssue?.status);
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

function issueListEntry(issue: Issue): IssueListEntry {
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

function compareIssuesByRecency(
  left: Pick<IssueListEntry, 'createdAt' | 'id'>,
  right: Pick<IssueListEntry, 'createdAt' | 'id'>,
) {
  const recency = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  return Number.isFinite(recency) && recency !== 0 ? recency : right.id.localeCompare(left.id);
}

function projectionStatus(projection: LocalIssueProjection, commands: LocalIssueCommand[]) {
  const unresolvedStatuses = new Set(['pending', 'sending', 'waiting_auth', 'waiting_eligibility']);
  const pendingStatusChange = commands.some(
    (command) =>
      ['start', 'return', 'complete'].includes(command.kind) &&
      unresolvedStatuses.has(command.status),
  );
  if (pendingStatusChange && projection.local.status !== 'local') return projection.local.status;
  const acknowledged = commands.find(
    (command) => command.status === 'confirmed_waiting_replica' && command.acknowledgedIssue,
  )?.acknowledgedIssue;
  return (
    acknowledged?.status ??
    (projection.serverActive === false ? 'completed' : projection.serverIssue?.status) ??
    (projection.local.status === 'local' ? 'pending' : projection.local.status)
  );
}

function localIssueListEntries(store: LocalIssueStore, filter: StatusFilter): IssueListEntry[] {
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

function localLocations(store: LocalIssueStore) {
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

function reconcileVisibleIssuesFromJournal(
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

function pendingLocalEntries(store: LocalIssueStore, filter: StatusFilter) {
  const pendingIds = new Set(store.listPendingCommands().map((command) => command.issueId));
  return localIssueListEntries(store, filter).filter(
    (entry) => pendingIds.has(entry.id) && entry.status !== 'completed',
  );
}

function locallyCompletedEntries(store: LocalIssueStore) {
  const commands = store.listPendingCommands();
  const completingCommands = new Set(
    commands
      .filter(
        (command) =>
          command.kind === 'complete' &&
          [
            'pending',
            'sending',
            'waiting_auth',
            'waiting_eligibility',
            'confirmed_waiting_replica',
          ].includes(command.status),
      )
      .map((command) => command.issueId),
  );
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
    .filter(
      (projection) =>
        projection.serverIssue?.status === 'completed' ||
        projection.serverActive === false ||
        (projection.local.status === 'completed' && completingCommands.has(projection.id)),
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
      createdAt: projection.serverIssue?.createdAt ?? projection.createdAt ?? projection.updatedAt,
    }))
    .sort(compareIssuesByRecency);
}

function issueErrorMessage(error: unknown, action: string) {
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

function statusLabel(status: IssueStatus) {
  return status === 'pending'
    ? 'Pendente'
    : status === 'in_progress'
      ? 'Em andamento'
      : 'Concluído';
}

function statusVariant(status: IssueStatus) {
  return status === 'pending' || status === 'completed' ? 'secondary' : 'default';
}

function formatDate(value: string, withTime = true) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(new Date(value));
}

function eventLabel(type: IssueEvent['type']) {
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

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function locationKey(value: Record<string, unknown> | null) {
  if (typeof value?.parkId !== 'string' || typeof value.turbineId !== 'string') return null;
  return `${value.parkId}:${value.turbineId}`;
}

function eventStatusLabel(value: unknown) {
  if (value === 'pending') return 'Pendente';
  if (value === 'in_progress') return 'Em andamento';
  return null;
}

function AppPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="min-w-0">
          <p className="mb-1 truncate text-sm text-muted-foreground">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <WorkspaceSystemActions />
    </header>
  );
}

export function WorkspaceHomePage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [issues, setIssues] = useState<IssueListEntry[]>([]);
  const [issueCursor, setIssueCursor] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueCacheNotice, setIssueCacheNotice] = useState('');
  const [issueNotice, setIssueNotice] = useState('');
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<Record<string, { park: string; turbine: string }>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [parks, setParks] = useState<Park[]>([]);
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [parkId, setParkId] = useState('');
  const [turbineId, setTurbineId] = useState('');
  const [draftText, setDraftText] = useState('');
  const [createError, setCreateError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const createCommand = useRef<{ commandId: string; issueId: string } | null>(null);

  const loadIssues = useCallback(
    async (cursor?: string, append = false) => {
      if (!workspaceId) return;
      append ? setMoreLoading(true) : setIssueLoading(true);
      setIssueError('');
      setIssueCacheNotice('');
      const localOnly =
        snapshot.status === 'offline' || snapshot.status === 'revoked' || !offlineWorkspace.online;
      if (localOnly) {
        if (!offlineWorkspace.store) {
          setIssueError(
            'Chamados não estão preparados neste aparelho. Conecte-se para carregar o cache offline.',
          );
          setIssueLoading(false);
          return;
        }
        const local = localIssueListEntries(offlineWorkspace.store, statusFilter).filter(
          (issue) => issue.status !== 'completed',
        );
        if (!offlineWorkspace.store.hasReplicaSnapshot('issues'))
          setIssueCacheNotice(
            'Este aparelho ainda não tem cache dos chamados. Conecte-se ao workspace para preparar os dados antes de usar offline.',
          );
        setIssues(local);
        setIssueCursor(null);
        setLocations(localLocations(offlineWorkspace.store));
        setIssueLoading(false);
        setMoreLoading(false);
        return;
      }
      try {
        const page = await getIssues(workspaceId, {
          limit: 25,
          status: statusFilter === 'all' ? 'active' : statusFilter,
          ...(cursor ? { cursor } : {}),
        });
        if (offlineWorkspace.store) {
          await offlineWorkspace.store.recordServerIssuePage(
            page.items,
            statusFilter === 'all' && page.nextCursor === null,
          );
          await Promise.all(
            page.items.map((issue) =>
              offlineWorkspace.store?.recordIssueIdentity({
                issueId: issue.id,
                creatorUserId: issue.creator.id,
                creatorName: issue.creator.name,
                handlerUserId: issue.handler?.id ?? null,
                handlerName: issue.handler?.name ?? null,
              }),
            ),
          );
        }
        const pendingEntries = offlineWorkspace.store
          ? pendingLocalEntries(offlineWorkspace.store, statusFilter)
          : [];
        setIssues((previous) => {
          const merged = new Map((append ? previous : []).map((item) => [item.id, item]));
          for (const issue of page.items) merged.set(issue.id, issueListEntry(issue));
          for (const pending of pendingEntries) merged.set(pending.id, pending);
          return [...merged.values()].sort(compareIssuesByRecency);
        });
        setIssueCursor(page.nextCursor);
        const locationsToLoad = new Map(
          [...page.items, ...pendingEntries].map(
            (issue) => [`${issue.parkId}:${issue.turbineId}`, issue] as const,
          ),
        );
        const pairs = await Promise.all(
          [...locationsToLoad.values()].map(async (item) => {
            const [park, turbine] = await Promise.all([
              getPark(workspaceId, item.parkId),
              getTurbine(workspaceId, item.parkId, item.turbineId),
            ]);
            return [
              [`${item.parkId}:${item.turbineId}`, { park: park.code, turbine: turbine.code }],
            ] as Array<[string, { park: string; turbine: string }]>;
          }),
        );
        setLocations({
          ...(offlineWorkspace.store ? localLocations(offlineWorkspace.store) : {}),
          ...Object.fromEntries(pairs.flat()),
        });
      } catch (error) {
        if (offlineWorkspace.store?.hasReplicaSnapshot('issues')) {
          setIssues(
            localIssueListEntries(offlineWorkspace.store, statusFilter).filter(
              (issue) => issue.status !== 'completed',
            ),
          );
          setLocations(localLocations(offlineWorkspace.store));
          setIssueCursor(null);
        } else setIssueError(issueErrorMessage(error, 'carregar os chamados'));
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        setIssueLoading(false);
        setMoreLoading(false);
      }
    },
    [
      offlineWorkspace.online,
      offlineWorkspace.store,
      refresh,
      snapshot.status,
      statusFilter,
      workspaceId,
    ],
  );

  useEffect(() => {
    setIssues([]);
    setIssueCursor(null);
    void loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    if (
      offlineWorkspace.version > 0 &&
      (snapshot.status !== 'authenticated' || !offlineWorkspace.online)
    )
      void loadIssues();
  }, [loadIssues, offlineWorkspace.online, offlineWorkspace.version, snapshot.status]);

  useEffect(() => {
    if (!offlineWorkspace.store || offlineWorkspace.version === 0) return;
    setIssues((current) =>
      reconcileVisibleIssuesFromJournal(
        current,
        offlineWorkspace.store as LocalIssueStore,
        statusFilter,
      ),
    );
  }, [offlineWorkspace.store, offlineWorkspace.version, statusFilter]);

  async function openCreate() {
    setCreateOpen(true);
    setCreateError('');
    setCatalogLoading(true);
    if ((!offlineWorkspace.online || snapshot.status === 'offline') && !offlineWorkspace.store) {
      setCatalogLoading(false);
      setCreateError(
        'Este workspace ainda não foi preparado neste aparelho. Conecte-se para carregar o catálogo.',
      );
      return;
    }
    if ((!offlineWorkspace.online || snapshot.status === 'offline') && offlineWorkspace.store) {
      const all = offlineWorkspace.store
        .listReplica('parks')
        .filter((park) => park.deactivatedAt == null) as unknown as Park[];
      setParks(all);
      setParkId((current) =>
        all.some((park) => park.id === current) ? current : (all[0]?.id ?? ''),
      );
      setCatalogLoading(false);
      if (!offlineWorkspace.ready)
        setCreateError('Este aparelho ainda não terminou a preparação offline.');
      else if (all.length === 0) setCreateError('Não há parques ativos salvos neste aparelho.');
      return;
    }
    try {
      let cursor: string | undefined;
      const all: Park[] = [];
      do {
        const page = await getParks(workspaceId, { limit: 100, ...(cursor ? { cursor } : {}) });
        all.push(...page.items.filter((park) => park.deactivatedAt === null));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      setParks(all);
      setParkId((current) =>
        all.some((park) => park.id === current) ? current : (all[0]?.id ?? ''),
      );
      if (all.length === 0) setCreateError('Não há parques ativos para registrar um chamado.');
    } catch (error) {
      const cached = offlineWorkspace.store
        ?.listReplica('parks')
        .filter((park) => park.deactivatedAt == null) as unknown as Park[] | undefined;
      if (cached?.length) {
        setParks(cached);
        setParkId(cached[0]?.id ?? '');
      } else setCreateError(issueErrorMessage(error, 'carregar os equipamentos disponíveis'));
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    if (!createOpen || !parkId) {
      setTurbines([]);
      setTurbineId('');
      return;
    }
    let active = true;
    setTurbines([]);
    setTurbineId('');
    setCatalogLoading(true);
    if ((!offlineWorkspace.online || snapshot.status === 'offline') && offlineWorkspace.store) {
      const all = offlineWorkspace.store
        .listReplica('turbines')
        .filter(
          (turbine) => turbine.parkId === parkId && turbine.deactivatedAt == null,
        ) as unknown as Turbine[];
      setTurbines(all);
      setTurbineId(all[0]?.id ?? '');
      setCatalogLoading(false);
      if (all.length === 0) setCreateError('Não há turbinas ativas salvas neste parque.');
      return;
    }
    void (async () => {
      try {
        let cursor: string | undefined;
        const all: Turbine[] = [];
        do {
          const page = await getParkTurbines(workspaceId, parkId, {
            limit: 100,
            ...(cursor ? { cursor } : {}),
          });
          all.push(...page.items.filter((turbine) => turbine.deactivatedAt === null));
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        if (active) {
          setTurbines(all);
          setTurbineId(all[0]?.id ?? '');
          if (all.length === 0)
            setCreateError('Este parque não tem turbinas ativas para novos chamados.');
        }
      } catch (error) {
        if (active) {
          const cached = offlineWorkspace.store
            ?.listReplica('turbines')
            .filter(
              (turbine) => turbine.parkId === parkId && turbine.deactivatedAt == null,
            ) as unknown as Turbine[] | undefined;
          if (cached?.length) {
            setTurbines(cached);
            setTurbineId(cached[0]?.id ?? '');
          } else setCreateError(issueErrorMessage(error, 'carregar as turbinas'));
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    createOpen,
    offlineWorkspace.online,
    offlineWorkspace.store,
    parkId,
    snapshot.status,
    workspaceId,
  ]);

  function changeDraft(update: () => void) {
    createCommand.current = null;
    setCreateError('');
    update();
  }

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parkId || !turbineId || !draftText.trim()) return;
    createCommand.current ??= { commandId: crypto.randomUUID(), issueId: crypto.randomUUID() };
    setCreateBusy(true);
    setCreateError('');
    try {
      if (
        !offlineWorkspace.store ||
        !offlineWorkspace.canWriteLocally ||
        ((!offlineWorkspace.online || snapshot.status === 'offline') && !offlineWorkspace.ready)
      ) {
        throw new Error('Prepare este workspace online antes de registrar trabalho local.');
      }
      await offlineWorkspace.store.saveCreate({
        ...createCommand.current,
        parkId,
        turbineId,
        text: draftText,
      });
      setIssueNotice(
        'Chamado salvo neste aparelho. O envio será confirmado quando o servidor responder.',
      );
      offlineWorkspace.refreshLocal();
      offlineWorkspace.retrySync();
      setDraftText('');
      createCommand.current = null;
      setCreateOpen(false);
      setStatusFilter('all');
      await loadIssues();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : issueErrorMessage(error, 'registrar o chamado'),
      );
    } finally {
      setCreateBusy(false);
    }
  }

  const filteredIssues = issues.filter((issue) => {
    const location = locations[`${issue.parkId}:${issue.turbineId}`];
    const searchValue = search.trim().toLocaleLowerCase('pt-BR');
    return (
      !searchValue ||
      issue.text.toLocaleLowerCase('pt-BR').includes(searchValue) ||
      location?.park.toLocaleLowerCase('pt-BR').includes(searchValue) ||
      location?.turbine.toLocaleLowerCase('pt-BR').includes(searchValue)
    );
  });

  if (!workspaceId || !offlineWorkspace.workspaceName)
    return <LoadingState label="Carregando workspace…" />;

  return (
    <WorkspaceSidebarLayout
      activeHref="/app"
      items={navigation}
      workspaceName={offlineWorkspace.workspaceName}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${offlineWorkspace.workspaceName} / Chamados`}
            title="Home"
            subtitle="Chamados pendentes e em andamento. Os mais recentes aparecem primeiro."
          />
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <fieldset
                  aria-label="Filtrar chamados"
                  className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
                >
                  {(
                    [
                      ['all', 'Abertos e em andamento'],
                      ['pending', 'Pendentes'],
                      ['in_progress', 'Em andamento'],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      aria-pressed={statusFilter === value}
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      size="sm"
                      variant={statusFilter === value ? 'default' : 'outline'}
                    >
                      {label}
                    </Button>
                  ))}
                </fieldset>
                <Button
                  className="w-full sm:w-auto"
                  disabled={
                    !offlineWorkspace.canWriteLocally ||
                    (!offlineWorkspace.online && !offlineWorkspace.ready)
                  }
                  onClick={() => void openCreate()}
                >
                  <Plus aria-hidden="true" />
                  Novo chamado
                </Button>
              </div>
              <div className="relative">
                <Label className="sr-only" htmlFor="issues-search">
                  Pesquisar chamados
                </Label>
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  id="issues-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar texto, parque ou turbina"
                  type="search"
                  value={search}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {issueNotice && (
                <div className="px-4 pt-4">
                  <Feedback message={issueNotice} tone="success" />
                </div>
              )}
              {issueCacheNotice && (
                <div className="px-4 pt-4">
                  <Feedback message={issueCacheNotice} tone="warning" />
                </div>
              )}
              {issueError ? (
                <div className="space-y-3 p-5">
                  <Feedback message={issueError} tone="error" />
                  <Button onClick={() => void loadIssues()} variant="outline">
                    <RefreshCw aria-hidden="true" /> Atualizar chamados
                  </Button>
                </div>
              ) : issueLoading ? (
                <div className="p-8">
                  <LoadingState label="Carregando chamados…" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
                  <div className="max-w-md space-y-3">
                    <ClipboardList
                      aria-hidden="true"
                      className="mx-auto size-7 text-muted-foreground"
                    />
                    <h2 className="font-semibold">
                      {search
                        ? 'Nenhum chamado encontrado'
                        : issueCacheNotice
                          ? 'Chamados indisponíveis offline'
                          : 'Nenhum chamado nesta lista'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? 'Tente outro termo ou limpe a pesquisa.'
                        : issueCacheNotice
                          ? 'Conecte-se para carregar os chamados e preparar o acesso offline neste aparelho.'
                          : 'Os chamados registrados neste workspace aparecerão aqui. Ainda não há dados de exemplo.'}
                    </p>
                    {!search && !issueCacheNotice && (
                      <Button onClick={() => void openCreate()} size="sm">
                        <Plus aria-hidden="true" /> Registrar chamado
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-border/70">
                  {filteredIssues.map((issue) => (
                    <IssueListItem
                      key={issue.id}
                      issue={issue}
                      location={locations[`${issue.parkId}:${issue.turbineId}`]}
                    />
                  ))}
                </ul>
              )}
              {issueCursor && !issueError && (
                <div className="border-t border-border/70 p-3 text-center">
                  <Button
                    disabled={moreLoading}
                    onClick={() => void loadIssues(issueCursor, true)}
                    variant="ghost"
                  >
                    {moreLoading ? 'Carregando…' : 'Carregar chamados anteriores'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <HomeNavigation
          activeHref="/app"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={navigation}
        />
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !createBusy) setCreateOpen(false);
        }}
        open={createOpen}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo chamado</DialogTitle>
            <DialogDescription>
              Descreva o problema e selecione o parque e a turbina ativos.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void submitIssue(event)}>
            <div className="space-y-2">
              <Label htmlFor="issue-park">Parque</Label>
              <Select
                disabled={catalogLoading || parks.length === 0}
                onValueChange={(value) => changeDraft(() => setParkId(value))}
                value={parkId}
              >
                <SelectTrigger id="issue-park">
                  <SelectValue placeholder="Selecione o parque" />
                </SelectTrigger>
                <SelectContent>
                  {parks.map((park) => (
                    <SelectItem key={park.id} value={park.id}>
                      Parque {park.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-turbine">Turbina</Label>
              <Select
                disabled={catalogLoading || turbines.length === 0}
                onValueChange={(value) => changeDraft(() => setTurbineId(value))}
                value={turbineId}
              >
                <SelectTrigger id="issue-turbine">
                  <SelectValue placeholder="Selecione a turbina" />
                </SelectTrigger>
                <SelectContent>
                  {turbines.map((turbine) => (
                    <SelectItem key={turbine.id} value={turbine.id}>
                      Turbina {turbine.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-text">Descrição</Label>
              <Textarea
                autoFocus
                id="issue-text"
                maxLength={10_000}
                onChange={(event) => changeDraft(() => setDraftText(event.target.value))}
                placeholder="Descreva o problema observado"
                required
                value={draftText}
              />
              <p className="text-right text-xs text-muted-foreground">
                {draftText.length.toLocaleString('pt-BR')} / 10.000
              </p>
            </div>
            {catalogLoading && <LoadingState label="Carregando equipamentos ativos…" />}
            {createError && <Feedback message={createError} tone="error" />}
            <DialogFooter>
              <Button
                disabled={createBusy}
                onClick={() => setCreateOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  createBusy || catalogLoading || !parkId || !turbineId || !draftText.trim()
                }
                type="submit"
              >
                {createBusy ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" /> Salvando…
                  </>
                ) : (
                  <>
                    <Check aria-hidden="true" /> Registrar chamado
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspaceSidebarLayout>
  );
}

function IssueListItem({
  issue,
  location,
  action,
}: {
  issue: Issue | IssueListEntry;
  location: { park: string; turbine: string } | undefined;
  action?: ReactNode;
}) {
  const item = 'creator' in issue ? issueListEntry(issue) : issue;
  return (
    <li className="flex flex-col sm:flex-row sm:items-center">
      <Link
        className="flex min-h-24 min-w-0 flex-1 items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        params={{ issueId: item.id }}
        to="/chamados/$issueId"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1 space-y-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {location
                ? `Parque ${location.park} · Turbina ${location.turbine}`
                : 'Equipamento associado'}
            </span>
            <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
          </span>
          <span className="line-clamp-2 block whitespace-pre-wrap text-sm text-muted-foreground">
            {item.text}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{item.creatorLabel}</span>
            <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            {item.handlerLabel && <span>Atendimento: {item.handlerLabel}</span>}
          </span>
        </span>
      </Link>
      {action && <div className="px-4 pb-4 sm:pb-0 sm:pr-5">{action}</div>}
    </li>
  );
}

export function ArchivedIssuesPage() {
  const { snapshot } = useAuth();
  const offline = useOfflineWorkspace();
  const workspaceId = offline.workspaceId ?? '';
  const [issues, setIssues] = useState<Issue[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState<Issue | null>(null);
  const reactivateCommands = useRef<Record<string, string>>({});
  const isAdmin =
    snapshot.status === 'authenticated' && snapshot.context.role === 'admin' && offline.online;
  const load = useCallback(
    async (next?: string, append = false) => {
      if (!workspaceId || !offline.online || snapshot.status !== 'authenticated') {
        setError('Conecte-se para consultar os chamados arquivados.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const page = await getIssues(workspaceId, {
          status: 'archived',
          limit: 25,
          ...(next ? { cursor: next } : {}),
        });
        setIssues((previous) => (append ? [...previous, ...page.items] : page.items));
        setCursor(page.nextCursor);
      } catch (cause) {
        setError(issueErrorMessage(cause, 'carregar os chamados arquivados'));
      } finally {
        setLoading(false);
      }
    },
    [offline.online, snapshot.status, workspaceId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const visible = issues.filter(
    (item) =>
      item.text.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) ||
      item.parkId.toLowerCase().includes(search.trim().toLowerCase()) ||
      item.turbineId.toLowerCase().includes(search.trim().toLowerCase()),
  );
  async function reactivate(issue: Issue): Promise<boolean> {
    const commandId = reactivateCommands.current[issue.id] ?? crypto.randomUUID();
    reactivateCommands.current[issue.id] = commandId;
    setBusyId(issue.id);
    setError('');
    setNotice('');
    try {
      await lifecycleIssue(workspaceId, issue.id, 'reactivate', {
        commandId,
        expectedRevision: issue.revision,
      });
      delete reactivateCommands.current[issue.id];
      setNotice('Chamado reativado e devolvido à lista de Pendentes.');
      await load();
      return true;
    } catch (cause) {
      setError(issueErrorMessage(cause, 'reativar o chamado'));
      return false;
    } finally {
      setBusyId('');
    }
  }
  return (
    <WorkspaceSidebarLayout
      activeHref="/arquivados"
      items={navigation}
      workspaceName={offline.workspaceName ?? 'Workspace'}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${offline.workspaceName ?? 'Workspace'} / Chamados`}
            title="Arquivados"
            subtitle="Chamados preservados com histórico; a consulta exige conexão."
          />
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
              <Label htmlFor="archived-search">Pesquisar chamados arquivados</Label>
              <Input
                id="archived-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Texto ou identificação do equipamento"
              />
            </CardHeader>
            <CardContent className="p-0">
              {notice && (
                <div className="p-4">
                  <Feedback message={notice} tone="success" />
                </div>
              )}
              {error && (
                <div className="p-4">
                  <Feedback message={error} tone="error" />
                  <Button variant="outline" onClick={() => void load()}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              {loading ? (
                <div className="p-8">
                  <LoadingState label="Carregando chamados arquivados…" />
                </div>
              ) : visible.length === 0 ? (
                <div className="grid min-h-56 place-items-center p-8 text-center">
                  <div>
                    <Archive
                      aria-hidden="true"
                      className="mx-auto mb-3 size-7 text-muted-foreground"
                    />
                    <h2 className="font-semibold">
                      {search ? 'Nenhum chamado encontrado' : 'Nenhum chamado arquivado'}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Os chamados arquivados aparecerão aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-border/70">
                  {visible.map((issue) => (
                    <IssueListItem
                      key={issue.id}
                      issue={issue}
                      location={undefined}
                      action={
                        isAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(busyId)}
                            onClick={() => setReactivateTarget(issue)}
                          >
                            {busyId === issue.id ? 'Reativando…' : 'Reativar'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              {cursor && !loading && (
                <div className="border-t p-3 text-center">
                  <Button variant="ghost" onClick={() => void load(cursor, true)}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <HomeNavigation
        activeHref="/arquivados"
        className="fixed inset-x-0 bottom-0 md:hidden"
        items={navigation}
      />
      <Dialog
        open={reactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busyId) setReactivateTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reativar chamado?</DialogTitle>
            <DialogDescription>
              O chamado voltará para Pendentes e o atendimento atual será removido. A reativação
              exige conexão e só será concluída se o parque e a turbina estiverem ativos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={Boolean(busyId)}
              onClick={() => setReactivateTarget(null)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={Boolean(busyId) || !offline.online}
              onClick={() => {
                if (reactivateTarget) {
                  void reactivate(reactivateTarget).then((succeeded) => {
                    if (succeeded) setReactivateTarget(null);
                  });
                }
              }}
              type="button"
            >
              {busyId ? 'Reativando…' : 'Reativar chamado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceSidebarLayout>
  );
}

function IssueEventCard({
  event,
  locations,
}: {
  event: IssueEvent;
  locations: Record<string, string>;
}) {
  const before = record(event.before);
  const after = record(event.after);
  const beforeLocation = locationKey(before);
  const afterLocation = locationKey(after);
  const textChanged = before?.text !== after?.text;
  const locationChanged = beforeLocation !== afterLocation;
  const statusChanged = before?.status !== after?.status;
  const handlerChanged = before?.handlerMembershipId !== after?.handlerMembershipId;
  const reportChanged = before?.completionReport !== after?.completionReport;
  const handlerName = (value: unknown) => {
    const user = record(value);
    return typeof user?.name === 'string' ? user.name : 'Sem responsável';
  };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-start gap-3 px-4 py-4">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted">
          <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{eventLabel(event.type)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{event.actorLabel}</p>
          <time className="mt-1 block text-xs text-muted-foreground" dateTime={event.occurredAt}>
            {formatDate(event.occurredAt)}
          </time>
          {(textChanged || locationChanged || statusChanged || handlerChanged || reportChanged) && (
            <div className="mt-3 space-y-3 border-t border-border/70 pt-3 text-sm">
              {textChanged && (
                <div className="space-y-2">
                  {typeof before?.text === 'string' && before.text && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Descrição anterior
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{String(before.text)}</p>
                    </div>
                  )}
                  {typeof after?.text === 'string' && after.text && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {before?.text ? 'Nova descrição' : 'Descrição registrada'}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{String(after.text)}</p>
                    </div>
                  )}
                </div>
              )}
              {locationChanged && (
                <div className="space-y-1">
                  {beforeLocation && (
                    <p>Local anterior: {locations[beforeLocation] ?? 'Equipamento associado'}</p>
                  )}
                  {afterLocation && (
                    <p>Nova localização: {locations[afterLocation] ?? 'Equipamento associado'}</p>
                  )}
                </div>
              )}
              {statusChanged && (
                <p>
                  Estado: {eventStatusLabel(before?.status) ?? '—'} →{' '}
                  {eventStatusLabel(after?.status) ?? '—'}
                </p>
              )}
              {handlerChanged && (
                <p>
                  Atendimento: {handlerName(before?.handler)} → {handlerName(after?.handler)}
                </p>
              )}
              {reportChanged && typeof after?.completionReport === 'string' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Relato de conclusão</p>
                  <p className="mt-1 whitespace-pre-wrap">{after.completionReport}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IssueDetailPage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const params = useParams({ strict: false });
  const issueId = 'issueId' in params ? String(params.issueId) : '';
  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const accountId =
    snapshot.status === 'authenticated'
      ? snapshot.me.user.id
      : snapshot.status === 'offline'
        ? snapshot.accountId
        : '';
  const [issue, setIssue] = useState<IssueDetailEntry | null>(null);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [lifecycleChoice, setLifecycleChoice] = useState<
    'archive' | 'reopen' | 'reactivate' | null
  >(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionDraft, setCompletionDraft] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [location, setLocation] = useState<{ park: Park; turbine: Turbine } | null>(null);
  const [eventLocations, setEventLocations] = useState<Record<string, string>>({});
  const actionCommands = useRef<Record<string, string>>({});
  const editCommand = useRef<string | null>(null);
  const completionReport = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hydrateEventLocations = useCallback(
    async (items: IssueEvent[]) => {
      if (!offlineWorkspace.online || snapshot.status !== 'authenticated') {
        const cached = offlineWorkspace.store ? localLocations(offlineWorkspace.store) : {};
        setEventLocations(
          Object.fromEntries(
            Object.entries(cached).map(([key, value]) => [
              key,
              `Parque ${value.park} · Turbina ${value.turbine}`,
            ]),
          ),
        );
        return;
      }
      const snapshots = items.flatMap((event) => [record(event.before), record(event.after)]);
      const pairs = new Map<string, { parkId: string; turbineId: string }>();
      for (const snapshot of snapshots) {
        const key = locationKey(snapshot);
        if (key && snapshot) {
          pairs.set(key, {
            parkId: snapshot.parkId as string,
            turbineId: snapshot.turbineId as string,
          });
        }
      }
      const resolved = await Promise.all(
        [...pairs.entries()].map(async ([key, value]) => {
          try {
            const [park, turbine] = await Promise.all([
              getPark(workspaceId, value.parkId),
              getTurbine(workspaceId, value.parkId, value.turbineId),
            ]);
            return [key, `Parque ${park.code} · Turbina ${turbine.code}`] as const;
          } catch {
            return [key, 'Equipamento não disponível'] as const;
          }
        }),
      );
      setEventLocations((current) => ({ ...current, ...Object.fromEntries(resolved) }));
    },
    [offlineWorkspace.online, offlineWorkspace.store, snapshot.status, workspaceId],
  );

  const loadDetail = useCallback(async () => {
    if (!workspaceId || !issueId) return;
    setDetailLoading(true);
    setDetailError('');
    setIssue(null);
    setEvents([]);
    setLocation(null);
    if (
      snapshot.status === 'offline' ||
      snapshot.status === 'revoked' ||
      !offlineWorkspace.online
    ) {
      const projection = offlineWorkspace.store?.getIssue(issueId);
      if (!projection) {
        setDetailError('Este chamado não está salvo neste aparelho. Conecte-se para carregá-lo.');
        setDetailLoading(false);
        return;
      }
      setIssue(localIssueDetailEntry(projection, accountId, offlineWorkspace.store ?? undefined));
      const cachedEvents =
        offlineWorkspace.store
          ?.listReplica('issue-events')
          .filter((row) => row.issueId === issueId)
          .sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)))
          .map((row) => ({
            id: String(row.id),
            issueId,
            workspaceId,
            actorMembershipId: null,
            actorLabel: String(row.actorLabel ?? 'Membro do workspace'),
            type: row.type as IssueEvent['type'],
            occurredAt: String(row.occurredAt),
            before: (row.before as Record<string, unknown> | null) ?? null,
            after: (row.after as Record<string, unknown> | null) ?? null,
          })) ?? [];
      setEvents(cachedEvents);
      setEventCursor(null);
      const park = offlineWorkspace.store
        ?.listReplica('parks')
        .find((row) => row.id === projection.local.parkId);
      const turbine = offlineWorkspace.store
        ?.listReplica('turbines')
        .find((row) => row.id === projection.local.turbineId);
      if (park && turbine)
        setLocation({ park: park as unknown as Park, turbine: turbine as unknown as Turbine });
      await hydrateEventLocations(cachedEvents);
      setDetailLoading(false);
      return;
    }
    try {
      const [item, history] = await Promise.all([
        getIssue(workspaceId, issueId),
        getIssueEvents(workspaceId, issueId, { limit: 25 }),
      ]);
      setIssue(issueDetailEntry(item));
      await offlineWorkspace.store?.recordIssueIdentity({
        issueId: item.id,
        creatorUserId: item.creator.id,
        creatorName: item.creator.name,
        handlerUserId: item.handler?.id ?? null,
        handlerName: item.handler?.name ?? null,
      });
      setEvents(history.items);
      setEventCursor(history.nextCursor);
      await hydrateEventLocations(history.items);
      const [park, turbine] = await Promise.all([
        getPark(workspaceId, item.parkId),
        getTurbine(workspaceId, item.parkId, item.turbineId),
      ]);
      setLocation({ park, turbine });
    } catch (error) {
      const projection = offlineWorkspace.store?.getIssue(issueId);
      if (projection) {
        setIssue(localIssueDetailEntry(projection, accountId, offlineWorkspace.store ?? undefined));
        setEvents(
          (offlineWorkspace.store?.listReplica('issue-events') ?? [])
            .filter((row) => row.issueId === issueId)
            .sort(
              (left, right) =>
                String(right.occurredAt).localeCompare(String(left.occurredAt)) ||
                String(right.id).localeCompare(String(left.id)),
            )
            .map((row) => ({
              id: String(row.id),
              issueId,
              workspaceId,
              actorMembershipId: null,
              actorLabel: String(row.actorLabel ?? 'Membro do workspace'),
              type: row.type as IssueEvent['type'],
              occurredAt: String(row.occurredAt),
              before: (row.before as Record<string, unknown> | null) ?? null,
              after: (row.after as Record<string, unknown> | null) ?? null,
            })),
        );
        await hydrateEventLocations([]);
      } else setDetailError(issueErrorMessage(error, 'carregar o chamado'));
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
    } finally {
      setDetailLoading(false);
    }
  }, [
    accountId,
    hydrateEventLocations,
    issueId,
    offlineWorkspace.online,
    offlineWorkspace.store,
    refresh,
    snapshot.status,
    workspaceId,
  ]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!offlineWorkspace.store || offlineWorkspace.version === 0 || !issueId) return;
    const pendingStatuses = new Set([
      'pending',
      'sending',
      'waiting_auth',
      'waiting_eligibility',
      'confirmed_waiting_replica',
    ]);
    const hasUnconfirmedCommand = offlineWorkspace.store
      .listPendingCommands()
      .some((command) => command.issueId === issueId && pendingStatuses.has(command.status));
    if (snapshot.status === 'authenticated' && offlineWorkspace.online && !hasUnconfirmedCommand)
      return;
    const projection = offlineWorkspace.store.getIssue(issueId);
    if (projection) setIssue(localIssueDetailEntry(projection, accountId, offlineWorkspace.store));
  }, [
    accountId,
    issueId,
    offlineWorkspace.online,
    offlineWorkspace.store,
    offlineWorkspace.version,
    snapshot.status,
  ]);

  async function runAction(
    action: 'start' | 'return' | 'release' | 'complete',
    report?: string,
  ): Promise<boolean> {
    if (!issue) return false;
    if (action === 'complete' && completionReport.current === null && report !== undefined)
      completionReport.current = report.trim();
    let commandId = actionCommands.current[action];
    if (!commandId) {
      commandId = crypto.randomUUID();
      actionCommands.current[action] = commandId;
    }
    setBusyAction(action);
    setDetailError('');
    setCompletionError('');
    setNotice('');
    let actionCommitted = false;
    try {
      if (action !== 'release') {
        const store = offlineWorkspace.store;
        if (!store || !offlineWorkspace.canWriteLocally)
          throw new Error('Este workspace ainda não está preparado para alterações locais.');
        await store.queueMutation({
          issueId: issue.id,
          commandId,
          kind: action,
          payload: {
            commandId,
            expectedRevision: issue.revision,
            ...(action === 'complete' && completionReport.current
              ? { report: completionReport.current }
              : {}),
          },
        });
        const projection = store.getIssue(issue.id);
        if (projection) setIssue(localIssueDetailEntry(projection, accountId, store));
        actionCommitted = true;
        delete actionCommands.current[action];
        if (action === 'complete') {
          completionReport.current = null;
          setCompleteOpen(false);
          setCompletionDraft('');
        }
        setNotice(
          offlineWorkspace.online && snapshot.status === 'authenticated'
            ? 'Ação salva neste aparelho. A confirmação do servidor ainda está pendente.'
            : 'Ação salva neste aparelho; será enviada quando a sessão e a conexão permitirem.',
        );
        offlineWorkspace.refreshLocal();
        offlineWorkspace.retrySync();
        return true;
      }
      const command = { commandId, expectedRevision: issue.revision };
      const updated = await releaseIssue(workspaceId, issue.id, command);
      actionCommitted = true;
      delete actionCommands.current[action];
      setIssue(issueDetailEntry(updated));
      setNotice('Atendimento liberado.');
      const history = await getIssueEvents(workspaceId, issue.id, { limit: 25 });
      setEvents(history.items);
      setEventCursor(history.nextCursor);
      await hydrateEventLocations(history.items);
      return true;
    } catch (error) {
      setDetailError(issueErrorMessage(error, 'liberar o atendimento'));
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      if (error instanceof ApiRequestError && error.status === 409 && !actionCommitted) {
        delete actionCommands.current[action];
        await loadDetail();
      }
    } finally {
      setBusyAction('');
    }
    return actionCommitted;
  }

  async function confirmLifecycle() {
    if (
      !issue ||
      !lifecycleChoice ||
      snapshot.status !== 'authenticated' ||
      !offlineWorkspace.online
    )
      return;
    const action = lifecycleChoice;
    const commandId = actionCommands.current[action] ?? crypto.randomUUID();
    actionCommands.current[action] = commandId;
    setBusyAction(action);
    setDetailError('');
    try {
      const updated = await lifecycleIssue(workspaceId, issue.id, action, {
        commandId,
        expectedRevision: issue.revision,
      });
      delete actionCommands.current[action];
      setIssue(issueDetailEntry(updated));
      setLifecycleChoice(null);
      setNotice(
        action === 'archive'
          ? 'Chamado arquivado.'
          : action === 'reopen'
            ? 'Chamado reaberto.'
            : 'Chamado reativado.',
      );
      const history = await getIssueEvents(workspaceId, issue.id, { limit: 25 });
      setEvents(history.items);
      setEventCursor(history.nextCursor);
    } catch (cause) {
      setDetailError(issueErrorMessage(cause, 'atualizar o ciclo de vida'));
    } finally {
      setBusyAction('');
    }
  }

  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pendingCompletion = offlineWorkspace.store
      ?.listPendingCommands()
      .find(
        (command) =>
          command.issueId === issueId &&
          command.kind === 'complete' &&
          command.status === 'pending' &&
          command.attemptedAt === null &&
          command.frozenPayload === null,
      );
    if (pendingCompletion && offlineWorkspace.store) {
      try {
        await offlineWorkspace.store.updatePendingCompletionReport(
          pendingCompletion.id,
          completionDraft,
        );
        const projection = offlineWorkspace.store.getIssue(issueId);
        if (projection)
          setIssue(localIssueDetailEntry(projection, accountId, offlineWorkspace.store));
        setNotice('Relato de conclusão atualizado neste aparelho.');
        setCompleteOpen(false);
        offlineWorkspace.refreshLocal();
        offlineWorkspace.retrySync();
      } catch (error) {
        setCompletionError(
          error instanceof Error ? error.message : 'Não foi possível atualizar o relato.',
        );
      }
      return;
    }
    const succeeded = await runAction('complete', completionDraft);
    if (succeeded) {
      setCompleteOpen(false);
      setCompletionDraft('');
      setCompletionError('');
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue) return;
    editCommand.current ??= crypto.randomUUID();
    setEditBusy(true);
    setEditError('');
    try {
      const store = offlineWorkspace.store;
      if (!store || !offlineWorkspace.canWriteLocally)
        throw new Error('Este workspace ainda não está preparado para alterações locais.');
      const conflicted = store
        .listPendingCommands()
        .find(
          (command) =>
            command.issueId === issue.id &&
            command.kind === 'update' &&
            command.status === 'conflict',
        );
      if (conflicted) {
        await store.recreateUpdateAfterConflict({
          conflictedCommandId: conflicted.id,
          commandId: editCommand.current,
          text: editText,
        });
      } else {
        await store.saveUpdate({
          issueId: issue.id,
          commandId: editCommand.current,
          expectedRevision: issue.revision,
          text: editText,
        });
      }
      const projection = store.getIssue(issue.id);
      if (projection) setIssue(localIssueDetailEntry(projection, accountId, store));
      editCommand.current = null;
      setEditOpen(false);
      setNotice('Alteração salva neste aparelho. A confirmação do servidor ainda está pendente.');
      offlineWorkspace.refreshLocal();
      offlineWorkspace.retrySync();
    } catch (error) {
      setEditError(issueErrorMessage(error, 'salvar as alterações'));
      if (error instanceof ApiRequestError && error.status === 409) {
        editCommand.current = null;
        await loadDetail();
      }
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
    } finally {
      setEditBusy(false);
    }
  }

  async function loadMoreEvents() {
    if (!issue || !eventCursor) return;
    try {
      const page = await getIssueEvents(workspaceId, issue.id, { limit: 25, cursor: eventCursor });
      setEvents((current) => [...page.items, ...current]);
      setEventCursor(page.nextCursor);
      await hydrateEventLocations(page.items);
    } catch (error) {
      setDetailError(issueErrorMessage(error, 'carregar o histórico'));
    }
  }

  if (
    snapshot.status !== 'authenticated' &&
    snapshot.status !== 'offline' &&
    snapshot.status !== 'revoked'
  )
    return <LoadingState label="Conferindo sua sessão…" />;
  const isAdmin =
    snapshot.status === 'authenticated' &&
    snapshot.context.role === 'admin' &&
    offlineWorkspace.online;
  const isCreator = Boolean(issue?.locallyCreated || (accountId && issue?.creatorId === accountId));
  const isHandler = Boolean(accountId && issue?.handlerId === accountId);
  const workspaceName = offlineWorkspace.workspaceName ?? 'Workspace';
  const currentLocalCommands =
    offlineWorkspace.store?.listPendingCommands().filter((item) => item.issueId === issueId) ?? [];
  const hasUnconfirmedChanges = currentLocalCommands.some((item) => item.status !== 'confirmed');
  const editableCompletion = currentLocalCommands.find(
    (command) =>
      command.kind === 'complete' &&
      command.status === 'pending' &&
      command.attemptedAt === null &&
      command.frozenPayload === null,
  );
  const conflictReview =
    currentLocalCommands
      .filter((command) => command.kind === 'update' && command.status === 'conflict')
      .map((command) => offlineWorkspace.store?.getConflictReview(command.id) ?? null)
      .find((review) => review !== null) ?? null;

  return (
    <WorkspaceSidebarLayout activeHref="/app" items={navigation} workspaceName={workspaceName}>
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild aria-label="Voltar à Home" size="icon" variant="outline">
              <Link to="/app">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <AppPageHeader eyebrow={`${workspaceName} / Chamados`} title="Detalhe do chamado" />
            </div>
          </div>
          {notice && <Feedback message={notice} tone="success" />}
          {detailError && <Feedback message={detailError} tone="error" />}
          {conflictReview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conflito de edição</CardTitle>
                <CardDescription>
                  A versão remota permanece vigente. Revise a base, sua edição e o texto recebido
                  antes de criar uma nova alteração.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Versão base</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {conflictReview.base?.text ?? 'Sem versão base local'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Sua edição</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{conflictReview.local.text}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Versão remota atual</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{conflictReview.remote.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revisão {conflictReview.remote.revision}
                  </p>
                </div>
                {isCreator && (
                  <div className="sm:col-span-3">
                    <Button
                      onClick={() => {
                        setEditText(conflictReview.local.text);
                        setEditError('');
                        setEditOpen(true);
                      }}
                      variant="outline"
                    >
                      Revisar e criar nova edição
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {detailLoading ? (
            <Card className="p-8">
              <LoadingState label="Carregando chamado e histórico…" />
            </Card>
          ) : issue ? (
            <>
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(issue.status)}>
                        {statusLabel(issue.status)}
                      </Badge>
                      {hasUnconfirmedChanges && (
                        <Badge variant="outline">Ainda não confirmado</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {location
                          ? `Parque ${location.park.code} · Turbina ${location.turbine.code}`
                          : 'Equipamento associado'}
                      </span>
                    </div>
                    {isCreator && issue.status === 'pending' && (
                      <Button
                        onClick={() => {
                          setEditText(issue.text);
                          setEditError('');
                          setEditOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Editar meu chamado
                      </Button>
                    )}
                    {isAdmin && issue.status === 'completed' && !issue.archivedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLifecycleChoice('reopen')}
                      >
                        Reabrir
                      </Button>
                    )}
                    {isAdmin && issue.archivedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLifecycleChoice('reactivate')}
                      >
                        Reativar
                      </Button>
                    )}
                    {!issue.archivedAt &&
                      issue.status !== 'completed' &&
                      (isAdmin || (isCreator && issue.status === 'pending')) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLifecycleChoice('archive')}
                        >
                          Arquivar
                        </Button>
                      )}
                  </div>
                  <CardTitle className="text-base font-normal leading-relaxed whitespace-pre-wrap">
                    {issue.text}
                  </CardTitle>
                  {issue.completionReport && (
                    <div className="rounded-lg bg-muted/60 p-3 text-sm">
                      <p className="mb-1 font-medium">Relato de conclusão</p>
                      <p className="whitespace-pre-wrap">{issue.completionReport}</p>
                    </div>
                  )}
                  <CardDescription className="flex flex-wrap gap-x-5 gap-y-1">
                    <span>Registrado por {issue.creatorLabel}</span>
                    <time dateTime={issue.createdAt}>{formatDate(issue.createdAt)}</time>
                    {issue.handlerLabel && <span>Em atendimento por {issue.handlerLabel}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  {issue.status === 'pending' && (
                    <Button
                      disabled={
                        Boolean(busyAction) ||
                        (isCreator &&
                          !issue.locallyCreated &&
                          clockNow < new Date(issue.createdAt).getTime() + 60 * 60 * 1000)
                      }
                      onClick={() => void runAction('start')}
                    >
                      {busyAction === 'start' ? 'Iniciando…' : 'Iniciar atendimento'}
                    </Button>
                  )}
                  {issue.status === 'pending' &&
                    isCreator &&
                    clockNow < new Date(issue.createdAt).getTime() + 60 * 60 * 1000 && (
                      <p className="self-center text-sm text-muted-foreground">
                        Outro membro pode iniciar agora. Você poderá atender este chamado após uma
                        hora da criação.
                      </p>
                    )}
                  {editableCompletion && (
                    <Button
                      onClick={() => {
                        const payload = editableCompletion.payload as { report?: unknown };
                        setCompletionDraft(
                          typeof payload.report === 'string' ? payload.report : '',
                        );
                        setCompletionError('');
                        setCompleteOpen(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Editar relato ainda não enviado
                    </Button>
                  )}
                  {issue.status === 'in_progress' && isHandler && (
                    <Button
                      disabled={Boolean(busyAction)}
                      onClick={() => {
                        setCompletionDraft(completionReport.current ?? '');
                        setCompletionError('');
                        setCompleteOpen(true);
                      }}
                    >
                      {busyAction === 'complete' ? 'Concluindo…' : 'Concluir chamado'}
                    </Button>
                  )}
                  {issue.status === 'in_progress' && isHandler && (
                    <Button
                      disabled={Boolean(busyAction)}
                      onClick={() => void runAction('return')}
                      variant="outline"
                    >
                      {busyAction === 'return' ? 'Devolvendo…' : 'Devolver à fila'}
                    </Button>
                  )}
                  {issue.status === 'in_progress' && isAdmin && !isHandler && (
                    <Button
                      disabled={Boolean(busyAction)}
                      onClick={() => void runAction('release')}
                      variant="outline"
                    >
                      {busyAction === 'release' ? 'Liberando…' : 'Liberar atendimento'}
                    </Button>
                  )}
                  {issue.status === 'in_progress' && !isHandler && !isAdmin && (
                    <p className="self-center text-sm text-muted-foreground">
                      O chamado está em atendimento por {issue.handlerLabel ?? 'outro membro'}.
                    </p>
                  )}
                </CardContent>
              </Card>

              <section aria-labelledby="issue-history-title" className="space-y-3">
                <div className="flex items-center gap-2">
                  <History aria-hidden="true" className="size-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold" id="issue-history-title">
                    Histórico de alterações · mais recentes primeiro
                  </h2>
                </div>
                {events.length === 0 ? (
                  <Card className="p-5 text-sm text-muted-foreground">
                    Ainda não há eventos de histórico para este chamado.
                  </Card>
                ) : (
                  <ol className="space-y-3">
                    {events.map((event) => (
                      <li key={event.id}>
                        <IssueEventCard event={event} locations={eventLocations} />
                      </li>
                    ))}
                  </ol>
                )}
                {eventCursor && (
                  <div className="text-center">
                    <Button onClick={() => void loadMoreEvents()} variant="ghost">
                      Carregar eventos anteriores
                    </Button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <Card className="p-8 text-center">
              <CircleHelp aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 font-medium">Chamado indisponível</p>
            </Card>
          )}
        </div>
        <HomeNavigation
          activeHref="/app"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={navigation}
        />
      </main>

      <Dialog
        open={lifecycleChoice !== null}
        onOpenChange={(open) => {
          if (!open && !busyAction) setLifecycleChoice(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lifecycleChoice === 'archive'
                ? 'Arquivar chamado?'
                : lifecycleChoice === 'reopen'
                  ? 'Reabrir chamado?'
                  : 'Reativar chamado?'}
            </DialogTitle>
            <DialogDescription>
              A ação exige conexão. Reabrir ou reativar só funciona quando parque e turbina estão
              ativos. O histórico permanece disponível.
            </DialogDescription>
          </DialogHeader>
          {detailError && <Feedback message={detailError} tone="error" />}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={Boolean(busyAction)}
              onClick={() => setLifecycleChoice(null)}
            >
              Cancelar
            </Button>
            <Button disabled={Boolean(busyAction)} onClick={() => void confirmLifecycle()}>
              {busyAction ? 'Salvando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(open) => {
          if (!open && !editBusy) setEditOpen(false);
        }}
        open={editOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar chamado</DialogTitle>
            <DialogDescription>
              Você pode editar seu chamado enquanto ele estiver pendente.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void submitEdit(event)}>
            <div className="space-y-2">
              <Label htmlFor="edit-issue-text">Descrição</Label>
              <Textarea
                autoFocus
                id="edit-issue-text"
                maxLength={10_000}
                onChange={(event) => {
                  editCommand.current = null;
                  setEditText(event.target.value);
                }}
                required
                value={editText}
              />
            </div>
            {editError && <Feedback message={editError} tone="error" />}
            <DialogFooter>
              <Button
                disabled={editBusy}
                onClick={() => setEditOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button disabled={editBusy || !editText.trim()} type="submit">
                {editBusy ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(open) => {
          if (!busyAction) setCompleteOpen(open);
        }}
        open={completeOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir chamado</DialogTitle>
            <DialogDescription>
              Esta ação registra o chamado no Histórico e não pode ser desfeita nesta etapa. Informe
              um relato de conclusão se desejar.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void submitCompletion(event)}>
            <div className="space-y-2">
              <Label htmlFor="completion-report">Relato de conclusão (opcional)</Label>
              <Textarea
                autoFocus
                disabled={Boolean(actionCommands.current.complete)}
                id="completion-report"
                maxLength={10_000}
                onChange={(event) => setCompletionDraft(event.target.value)}
                placeholder="Descreva o serviço realizado, se necessário."
                value={completionDraft}
              />
            </div>
            {completionError && <Feedback message={completionError} tone="error" />}
            <DialogFooter>
              <Button
                disabled={Boolean(busyAction)}
                onClick={() => setCompleteOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button disabled={Boolean(busyAction)} type="submit">
                {busyAction === 'complete' ? 'Concluindo…' : 'Confirmar conclusão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspaceSidebarLayout>
  );
}

export function IssueHistoryPage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const workspaceName = offlineWorkspace.workspaceName ?? 'Workspace';
  const historyLocations = offlineWorkspace.store ? localLocations(offlineWorkspace.store) : {};
  const [completed, setCompleted] = useState<Array<Issue | IssueListEntry>>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  // Re-read local completion entries whenever the journal changes, including after a sync ACK.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The journal version intentionally refreshes offline history.
  useEffect(() => {
    if (!workspaceId) return;
    if (offlineWorkspace.online && snapshot.status === 'authenticated') return;
    setHistoryLoading(false);
    setHistoryError('');
    setCompleted(offlineWorkspace.store ? locallyCompletedEntries(offlineWorkspace.store) : []);
    if (!offlineWorkspace.store?.isReplicaReady())
      setHistoryError('Histórico local indisponível. Conecte-se para preparar o cache.');
  }, [
    offlineWorkspace.online,
    offlineWorkspace.store,
    offlineWorkspace.version,
    snapshot.status,
    workspaceId,
  ]);

  useEffect(() => {
    if (!workspaceId || !offlineWorkspace.online || snapshot.status !== 'authenticated') return;
    let active = true;
    const store = offlineWorkspace.store;
    setHistoryLoading(true);
    setHistoryError('');
    void (async () => {
      try {
        const items = await getAllIssues(workspaceId, 'completed');
        let cacheError = false;
        if (store) {
          try {
            await store.recordServerIssuePage(items);
            await Promise.all(
              items.map((issue) =>
                store.recordIssueIdentity({
                  issueId: issue.id,
                  creatorUserId: issue.creator.id,
                  creatorName: issue.creator.name,
                  handlerUserId: issue.handler?.id ?? null,
                  handlerName: issue.handler?.name ?? null,
                }),
              ),
            );
          } catch {
            cacheError = true;
          }
        }
        if (active) {
          const merged = new Map<string, Issue | IssueListEntry>(
            items.map((item) => [item.id, item]),
          );
          if (store)
            for (const item of locallyCompletedEntries(store))
              if (!merged.has(item.id)) merged.set(item.id, item);
          setCompleted([...merged.values()].sort(compareIssuesByRecency));
          if (cacheError)
            setHistoryError(
              'Histórico carregado, mas não foi possível salvar uma cópia neste aparelho.',
            );
        }
      } catch (error) {
        if (!active) return;
        setCompleted(store ? locallyCompletedEntries(store) : []);
        setHistoryError(
          store?.isReplicaReady()
            ? 'Servidor indisponível; exibindo o histórico salvo neste aparelho.'
            : issueErrorMessage(error, 'carregar os chamados concluídos'),
        );
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      }
    })().finally(() => {
      if (active) setHistoryLoading(false);
    });
    return () => {
      active = false;
    };
  }, [offlineWorkspace.online, offlineWorkspace.store, refresh, snapshot.status, workspaceId]);
  if (snapshot.status !== 'authenticated' && snapshot.status !== 'offline')
    return <LoadingState label="Conferindo sua sessão…" />;
  return (
    <WorkspaceSidebarLayout
      activeHref="/historico"
      items={navigation}
      workspaceName={workspaceName}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${workspaceName} / Auditoria`}
            title="Histórico"
            subtitle="Conferência e recuperação de chamados concluídos. Os mais recentes aparecem primeiro."
          />
          {historyError && <Feedback message={historyError} tone="error" />}
          <Card>
            <CardHeader>
              <CardTitle>Chamados concluídos</CardTitle>
              <CardDescription>Registro para auditoria e conferência.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <LoadingState label="Carregando chamados concluídos…" />
              ) : completed.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum chamado concluído.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {completed.map((issue) => (
                    <IssueListItem
                      key={issue.id}
                      issue={issue}
                      location={historyLocations[`${issue.parkId}:${issue.turbineId}`]}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <HomeNavigation
          activeHref="/historico"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={navigation}
        />
      </main>
    </WorkspaceSidebarLayout>
  );
}

export function AccountSettingsPage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const workspaceId = snapshot.status === 'authenticated' ? snapshot.context.workspace.id : '';
  const [ownedOpen, setOwnedOpen] = useState<number | null>(null);
  const [handledInProgress, setHandledInProgress] = useState<number | null>(null);
  const [metricsError, setMetricsError] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || snapshot.status !== 'authenticated') return;
    let active = true;
    void (async () => {
      setMetricsLoading(true);
      setMetricsError('');
      try {
        const [pending, progress] = await Promise.all([
          getAllIssues(workspaceId, 'pending'),
          getAllIssues(workspaceId, 'in_progress'),
        ]);
        if (!active) return;
        const open = [...pending, ...progress];
        setOwnedOpen(
          open.filter(
            (issue) =>
              issue.creator.id === snapshot.me.user.id || issue.handler?.id === snapshot.me.user.id,
          ).length,
        );
        setHandledInProgress(
          progress.filter((issue) => issue.handler?.id === snapshot.me.user.id).length,
        );
      } catch (error) {
        if (!active) return;
        setMetricsError(issueErrorMessage(error, 'carregar os indicadores individuais'));
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        if (active) setMetricsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh, snapshot, workspaceId]);

  if (snapshot.status === 'offline' || snapshot.status === 'revoked') {
    const workspaceName = offlineWorkspace.workspaceName ?? 'Workspace';
    const revoked = snapshot.status === 'revoked';
    return (
      <WorkspaceSidebarLayout activeHref="/conta" items={navigation} workspaceName={workspaceName}>
        <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <AppPageHeader
              eyebrow={`${workspaceName} / Preferências`}
              title="Conta e configurações"
            />
            <Card>
              <CardHeader>
                <CardTitle>Conta neste aparelho</CardTitle>
                <CardDescription>
                  {revoked
                    ? 'O acesso a este workspace foi revogado. Os comandos locais permanecem preservados para exportação.'
                    : 'A sessão precisa ser renovada para consultar sua conta e enviar alterações.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <ThemeToggle />
                <SignOutButton />
              </CardContent>
            </Card>
            {offlineWorkspace.pendingCommands.length > 0 && (
              <Feedback
                message={`${offlineWorkspace.pendingCommands.length} alteração(ões) local(is) continuam preservadas nesta conta.`}
                tone="info"
              />
            )}
          </div>
          <HomeNavigation
            activeHref="/conta"
            className="fixed inset-x-0 bottom-0 md:hidden"
            items={navigation}
          />
        </main>
      </WorkspaceSidebarLayout>
    );
  }
  if (snapshot.status !== 'authenticated') return <LoadingState label="Conferindo sua sessão…" />;
  const { me, context } = snapshot;
  return (
    <WorkspaceSidebarLayout
      activeHref="/conta"
      items={navigation}
      workspaceName={context.workspace.name}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${context.workspace.name} / Preferências`}
            title="Conta e configurações"
          />
          <section
            aria-label="Resumo da conta"
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          >
            <Card>
              <CardHeader>
                <span className="grid size-11 place-items-center rounded-xl border border-primary/10 bg-primary/10 text-primary">
                  <UserRound aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>Minha conta</CardTitle>
                <CardDescription>Identidade e acesso ao workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="mt-1 font-medium">{me.user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail verificado</p>
                  <p className="mt-1 break-all font-medium">{me.user.email}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                  {context.role === 'admin' ? 'Administrador' : 'Técnico'} ·{' '}
                  {context.workspace.name}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  <ThemeToggle />
                  <SignOutButton />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Meus chamados</CardTitle>
                <CardDescription>
                  Indicadores calculados dos chamados ativos visíveis no workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsError && <Feedback message={metricsError} tone="error" />}
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    label="Chamados abertos comigo"
                    value={ownedOpen}
                    loading={metricsLoading}
                    icon={Clock3}
                  />
                  <MetricCard
                    label="Em atendimento comigo"
                    value={handledInProgress}
                    loading={metricsLoading}
                    icon={Settings2}
                  />
                  <Card className="gap-2 border-dashed bg-muted/30 py-4">
                    <CardContent className="px-4">
                      <p className="text-xs leading-snug text-muted-foreground">Concluídos</p>
                      <p className="mt-2 text-sm font-medium">Disponível na etapa 08</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A API ainda não oferece conclusão de issues.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {metricsError && (
                  <div className="mt-4">
                    <Button onClick={() => void refresh()} size="sm" variant="outline">
                      <RefreshCw aria-hidden="true" /> Tentar novamente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          {context.role === 'admin' && (
            <Card className="flex flex-row flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <CardTitle className="text-base">Equipe do workspace</CardTitle>
                <CardDescription className="mt-1">
                  Gerencie membros, cargos e convites.
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link to="/equipe">
                  <Settings2 aria-hidden="true" /> Gerenciar equipe
                </Link>
              </Button>
            </Card>
          )}
          {context.role !== 'admin' && (
            <Card className="gap-2 py-4">
              <CardContent className="flex items-start gap-3 px-5">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Acesso à equipe</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O gerenciamento de membros e convites é feito por um administrador do workspace.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <HomeNavigation
          activeHref="/conta"
          className="fixed inset-x-0 bottom-0 md:hidden"
          items={navigation}
        />
      </main>
    </WorkspaceSidebarLayout>
  );
}

async function getAllIssues(workspaceId: string, status: IssueStatus) {
  const items: Issue[] = [];
  let cursor: string | undefined;
  do {
    const page = await getIssues(workspaceId, {
      status,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}

function MetricCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs leading-snug text-muted-foreground">{label}</p>
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {loading ? (
            <LoaderCircle aria-label="Carregando indicador" className="size-5 animate-spin" />
          ) : (
            (value ?? '—')
          )}
        </p>
      </CardContent>
    </Card>
  );
}
