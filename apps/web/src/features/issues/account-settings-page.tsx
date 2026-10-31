import { Link } from '@tanstack/react-router';
import type { Issue, IssueStatus } from '@windops/contracts';
import {
  Clock3,
  LoaderCircle,
  type LucideIcon,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { PushSettings } from '../../components/push-settings';
import { SignOutButton } from '../../components/sign-out-button';
import { ThemeToggle } from '../../components/theme-toggle';
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
import { workspaceNavigationItems } from '../../components/ui/workspace-navigation';
import { WorkspaceSidebarLayout } from '../../components/ui/workspace-sidebar';
import { ApiRequestError } from '../../lib/auth-api';
import { getIssues } from '../../lib/issues-api';
import { useOfflineWorkspace } from '../../offline/offline-workspace-context';
import { AppPageHeader } from './components';
import { issueErrorMessage } from './model';

const navigation = workspaceNavigationItems;

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
            <PushSettings
              key={`${snapshot.accountId}:${snapshot.workspaceId}`}
              workspaceId={snapshot.workspaceId}
            />
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
          <PushSettings
            key={`${me.user.id}:${context.workspace.id}`}
            workspaceId={context.workspace.id}
          />
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
