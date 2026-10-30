import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
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

  if (publicPath)
    return (
      <>
        <Outlet />
        <OfflineUpdateNotice />
      </>
    );
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

  return (
    <>
      <Outlet />
      <OfflineUpdateNotice />
    </>
  );
}

function OfflineUpdateNotice() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [activatedElsewhere, setActivatedElsewhere] = useState(false);
  const applyUpdate = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let active = true;
    const announce = () => {
      if (active && registration?.waiting) setWaiting(registration.waiting);
    };
    void navigator.serviceWorker
      .register('/service-worker.js')
      .then((value) => {
        registration = value;
        announce();
        value.addEventListener('updatefound', () => {
          const installing = value.installing;
          installing?.addEventListener('statechange', announce);
        });
      })
      .catch(() => undefined);
    const onControllerChange = () => {
      if (applyUpdate.current) window.location.reload();
      else {
        setWaiting(null);
        setActivatedElsewhere(true);
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);
  if (!waiting && !activatedElsewhere) return null;
  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-lg">
      <span className="text-sm">
        {activatedElsewhere
          ? 'A atualização já foi ativada em outra aba. Recarregue quando estiver pronto.'
          : 'Uma atualização está pronta. Ela será aplicada ao continuar.'}
      </span>
      <Button
        size="sm"
        onClick={() => {
          if (activatedElsewhere) {
            window.location.reload();
            return;
          }
          if (!waiting) return;
          applyUpdate.current = true;
          waiting.postMessage('SKIP_WAITING');
        }}
      >
        {activatedElsewhere ? 'Recarregar' : 'Atualizar'}
      </Button>
    </aside>
  );
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
