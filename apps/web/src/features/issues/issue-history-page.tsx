import type { Issue } from '@windops/contracts';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Feedback, LoadingState } from '../../components/ui/feedback';
import { HomeNavigation } from '../../components/ui/home-navigation';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import { WorkspaceSidebarLayout } from '../../components/ui/workspace-sidebar';
import { ApiRequestError } from '../../lib/auth-api';
import { getIssues } from '../../lib/issues-api';
import { selectIssueProjection } from '../../offline/issue-query';
import { useOfflineWorkspace } from '../../offline/offline-workspace-context';
import { AppPageHeader, IssueListItem, IssueLocationFilters } from './components';
import {
  compareCompleted,
  type IssueListEntry,
  issueErrorMessage,
  localLocations,
  locallyCompletedEntries,
} from './model';

const navigation = workspaceNavigationItems;

export function IssueHistoryPage() {
  const { snapshot, refresh } = useAuth();
  const offlineWorkspace = useOfflineWorkspace();
  const workspaceId = offlineWorkspace.workspaceId ?? '';
  const workspaceName = offlineWorkspace.workspaceName ?? 'Workspace';
  const historyLocations = offlineWorkspace.store ? localLocations(offlineWorkspace.store) : {};
  const [completed, setCompleted] = useState<Array<Issue | IssueListEntry>>([]);
  const [queryParkId, setQueryParkId] = useState('');
  const [queryTurbineId, setQueryTurbineId] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [search, setSearch] = useState('');
  const generation = useRef(0);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const loadHistory = useCallback(
    async (next?: string, append = false) => {
      if (!workspaceId || !offlineWorkspace.online || snapshot.status !== 'authenticated') return;
      const requestGeneration = generation.current;
      append ? setMoreLoading(true) : setHistoryLoading(true);
      setHistoryError('');
      try {
        const page = await getIssues(workspaceId, {
          status: 'completed',
          limit: 25,
          ...(queryParkId ? { parkId: queryParkId } : {}),
          ...(queryTurbineId ? { turbineId: queryTurbineId } : {}),
          ...(next ? { cursor: next } : {}),
        });
        const store = offlineWorkspace.store;
        let cacheError = false;
        if (store)
          try {
            await store.recordServerIssuePage(page.items);
            await Promise.all(
              page.items.map((issue) =>
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
        if (requestGeneration !== generation.current) return;
        setCompleted((current) => {
          const merged = new Map((append ? current : []).map((item) => [item.id, item]));
          for (const item of page.items) merged.set(item.id, item);
          if (store) for (const item of locallyCompletedEntries(store)) merged.set(item.id, item);
          return [...merged.values()].sort(compareCompleted);
        });
        setCursor(page.nextCursor);
        if (cacheError)
          setHistoryError(
            'Histórico carregado, mas não foi possível salvar uma cópia neste aparelho.',
          );
      } catch (error) {
        if (requestGeneration !== generation.current) return;
        if (next && error instanceof ApiRequestError && error.code === 'INVALID_CURSOR') {
          setCursor(null);
          setHistoryError('A página mudou no servidor. Atualizando o histórico desde o início.');
          void loadHistory();
          return;
        }
        setCompleted(offlineWorkspace.store ? locallyCompletedEntries(offlineWorkspace.store) : []);
        setHistoryError(
          offlineWorkspace.store?.isReplicaReady()
            ? 'Servidor indisponível; exibindo o histórico salvo neste aparelho.'
            : issueErrorMessage(error, 'carregar os chamados concluídos'),
        );
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        if (requestGeneration === generation.current) {
          setHistoryLoading(false);
          setMoreLoading(false);
        }
      }
    },
    [
      offlineWorkspace.online,
      offlineWorkspace.store,
      queryParkId,
      queryTurbineId,
      refresh,
      snapshot.status,
      workspaceId,
    ],
  );
  useEffect(() => {
    generation.current += 1;
    setCursor(null);
    setCompleted([]);
    void loadHistory();
  }, [loadHistory]);
  useEffect(() => {
    const journalChanged = offlineWorkspace.version >= 0;
    if (!journalChanged) return;
    if (!workspaceId) return;
    if (offlineWorkspace.online && snapshot.status === 'authenticated') {
      const store = offlineWorkspace.store;
      if (store)
        setCompleted((current) => {
          const merged = new Map(
            current
              .filter((item) => {
                const projection = store.getIssue(item.id);
                return (
                  !projection ||
                  selectIssueProjection(
                    projection,
                    store.listPendingCommands().filter((command) => command.issueId === item.id),
                    { status: 'completed' },
                  )
                );
              })
              .map((item) => [item.id, item]),
          );
          for (const item of locallyCompletedEntries(store)) merged.set(item.id, item);
          return [...merged.values()].sort(compareCompleted);
        });
      return;
    }
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
          {historyError && (
            <div className="space-y-2">
              <Feedback message={historyError} tone="error" />
              <Button onClick={() => void loadHistory()} variant="outline">
                <RefreshCw aria-hidden="true" /> Atualizar histórico
              </Button>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Chamados concluídos</CardTitle>
              <CardDescription>Registro para auditoria e conferência.</CardDescription>
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
              <Label htmlFor="history-search">Pesquisar nos chamados carregados</Label>
              <Input
                id="history-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Texto, parque ou turbina"
              />
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <LoadingState label="Carregando chamados concluídos…" />
              ) : completed.filter(
                  (item) =>
                    item.text
                      .toLocaleLowerCase('pt-BR')
                      .includes(search.trim().toLocaleLowerCase('pt-BR')) ||
                    `${historyLocations[`${item.parkId}:${item.turbineId}`]?.park ?? ''} ${historyLocations[`${item.parkId}:${item.turbineId}`]?.turbine ?? ''}`
                      .toLowerCase()
                      .includes(search.trim().toLowerCase()),
                ).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum chamado concluído.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {completed
                    .filter(
                      (item) =>
                        item.text
                          .toLocaleLowerCase('pt-BR')
                          .includes(search.trim().toLocaleLowerCase('pt-BR')) ||
                        `${historyLocations[`${item.parkId}:${item.turbineId}`]?.park ?? ''} ${historyLocations[`${item.parkId}:${item.turbineId}`]?.turbine ?? ''}`
                          .toLowerCase()
                          .includes(search.trim().toLowerCase()),
                    )
                    .map((issue) => (
                      <IssueListItem
                        key={issue.id}
                        issue={issue}
                        location={historyLocations[`${issue.parkId}:${issue.turbineId}`]}
                      />
                    ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                O histórico offline é parcial. A pesquisa filtra somente os itens carregados.
              </p>
              {cursor && (
                <div className="border-t p-3 text-center">
                  <Button
                    disabled={moreLoading}
                    variant="ghost"
                    onClick={() => void loadHistory(cursor, true)}
                  >
                    {moreLoading ? 'Carregando…' : 'Carregar anteriores'}
                  </Button>
                </div>
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
