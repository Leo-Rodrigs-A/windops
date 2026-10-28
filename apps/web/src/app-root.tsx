import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { useAuth } from './auth/auth-context';
import { Button } from './components/ui/button';
import { Feedback, LoadingState } from './components/ui/feedback';

export function AppRoot() {
  const { snapshot } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const publicPath = new Set([
    '/',
    '/entrar',
    '/cadastro',
    '/verificar-email',
    '/confirmar-acesso',
    '/recuperar-senha',
    '/redefinir-senha',
    '/convite/aceitar',
    '/invite/accept',
  ]).has(path);

  if (publicPath) return <Outlet />;
  if (snapshot.status === 'loading') return <SessionCheckFallback />;
  if (
    snapshot.status === 'anonymous' ||
    snapshot.status === 'error' ||
    snapshot.status === 'pending' ||
    snapshot.status === 'revoked' ||
    (snapshot.status === 'orphan' && path !== '/sem-workspace')
  ) {
    return <AppNotFound />;
  }

  return <Outlet />;
}

export function SessionCheckFallback() {
  const { snapshot } = useAuth();
  if (snapshot.status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <LoadingState label="Conferindo sua sessão…" />
      </main>
    );
  }
  return <AppNotFound />;
}

export function AppNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 px-5">
      <Feedback message="Página não encontrada." tone="error" />
      <Button asChild variant="outline">
        <Link to="/">Ir para a página inicial</Link>
      </Button>
    </main>
  );
}
