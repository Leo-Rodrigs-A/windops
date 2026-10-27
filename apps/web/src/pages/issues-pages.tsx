import { Link, useParams } from '@tanstack/react-router';
import type { Issue, IssueEvent, IssueStatus, Park, Turbine } from '@windops/contracts';
import {
  ArchiveRestore,
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
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
  createIssue,
  getIssue,
  getIssueEvents,
  getIssues,
  releaseIssue,
  returnIssue,
  startIssue,
  updateIssue,
} from '../lib/issues-api';
import { getPark, getParks, getParkTurbines, getTurbine } from '../lib/workspace-api';

const navigation = workspaceNavigationItems;
type StatusFilter = 'all' | IssueStatus;

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
      return 'Este equipamento foi arquivado e não aceita novos chamados.';
    if (error.code === 'ISSUE_STATE_CONFLICT')
      return 'O estado do chamado mudou. Atualize os dados e tente novamente.';
    if (error.code === 'ISSUE_ACTION_FORBIDDEN')
      return 'Esta ação não está disponível para sua conta neste chamado.';
  }
  if (error instanceof Error && error.message.startsWith('Não foi possível conectar'))
    return `Não foi possível confirmar ${action}. Tente novamente; o retry manterá a chave deste comando.`;
  return `Não foi possível ${action}. Confira a conexão e tente novamente.`;
}

function statusLabel(status: IssueStatus) {
  return status === 'pending' ? 'Pendente' : 'Em andamento';
}

