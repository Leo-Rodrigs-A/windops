import { Outlet, useLocation } from '@tanstack/react-router';
import { useAuth } from './auth/auth-context';
import { Button } from './components/ui/button';
import { Feedback, LoadingState } from './components/ui/feedback';

export function AppRoot() {
  const { snapshot, refresh } = useAuth();
  const location = useLocation();
  const protectedPath =
    location.pathname === '/app' ||
    location.pathname === '/historico' ||
    location.pathname === '/conta' ||
    location.pathname.startsWith('/chamados/') ||
    location.pathname === '/parques' ||
    location.pathname === '/sem-workspace' ||
    location.pathname === '/equipe';

  if (protectedPath && snapshot.status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <LoadingState label="Conferindo sua sessão…" />
      </main>
    );
  }
  if (protectedPath && snapshot.status === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5">
        <Feedback
          message="O servidor não confirmou seu acesso. Nenhum dado operacional foi carregado."
          tone="error"
        />
        <Button onClick={() => void refresh()}>Tentar novamente</Button>
      </main>
    );
  }
  return <Outlet />;
}
