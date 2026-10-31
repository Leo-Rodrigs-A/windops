import { Link, useNavigate } from '@tanstack/react-router';
import { Check, CircleHelp, House, ShieldCheck, Trees, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { TowerMark } from '../components/brand/tower-mark';
import { SignOutButton } from '../components/sign-out-button';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Feedback, LoadingState } from '../components/ui/feedback';
import { HomeNavigation } from '../components/ui/home-navigation';
import {
  type WorkspaceNavigationItem,
  WorkspaceSidebarLayout,
} from '../components/ui/workspace-sidebar';
import { WorkspaceSystemActions } from '../components/workspace-system-actions';
import { ApiRequestError } from '../lib/auth-api';
import {
  captureInvitationToken,
  clearPendingInvitation,
  getPendingInvitationToken,
} from '../lib/invitation-token';
import { acceptWorkspaceInvitation } from '../lib/workspace-api';

const homeNavigation: WorkspaceNavigationItem[] = [
  { href: '/app', label: 'Visão geral', icon: House },
  { href: '/parques', label: 'Parques', icon: Trees },
];

export function WorkspaceHomePage() {
  const { snapshot } = useAuth();
  const navigation =
    snapshot.status === 'authenticated' && snapshot.context.role === 'admin'
      ? [...homeNavigation, { href: '/equipe' as const, label: 'Equipe', icon: UsersRound }]
      : homeNavigation;
  if (snapshot.status !== 'authenticated') {
    return (
      <main className="grid min-h-dvh place-items-center text-muted-foreground">
        Carregando workspace…
      </main>
    );
  }

  const { me, context } = snapshot;
  const roleLabel = context.role === 'admin' ? 'Administrador' : 'Técnico';
  const email = me.user.email;
  return (
    <>
      <div className="hidden min-h-dvh md:block">
        <WorkspaceSidebarLayout
          activeHref="/app"
          items={navigation}
          workspaceName={context.workspace.name}
        >
          <main className="min-h-dvh bg-background px-6 py-7 text-foreground lg:px-10 lg:py-9">
            <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-sm text-muted-foreground">
                  {context.workspace.name} / Visão geral
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo ao Wind Ops</h1>
                <p className="mt-2 text-muted-foreground">
                  A base de acesso da sua operação está pronta.
                </p>
              </div>
              <WorkspaceSystemActions />
            </header>
            <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <Card className="border-blue-400/10 bg-[radial-gradient(ellipse_at_85%_10%,rgb(37_99_235_/_0.14),transparent_42%),var(--card)]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-brand">
                      <TowerMark className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <CardTitle>Operação em preparação</CardTitle>
                      <CardDescription>
                        Esta etapa organiza a identidade e o acesso do workspace.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Os recursos para registrar e acompanhar chamados serão conectados nas próximas
                    etapas. Esta tela não representa uma consulta vazia nem dados de exemplo.
                  </p>
                  <div
                    aria-hidden="true"
                    className="h-2 max-w-xl overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-300" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sua sessão</CardTitle>
                  <CardDescription>Identidade e permissão confirmadas pela API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Conta</p>
                    <p className="break-all font-medium">{email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Workspace</p>
                    <p className="font-medium">{context.workspace.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck aria-hidden="true" className="size-4 text-brand" />
                    {roleLabel}
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </WorkspaceSidebarLayout>
      </div>

      <div className="pb-[67px] md:hidden">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 bg-background px-5 py-6 text-foreground">
          <header className="flex items-center justify-between gap-3">
            <Link
              aria-label="Wind Ops, início"
              className="inline-flex min-w-0 items-center gap-2"
              to="/app"
            >
              <TowerMark className="size-5 shrink-0" />
              <span className="truncate font-semibold">{context.workspace.name}</span>
            </Link>
            <WorkspaceSystemActions />
          </header>
          <section>
            <p className="text-sm text-muted-foreground">Visão geral</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bem-vindo ao Wind Ops</h1>
          </section>
          <Card className="border-blue-400/10 bg-[radial-gradient(ellipse_at_85%_10%,rgb(37_99_235_/_0.14),transparent_42%),var(--card)]">
            <CardHeader>
              <CardTitle className="text-lg">Operação em preparação</CardTitle>
              <CardDescription>
                Esta etapa organiza a identidade e o acesso do workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Os recursos para registrar e acompanhar chamados serão conectados nas próximas
                etapas. Não há dados operacionais de exemplo nesta tela.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sua sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Conta</p>
                <p className="break-all font-medium">{email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Permissão</p>
                <p className="font-medium">{roleLabel}</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <HomeNavigation activeHref="/app" className="fixed inset-x-0 bottom-0" items={navigation} />
      </div>
    </>
  );
}

export function NoWorkspacePage() {
  const { snapshot } = useAuth();
  const userEmail = snapshot.status === 'orphan' ? snapshot.me.user.email : '';
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgb(21_93_252_/_0.16),transparent_45%)]"
      />
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <span className="grid size-11 place-items-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-brand">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <CardTitle className="text-2xl">Sua conta ainda não está vinculada</CardTitle>
          <CardDescription className="leading-relaxed">
            A autenticação foi concluída, mas esta conta não possui membership ativa em um workspace
            Wind Ops.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Feedback
            message="Peça ao administrador da sua organização para conferir o vínculo da sua conta."
            tone="info"
          />
          {userEmail && (
            <p className="break-all text-sm text-muted-foreground">Conta: {userEmail}</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="flex-1" variant="outline">
              <Link to="/">Voltar para a home</Link>
            </Button>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function InvitationAcceptPage() {
  const { snapshot, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState(getPendingInvitationToken);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const captured = captureInvitationToken();
    if (captured.error) setTokenError(captured.error);
    if (captured.token) setToken(captured.token);
    setTokenLoaded(true);
  }, []);

  async function accept() {
    if (!token) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await acceptWorkspaceInvitation(token);
      clearPendingInvitation();
      const next = await refresh();
      if (next.status === 'authenticated') {
        await navigate({ to: '/app', replace: true });
      } else {
        setNotice('Convite aceito. Atualize sua sessão para abrir o workspace.');
      }
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 422) {
        setError(
          'Este convite foi enviado para outro e-mail. Saia e entre com a conta convidada; o convite continua válido.',
        );
      } else if (
        cause instanceof ApiRequestError &&
        cause.status === 403 &&
        cause.code === 'EMAIL_NOT_VERIFIED'
      ) {
        setError('Confirme o e-mail desta conta antes de aceitar o convite.');
      } else if (cause instanceof ApiRequestError && cause.status === 429) {
        setError('Muitas tentativas. Aguarde um pouco e tente novamente.');
      } else if (cause instanceof ApiRequestError && cause.status === 401) {
        await refresh();
        setError('Sua sessão terminou. Entre novamente e abra o convite recebido.');
      } else if (cause instanceof ApiRequestError && [404, 409, 410].includes(cause.status)) {
        clearPendingInvitation();
        setToken('');
        setError('Este convite não está mais disponível. Peça ao administrador que envie um novo.');
      } else {
        setError('Não foi possível aceitar o convite. Confira a conexão e tente novamente.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    await signOut();
    await navigate({ to: '/convite/aceitar', replace: true });
  }

  const signedInUser =
    snapshot.status === 'authenticated' || snapshot.status === 'orphan' ? snapshot.me.user : null;

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-background px-5 py-10 text-foreground sm:px-6">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgb(21_93_252_/_0.16),transparent_45%)]"
      />
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-4">
          <span className="grid size-11 place-items-center rounded-xl border border-success/30 bg-success-subtle text-success">
            <Check aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Wind Ops / Equipe</p>
            <CardTitle className="mt-2 text-2xl">Aceitar convite</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">
              Entre com o endereço que recebeu o convite. A confirmação por e-mail da sessão
              continua obrigatória.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {snapshot.status === 'loading' && <LoadingState label="Conferindo sua sessão…" />}
          {!tokenLoaded && <LoadingState label="Lendo o convite…" />}
          {snapshot.status === 'pending' && (
            <Feedback
              message="Conclua o código de segurança enviado ao seu e-mail para continuar."
              tone="info"
            />
          )}
          {snapshot.status === 'error' && (
            <div className="space-y-3">
              <Feedback message={snapshot.message} tone="error" />
              <Button className="w-full" onClick={() => void refresh()} variant="outline">
                Tentar novamente
              </Button>
            </div>
          )}
          {signedInUser && (
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-muted-foreground">Conta conectada</p>
              <p className="mt-1 break-all text-sm font-medium">{signedInUser.email}</p>
            </div>
          )}
          {tokenError && <Feedback message={tokenError} tone="error" />}
          {error && <Feedback message={error} tone="error" />}
          {notice && <Feedback message={notice} tone="success" />}
          {!tokenError && token && signedInUser ? (
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={busy || snapshot.status === 'pending'}
                onClick={() => void accept()}
              >
                {busy ? 'Aceitando convite…' : 'Aceitar e abrir workspace'}
              </Button>
              {error.includes('outro e-mail') && (
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => void switchAccount()}
                  variant="outline"
                >
                  Sair e trocar de conta
                </Button>
              )}
            </div>
          ) : !tokenError && token && snapshot.status === 'anonymous' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link to="/entrar">Entrar</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cadastro">Criar conta</Link>
              </Button>
            </div>
          ) : !token && tokenLoaded ? (
            <div className="space-y-4">
              <Feedback
                message="Não encontramos um token de convite nesta aba. Abra novamente o link recebido por e-mail."
                tone="warning"
              />
              <Button asChild variant="outline">
                <Link to="/entrar">Ir para entrar</Link>
              </Button>
            </div>
          ) : null}
          <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />O link é removido da
            barra de endereço após a leitura. Se o e-mail conectado não corresponder, você pode sair
            e trocar de conta sem consumir o convite.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