function statusVariant(status: IssueStatus) {
  return status === 'pending' ? 'secondary' : 'default';
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
  const workspaceId = snapshot.status === 'authenticated' ? snapshot.context.workspace.id : '';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueCursor, setIssueCursor] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
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
      try {
        const page = await getIssues(workspaceId, {
          limit: 25,
          ...(statusFilter === 'all' ? {} : { status: statusFilter }),
          ...(cursor ? { cursor } : {}),
        });
        setIssues((previous) => (append ? [...previous, ...page.items] : page.items));
        setIssueCursor(page.nextCursor);
        const locationsToLoad = new Map(
          page.items.map((issue) => [`${issue.parkId}:${issue.turbineId}`, issue] as const),
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
        setLocations((current) => ({ ...current, ...Object.fromEntries(pairs.flat()) }));
      } catch (error) {
        setIssueError(issueErrorMessage(error, 'carregar os chamados'));
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        setIssueLoading(false);
        setMoreLoading(false);
      }
    },
    [refresh, statusFilter, workspaceId],
  );

  useEffect(() => {
    setIssues([]);
    setIssueCursor(null);
    void loadIssues();
  }, [loadIssues]);

  async function openCreate() {
    setCreateOpen(true);
    setCreateError('');
    setCatalogLoading(true);
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
      setCreateError(issueErrorMessage(error, 'carregar os equipamentos disponíveis'));
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
        if (active) setCreateError(issueErrorMessage(error, 'carregar as turbinas'));
      } finally {
        if (active) setCatalogLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [createOpen, parkId, workspaceId]);

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
      await createIssue(workspaceId, {
        ...createCommand.current,
        parkId,
        turbineId,
        text: draftText,
      });
      setDraftText('');
      createCommand.current = null;
      setCreateOpen(false);
      setStatusFilter('all');
      if (statusFilter === 'all') await loadIssues();
    } catch (error) {
      setCreateError(issueErrorMessage(error, 'registrar o chamado'));
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
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

  if (snapshot.status !== 'authenticated') return <LoadingState label="Carregando workspace…" />;

  return (
    <WorkspaceSidebarLayout
      activeHref="/app"
      items={navigation}
      workspaceName={snapshot.context.workspace.name}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${snapshot.context.workspace.name} / Chamados`}
            title="Home"
            subtitle="Chamados pendentes e em andamento. Os mais antigos aparecem primeiro."
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
                <Button className="w-full sm:w-auto" onClick={() => void openCreate()}>
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
                      {search ? 'Nenhum chamado encontrado' : 'Nenhum chamado nesta lista'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? 'Tente outro termo ou limpe a pesquisa.'
                        : 'Os chamados registrados neste workspace aparecerão aqui. Ainda não há dados de exemplo.'}
                    </p>
                    {!search && (
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
}: {
  issue: Issue;
  location: { park: string; turbine: string } | undefined;
}) {
  return (
    <li>
      <Link
        className="flex min-h-24 items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        params={{ issueId: issue.id }}
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
                : 'Localizando equipamento…'}
            </span>
            <Badge variant={statusVariant(issue.status)}>{statusLabel(issue.status)}</Badge>
          </span>
          <span className="line-clamp-2 block whitespace-pre-wrap text-sm text-muted-foreground">
            {issue.text}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{issue.creator.name}</span>
            <time dateTime={issue.createdAt}>{formatDate(issue.createdAt)}</time>
            {issue.handler && <span>Atendimento: {issue.handler.name}</span>}
          </span>
        </span>
      </Link>
    </li>
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
          {(textChanged || locationChanged || statusChanged || handlerChanged) && (
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IssueDetailPage() {
  const { snapshot, refresh } = useAuth();
  const params = useParams({ strict: false });
  const issueId = 'issueId' in params ? String(params.issueId) : '';
  const workspaceId = snapshot.status === 'authenticated' ? snapshot.context.workspace.id : '';
  const [issue, setIssue] = useState<Issue | null>(null);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [location, setLocation] = useState<{ park: Park; turbine: Turbine } | null>(null);
  const [eventLocations, setEventLocations] = useState<Record<string, string>>({});
  const actionCommands = useRef<Record<string, string>>({});
  const editCommand = useRef<string | null>(null);

  const hydrateEventLocations = useCallback(
    async (items: IssueEvent[]) => {
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
    [workspaceId],
  );

  const loadDetail = useCallback(async () => {
    if (!workspaceId || !issueId) return;
    setDetailLoading(true);
    setDetailError('');
    setIssue(null);
    setEvents([]);
    setLocation(null);
    try {
      const [item, history] = await Promise.all([
        getIssue(workspaceId, issueId),
        getIssueEvents(workspaceId, issueId, { limit: 25 }),
      ]);
      setIssue(item);
      setEvents(history.items);
      setEventCursor(history.nextCursor);
      await hydrateEventLocations(history.items);
      const [park, turbine] = await Promise.all([
        getPark(workspaceId, item.parkId),
        getTurbine(workspaceId, item.parkId, item.turbineId),
      ]);
      setLocation({ park, turbine });
    } catch (error) {
      setDetailError(issueErrorMessage(error, 'carregar o chamado'));
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
    } finally {
      setDetailLoading(false);
    }
  }, [hydrateEventLocations, issueId, refresh, workspaceId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function runAction(action: 'start' | 'return' | 'release') {
    if (!issue) return;
    let commandId = actionCommands.current[action];
    if (!commandId) {
      commandId = crypto.randomUUID();
      actionCommands.current[action] = commandId;
    }
    setBusyAction(action);
    setDetailError('');
    setNotice('');
    try {
      const command = { commandId, expectedRevision: issue.revision };
      const updated =
        action === 'start'
          ? await startIssue(workspaceId, issue.id, command)
          : action === 'return'
            ? await returnIssue(workspaceId, issue.id, command)
            : await releaseIssue(workspaceId, issue.id, command);
      delete actionCommands.current[action];
      setIssue(updated);
      setNotice(
        action === 'start'
          ? 'Atendimento iniciado.'
          : action === 'return'
            ? 'Chamado devolvido para a fila.'
            : 'Atendimento liberado.',
      );
      const history = await getIssueEvents(workspaceId, issue.id, { limit: 25 });
      setEvents(history.items);
      setEventCursor(history.nextCursor);
      await hydrateEventLocations(history.items);
    } catch (error) {
      setDetailError(issueErrorMessage(error, 'executar esta ação'));
      if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      if (error instanceof ApiRequestError && error.status === 409) {
        delete actionCommands.current[action];
        await loadDetail();
      }
    } finally {
      setBusyAction('');
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue) return;
    editCommand.current ??= crypto.randomUUID();
    setEditBusy(true);
    setEditError('');
    try {
      const updated = await updateIssue(workspaceId, issue.id, {
        commandId: editCommand.current,
        expectedRevision: issue.revision,
        text: editText,
      });
      setIssue(updated);
      editCommand.current = null;
      setEditOpen(false);
      setNotice('Chamado atualizado.');
      const history = await getIssueEvents(workspaceId, issue.id, { limit: 25 });
      setEvents(history.items);
      await hydrateEventLocations(history.items);
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
      setEvents((current) => [...current, ...page.items]);
      setEventCursor(page.nextCursor);
      await hydrateEventLocations(page.items);
    } catch (error) {
      setDetailError(issueErrorMessage(error, 'carregar o histórico'));
    }
  }

  if (snapshot.status !== 'authenticated') return <LoadingState label="Conferindo sua sessão…" />;
  const isAdmin = snapshot.context.role === 'admin';
  const isCreator = issue?.creator.id === snapshot.me.user.id;
  const isHandler = issue?.handler?.id === snapshot.me.user.id;

  return (
    <WorkspaceSidebarLayout
      activeHref="/app"
      items={navigation}
      workspaceName={snapshot.context.workspace.name}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild aria-label="Voltar à Home" size="icon" variant="outline">
              <Link to="/app">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <AppPageHeader
                eyebrow={`${snapshot.context.workspace.name} / Chamados`}
                title="Detalhe do chamado"
              />
            </div>
          </div>
          {notice && <Feedback message={notice} tone="success" />}
          {detailError && <Feedback message={detailError} tone="error" />}
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
                  </div>
                  <CardTitle className="text-base font-normal leading-relaxed whitespace-pre-wrap">
                    {issue.text}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-5 gap-y-1">
                    <span>Registrado por {issue.creator.name}</span>
                    <time dateTime={issue.createdAt}>{formatDate(issue.createdAt)}</time>
                    {issue.handler && <span>Em atendimento por {issue.handler.name}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
                  {issue.status === 'pending' && (
                    <Button disabled={Boolean(busyAction)} onClick={() => void runAction('start')}>
                      {busyAction === 'start' ? 'Iniciando…' : 'Iniciar atendimento'}
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
                      O chamado está em atendimento por {issue.handler?.name ?? 'outro membro'}.
                    </p>
                  )}
                </CardContent>
              </Card>

              <section aria-labelledby="issue-history-title" className="space-y-3">
                <div className="flex items-center gap-2">
                  <History aria-hidden="true" className="size-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold" id="issue-history-title">
                    Histórico de alterações
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
    </WorkspaceSidebarLayout>
  );
}

export function IssueHistoryPage() {
  const { snapshot } = useAuth();
  if (snapshot.status !== 'authenticated') return <LoadingState label="Conferindo sua sessão…" />;
  return (
    <WorkspaceSidebarLayout
      activeHref="/historico"
      items={navigation}
      workspaceName={snapshot.context.workspace.name}
    >
      <main className="min-h-dvh bg-background px-4 pt-5 pb-24 text-foreground sm:px-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <AppPageHeader
            eyebrow={`${snapshot.context.workspace.name} / Auditoria`}
            title="Histórico"
            subtitle="Conferência e recuperação de chamados concluídos."
          />
          <Card>
            <CardHeader>
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-muted">
                <ArchiveRestore aria-hidden="true" className="size-5 text-muted-foreground" />
              </span>
              <CardTitle>Chamados concluídos ainda não estão disponíveis</CardTitle>
              <CardDescription className="max-w-2xl leading-relaxed">
                A API desta etapa registra e mantém o histórico de eventos nos detalhes dos
                chamados, mas ainda não oferece conclusão, reabertura ou recuperação. Esta tela será
                conectada a essas operações quando o lifecycle de issues for implementado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/app">
                  <ClipboardList aria-hidden="true" /> Voltar aos chamados ativos
                </Link>
              </Button>
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
