import { useLocation, useNavigate } from '@tanstack/react-router';
import type { Me, WorkspaceContext } from '@windops/contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiRequestError,
  type AuthStatus,
  authPost,
  getAuthStatus,
  getMe,
  getWorkspaceContext,
} from '../lib/auth-api';
import { hasPendingInvitation } from '../lib/invitation-token';
import {
  blockRevokedWorkspace,
  disconnectLocalAccount,
  isLocalAccountDisconnected,
  readLocalAccess,
  rememberLocalAccess,
  subscribeToLocalDisconnect,
} from '../offline/local-access';

export type AuthSnapshot =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'pending'; expiresAt: string }
  | { status: 'authenticated'; me: Me; context: WorkspaceContext }
  | { status: 'offline'; accountId: string; workspaceId: string; reason: 'network' | 'expired' }
  | { status: 'revoked'; accountId: string; workspaceId: string }
  | { status: 'orphan'; me: Me }
  | { status: 'error'; message: string };

type AuthContextValue = {
  snapshot: AuthSnapshot;
  refreshing: boolean;
  refresh: () => Promise<AuthSnapshot>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const publicOnlyRoutes = new Set([
  '/',
  '/entrar',
  '/cadastro',
  '/verificar-email',
  '/confirmar-acesso',
  '/recuperar-senha',
]);
const invitationAuthRoutes = new Set([
  '/entrar',
  '/cadastro',
  '/verificar-email',
  '/confirmar-acesso',
  '/recuperar-senha',
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const snapshotRef = useRef<AuthSnapshot>({ status: 'loading' });
  const refreshingRef = useRef(false);
  const refreshSequence = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(async (): Promise<AuthSnapshot> => {
    const requestId = ++refreshSequence.current;
    refreshingRef.current = true;
    setRefreshing(true);
    const publish = (next: AuthSnapshot) => {
      if (requestId !== refreshSequence.current) return snapshotRef.current;
      snapshotRef.current = next;
      setSnapshot(next);
      return next;
    };
    const localHint = () => {
      try {
        return readLocalAccess();
      } catch {
        return null;
      }
    };
    const publishOffline = (reason: 'network' | 'expired') => {
      const hint = localHint();
      return hint ? publish({ status: 'offline', ...hint, reason }) : null;
    };
    // Keep the current screen visible while checking an already-known session.
    // Only the first check needs the full-page loading fallback.
    if (snapshotRef.current.status === 'loading') publish({ status: 'loading' });
    try {
      let authStatus: AuthStatus;
      try {
        authStatus = await getAuthStatus();
      } catch (error) {
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 404)) {
          return publishOffline('expired') ?? publish({ status: 'anonymous' });
        }
        throw error;
      }

      if (authStatus.status === 'anonymous') {
        return publishOffline('expired') ?? publish({ status: 'anonymous' });
      }
      if (authStatus.status === 'pending_email_second_step') {
        const pending: AuthSnapshot = { status: 'pending', expiresAt: authStatus.expiresAt };
        return publish(pending);
      }

      let me: Me;
      try {
        me = await getMe();
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          return publishOffline('expired') ?? publish({ status: 'anonymous' });
        }
        throw error;
      }
      if (isLocalAccountDisconnected(me.user.id)) {
        return publish({ status: 'anonymous' });
      }
      if (me.workspaces.length === 0) {
        const orphan: AuthSnapshot = { status: 'orphan', me };
        return publish(orphan);
      }
      if (me.workspaces.length > 1) {
        throw new Error('Sua conta possui mais de um workspace, configuração ainda não suportada.');
      }

      const workspace = me.workspaces[0];
      if (!workspace) throw new Error('Não foi possível carregar seu workspace.');
      let context: WorkspaceContext;
      try {
        context = await getWorkspaceContext(workspace.id);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          return publishOffline('expired') ?? publish({ status: 'anonymous' });
        }
        if (error instanceof ApiRequestError && error.status === 403) {
          const hint = localHint();
          if (hint?.accountId === me.user.id && hint.workspaceId === workspace.id) {
            const blocked = blockRevokedWorkspace(me.user.id);
            if (blocked)
              return publish({
                status: 'revoked',
                accountId: blocked.accountId,
                workspaceId: blocked.workspaceId,
              });
          }
          const latestMe = await getMe();
          if (latestMe.workspaces.length === 0) {
            const hint = localHint();
            if (hint?.accountId === me.user.id && hint.workspaceId === workspace.id) {
              return publish({
                status: 'revoked',
                accountId: hint.accountId,
                workspaceId: hint.workspaceId,
              });
            }
            const orphan: AuthSnapshot = { status: 'orphan', me: latestMe };
            return publish(orphan);
          }
        }
        throw error;
      }
      rememberLocalAccess({
        accountId: me.user.id,
        workspaceId: workspace.id,
        validatedAt: new Date().toISOString(),
      });
      const authenticated: AuthSnapshot = { status: 'authenticated', me, context };
      return publish(authenticated);
    } catch (error) {
      const offline = publishOffline('network');
      if (offline) return offline;
      const failure: AuthSnapshot = {
        status: 'error',
        message:
          error instanceof Error &&
          (error.message.startsWith('Não foi possível conectar') ||
            error.message.startsWith('Sua conta possui mais de um workspace'))
            ? error.message
            : 'Não foi possível conferir sua sessão. Tente novamente.',
      };
      return publish(failure);
    } finally {
      if (requestId === refreshSequence.current) {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    }
  }, []);

  // Recheck authorization on every route transition, including revisits after an external auth callback.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The pathname intentionally triggers a fresh server check.
  useEffect(() => {
    void refresh();
  }, [location.pathname, refresh]);

  useEffect(
    () =>
      subscribeToLocalDisconnect((accountId, revoked) => {
        refreshSequence.current += 1;
        refreshingRef.current = false;
        setRefreshing(false);
        const current = snapshotRef.current;
        if (!revoked) {
          snapshotRef.current = { status: 'anonymous' };
          setSnapshot(snapshotRef.current);
        } else if (current.status === 'authenticated' && accountId === current.me.user.id) {
          snapshotRef.current = {
            status: 'revoked',
            accountId: current.me.user.id,
            workspaceId: current.context.workspace.id,
          };
          setSnapshot(snapshotRef.current);
        } else if (current.status === 'offline' && accountId === current.accountId) {
          snapshotRef.current = {
            status: 'revoked',
            accountId: current.accountId,
            workspaceId: current.workspaceId,
          };
          setSnapshot(snapshotRef.current);
        }
      }),
    [],
  );

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (
      refreshingRef.current ||
      refreshing ||
      snapshot.status === 'loading' ||
      snapshot.status === 'error'
    )
      return;
    const path = location.pathname;
    const isProtected =
      path === '/app' ||
      path === '/historico' ||
      path === '/conta' ||
      path.startsWith('/chamados/') ||
      path === '/parques' ||
      path === '/sem-workspace' ||
      path === '/equipe';

    if (
      hasPendingInvitation() &&
      (snapshot.status === 'authenticated' || snapshot.status === 'orphan') &&
      path !== '/convite/aceitar' &&
      path !== '/invite/accept' &&
      !invitationAuthRoutes.has(path)
    ) {
      void navigate({ to: '/convite/aceitar', replace: true });
    } else if (snapshot.status === 'pending' && path !== '/confirmar-acesso') {
      void navigate({ to: '/confirmar-acesso', replace: true });
    } else if (
      snapshot.status === 'authenticated' &&
      (publicOnlyRoutes.has(path) || path === '/sem-workspace')
    ) {
      void navigate({ to: '/app', replace: true });
    } else if (
      snapshot.status === 'orphan' &&
      path !== '/' &&
      path !== '/sem-workspace' &&
      path !== '/convite/aceitar' &&
      path !== '/invite/accept' &&
      path !== '/redefinir-senha'
    ) {
      void navigate({ to: '/sem-workspace', replace: true });
    } else if (snapshot.status === 'anonymous' && isProtected) {
      void navigate({ to: '/entrar', replace: true });
    } else if (
      snapshot.status === 'authenticated' &&
      path === '/equipe' &&
      snapshot.context.role !== 'admin'
    ) {
      void navigate({ to: '/app', replace: true });
    }
  }, [location.pathname, navigate, refreshing, snapshot]);

  const signOut = useCallback(async () => {
    const current = snapshotRef.current;
    const offline = current.status === 'offline' || current.status === 'revoked';
    const accountId =
      current.status === 'authenticated'
        ? current.me.user.id
        : offline
          ? current.accountId
          : undefined;
    disconnectLocalAccount(undefined, accountId);
    refreshSequence.current += 1;
    refreshingRef.current = false;
    setRefreshing(false);
    snapshotRef.current = { status: 'anonymous' };
    setSnapshot(snapshotRef.current);
    await navigate({ to: '/', replace: true });
    // A known-offline logout is local by definition; there is no server to revoke it.
    if (offline) return;
    try {
      await authPost('/api/auth/sign-out');
    } catch (error) {
      if (
        !(error instanceof ApiRequestError && (error.status === 401 || error.status === 404)) &&
        !(error instanceof Error && error.message.startsWith('Não foi possível conectar'))
      ) {
        throw error;
      }
    }
  }, [navigate]);

  const value = useMemo(
    () => ({ snapshot, refreshing, refresh, signOut }),
    [snapshot, refreshing, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
