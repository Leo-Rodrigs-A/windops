import type { Issue, Park, Turbine } from '@windops/contracts';
import { Archive, Check, ClipboardList, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import { WorkspaceSidebarLayout } from '../../components/ui/workspace-sidebar';
import { ApiRequestError } from '../../lib/auth-api';
import { getIssues, lifecycleIssue } from '../../lib/issues-api';
import { getPark, getParks, getParkTurbines, getTurbine } from '../../lib/workspace-api';
import { selectIssueProjection } from '../../offline/issue-query';
import type { LocalIssueStore } from '../../offline/local-issue-store';
import { useOfflineWorkspace } from '../../offline/offline-workspace-context';
import { AppPageHeader, IssueListItem, IssueLocationFilters } from './components';
import {
  compareIssuesByRecency,
  type IssueListEntry,
  issueErrorMessage,
  issueListEntry,
  localIssueListEntries,
  localLocations,
  pendingLocalEntries,
  reconcileVisibleIssuesFromJournal,
  type StatusFilter,
} from './model';

const navigation = workspaceNavigationItems;

export function WorkspaceHomePage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [queryParkId, setQueryParkId] = useState('');
  const [queryTurbineId, setQueryTurbineId] = useState('');
  const queryGeneration = useRef(0);
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
      const generation = queryGeneration.current;
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
        const commands = offlineWorkspace.store.listPendingCommands();
        const local = offlineWorkspace.store.listIssues().flatMap((projection) => {
          const selected = selectIssueProjection(
            projection,
            commands.filter((command) => command.issueId === projection.id),
            {
              status: statusFilter === 'all' ? 'active' : statusFilter,
              ...(queryParkId ? { parkId: queryParkId } : {}),
              ...(queryTurbineId ? { turbineId: queryTurbineId } : {}),
            },
          );
          return selected
            ? localIssueListEntries(offlineWorkspace.store as LocalIssueStore, statusFilter).filter(
                (item) => item.id === projection.id,
              )
            : [];
        });
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
          ...(queryParkId ? { parkId: queryParkId } : {}),
          ...(queryTurbineId ? { turbineId: queryTurbineId } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (generation !== queryGeneration.current) return;
        if (offlineWorkspace.store) {
          await offlineWorkspace.store.recordServerIssuePage(page.items);
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
        if (generation !== queryGeneration.current) return;
        if (cursor && error instanceof ApiRequestError && error.code === 'INVALID_CURSOR') {
          setIssueNotice('A página mudou no servidor. Atualizando a lista desde o início.');
          setIssueCursor(null);
          void loadIssues();
          return;
        }
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
      queryParkId,
      queryTurbineId,
      workspaceId,
    ],
  );

  useEffect(() => {
    queryGeneration.current += 1;
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
              <IssueLocationFilters
                workspaceId={workspaceId}
                store={offlineWorkspace.store ?? undefined}
                online={offlineWorkspace.online && snapshot.status === 'authenticated'}
                parkId={queryParkId}
                turbineId={queryTurbineId}
                onParkChange={(value) => {
                  setQueryParkId(value);
                  setQueryTurbineId('');
                }}
                onTurbineChange={setQueryTurbineId}
              />
              <p className="text-xs text-muted-foreground">
                A pesquisa filtra somente os chamados carregados.
              </p>
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

export function ArchivedIssuesPage() {
  const { snapshot } = useAuth();
  const offline = useOfflineWorkspace();
  const workspaceId = offline.workspaceId ?? '';
  const [issues, setIssues] = useState<Issue[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [queryParkId, setQueryParkId] = useState('');
  const [queryTurbineId, setQueryTurbineId] = useState('');
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState<Issue | null>(null);
  const reactivateTrigger = useRef<HTMLButtonElement | null>(null);
  const reactivateCommands = useRef<Record<string, string>>({});
  const isAdmin =
    snapshot.status === 'authenticated' && snapshot.context.role === 'admin' && offline.online;
  const load = useCallback(
    async (next?: string, append = false) => {
      const requestGeneration = generation.current;
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
          ...(queryParkId ? { parkId: queryParkId } : {}),
          ...(queryTurbineId ? { turbineId: queryTurbineId } : {}),
          ...(next ? { cursor: next } : {}),
        });
        if (requestGeneration !== generation.current) return;
        setIssues((previous) => {
          const merged = new Map((append ? previous : []).map((item) => [item.id, item]));
          for (const item of page.items) merged.set(item.id, item);
          return [...merged.values()].sort(
            (a, b) =>
              (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '') || b.id.localeCompare(a.id),
          );
        });
        setCursor(page.nextCursor);
      } catch (cause) {
        if (next && cause instanceof ApiRequestError && cause.code === 'INVALID_CURSOR') {
          setCursor(null);
          setNotice('A página mudou no servidor. Atualizando a lista desde o início.');
          void load();
          return;
        }
        setError(issueErrorMessage(cause, 'carregar os chamados arquivados'));
      } finally {
        setLoading(false);
      }
    },
    [offline.online, snapshot.status, workspaceId, queryParkId, queryTurbineId],
  );
  useEffect(() => {
    generation.current += 1;
    setIssues([]);
    setCursor(null);
    void load();
  }, [load]);
  const visible = issues.filter(
    (item) =>
      item.text.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')) ||
      `parque ${item.parkId}`.toLowerCase().includes(search.trim().toLowerCase()) ||
      `turbina ${item.turbineId}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  function closeReactivateDialog(focusSearch = false) {
    setReactivateTarget(null);
    window.requestAnimationFrame(() => {
      if (!focusSearch && reactivateTrigger.current?.isConnected) {
        reactivateTrigger.current.focus();
      } else {
        document.getElementById('archived-search')?.focus();
      }
    });
  }
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
              <IssueLocationFilters
                workspaceId={workspaceId}
                online={offline.online && snapshot.status === 'authenticated'}
                parkId={queryParkId}
                turbineId={queryTurbineId}
                onParkChange={(value) => {
                  setQueryParkId(value);
                  setQueryTurbineId('');
                }}
                onTurbineChange={setQueryTurbineId}
              />
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
                            onClick={(event) => {
                              reactivateTrigger.current = event.currentTarget;
                              setReactivateTarget(issue);
                            }}
                          >
                            {busyId === issue.id ? 'Reativando…' : 'Reativar'}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              <p className="px-4 py-2 text-xs text-muted-foreground">
                A pesquisa filtra somente os chamados carregados.
              </p>
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
          if (!open && !busyId) closeReactivateDialog();
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
              onClick={() => closeReactivateDialog()}
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
                    if (succeeded) closeReactivateDialog(true);
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
