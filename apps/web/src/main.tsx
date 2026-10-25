import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { Wind } from 'lucide-react';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/ui/button';
import { getHealth } from './lib/api';
import './styles.css';

function Landing() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      await getHealth();
      setStatus('API disponível.');
    } catch {
      setStatus('API indisponível. Verifique o servidor local.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-7 px-6 py-16">
      <div className="flex items-center gap-3 text-primary">
        <Wind aria-hidden="true" size={32} />
        <span className="text-lg font-semibold">Wind Ops</span>
      </div>
      <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        O registro começa no campo.
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Um projeto para registrar problemas nos elevadores de torres eólicas e acompanhar o
        atendimento da equipe, mesmo em locais sem conexão.
      </p>
      <div className="rounded-xl border border-border p-5">
        <h2 className="font-medium">Projeto em construção</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta é a base inicial. Login, chamados e operação offline serão disponibilizados nas
          próximas etapas.
        </p>
      </div>
      <div>
        <Button onClick={check} disabled={busy}>
          {busy ? 'Verificando…' : 'Verificar conexão com a API'}
        </Button>
        <p role="status" className="mt-3 min-h-6 text-sm text-muted-foreground">
          {status}
        </p>
      </div>
    </main>
  );
}
const rootRoute = createRootRoute({ component: Outlet });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing });
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
