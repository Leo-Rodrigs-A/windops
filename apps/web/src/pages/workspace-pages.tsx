import { Link } from '@tanstack/react-router';
import { House, ShieldCheck, Wind } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { SignOutButton } from '../components/sign-out-button';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Feedback } from '../components/ui/feedback';
import { HomeNavigation } from '../components/ui/home-navigation';
import { WorkspaceSidebarLayout } from '../components/ui/workspace-sidebar';

const homeNavigation: { href: '/app'; label: string; icon: typeof House }[] = [
  { href: '/app', label: 'Visão geral', icon: House },
];

export function WorkspaceHomePage() {
  const { snapshot } = useAuth();
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
          items={homeNavigation}
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
              <SignOutButton />
            </header>
            <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <Card className="border-blue-400/15 bg-[radial-gradient(ellipse_at_85%_10%,rgb(37_99_235_/_0.14),transparent_42%),var(--card)]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                      <Wind aria-hidden="true" className="size-5" />
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
                    <ShieldCheck aria-hidden="true" className="size-4 text-blue-300" />
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
              <Wind aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="truncate font-semibold">{context.workspace.name}</span>
            </Link>
            <SignOutButton iconOnly />
          </header>
          <section>
            <p className="text-sm text-muted-foreground">Visão geral</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bem-vindo ao Wind Ops</h1>
          </section>
          <Card className="border-blue-400/15 bg-[radial-gradient(ellipse_at_85%_10%,rgb(37_99_235_/_0.14),transparent_42%),var(--card)]">
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
        <HomeNavigation
          activeHref="/app"
          className="fixed inset-x-0 bottom-0"
          items={homeNavigation}
        />
      </div>
    </>
  );
}

export function NoWorkspacePage() {
  const { snapshot } = useAuth();
  const userEmail = snapshot.status === 'orphan' ? snapshot.me.user.email : '';
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgb(21_93_252_/_0.16),transparent_45%)]"
      />
      <Card className="w-full max-w-lg border-border/80">
        <CardHeader className="space-y-4">
          <span className="grid size-11 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
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
