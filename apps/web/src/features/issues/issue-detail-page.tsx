import { Link, useParams } from '@tanstack/react-router';
import type { IssueEvent, Park, Turbine } from '@windops/contracts';
import { ArrowLeft, CircleHelp, History } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Feedback, LoadingState } from '../../components/ui/feedback';
import { HomeNavigation } from '../../components/ui/home-navigation';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import { WorkspaceSidebarLayout } from '../../components/ui/workspace-sidebar';
import { ApiRequestError } from '../../lib/auth-api';
import { getIssue, getIssueEvents, lifecycleIssue, releaseIssue } from '../../lib/issues-api';
import { getPark, getTurbine } from '../../lib/workspace-api';
import { useOfflineWorkspace } from '../../offline/offline-workspace-context';
import { AppPageHeader, IssueEventCard } from './components';
import {
  formatDate,
  type IssueDetailEntry,
  issueDetailEntry,
  issueErrorMessage,
  localIssueDetailEntry,
  localLocations,
  locationKey,
  record,
  statusBadgeClass,
  statusLabel,
  statusVariant,
} from './model';

const navigation = workspaceNavigationItems;

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
        if (!store || !offlineWorkspace.canWriteLocally) {
          setDetailError(
            'Este workspace ainda não está preparado para alterações locais. Confira o estado na Cloud.',
          );
          return false;
        }
        if (!store.getIssue(issue.id)) {
          setDetailError(
            'Este chamado ainda não está salvo neste aparelho. Abra-o online e aguarde a sincronização antes de tentar novamente offline.',
          );
          return false;
        }
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
      const actionLabel = {
        start: 'iniciar o atendimento',
        return: 'devolver o atendimento',
        release: 'liberar o atendimento',
        complete: 'concluir o chamado',
      }[action];
      setDetailError(
        action !== 'release' && !actionCommitted
          ? `Não foi possível salvar a ação neste aparelho para ${actionLabel}. Confira o armazenamento e o estado na Cloud antes de tentar novamente.`
          : issueErrorMessage(error, actionLabel),
      );
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
                      <Badge
                        className={statusBadgeClass(issue.status, Boolean(issue.archivedAt))}
                        variant={statusVariant(issue.status, Boolean(issue.archivedAt))}
                      >
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
