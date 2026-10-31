import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  RouterProvider,
} from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { AppRoot, SessionCheckFallback } from './app-root';
import { AuthProvider } from './auth/auth-context';
import { OfflineWorkspaceProvider } from './offline/offline-workspace-context';
import './styles.css';
import { ThemeProvider } from './theme/theme-context';

function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineWorkspaceProvider>
          <AppRoot />
        </OfflineWorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });
const accessPages = () => import('./pages/access-pages');
const workspacePages = () => import('./pages/workspace-pages');
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(accessPages, 'LandingPage'),
});
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  component: lazyRouteComponent(accessPages, 'SignInPage'),
});
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  component: lazyRouteComponent(accessPages, 'SignUpPage'),
});
const signupConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/confirmar',
  component: lazyRouteComponent(accessPages, 'SignupConfirmPage'),
});
const signupProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro/perfil',
  component: lazyRouteComponent(accessPages, 'GoogleSignupProfilePage'),
});
const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verificar-email',
  component: lazyRouteComponent(accessPages, 'VerifyEmailPage'),
});
const secondStepRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmar-acesso',
  component: lazyRouteComponent(accessPages, 'SecondStepPage'),
});
const recoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recuperar-senha',
  component: lazyRouteComponent(accessPages, 'RecoverPasswordPage'),
});
const resetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/redefinir-senha',
  component: lazyRouteComponent(accessPages, 'ResetPasswordPage'),
});
const noWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sem-workspace',
  component: lazyRouteComponent(workspacePages, 'NoWorkspacePage'),
});
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: lazyRouteComponent(
    () => import('./features/issues/issue-list-pages'),
    'WorkspaceHomePage',
  ),
});
const issueDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chamados/$issueId',
  component: lazyRouteComponent(
    () => import('./features/issues/issue-detail-page'),
    'IssueDetailPage',
  ),
});
const issueHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/historico',
  component: lazyRouteComponent(
    () => import('./features/issues/issue-history-page'),
    'IssueHistoryPage',
  ),
});
const archivedIssuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/arquivados',
  component: lazyRouteComponent(
    () => import('./features/issues/issue-list-pages'),
    'ArchivedIssuesPage',
  ),
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conta',
  component: lazyRouteComponent(
    () => import('./features/issues/account-settings-page'),
    'AccountSettingsPage',
  ),
});
const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/equipe',
  component: lazyRouteComponent(
    () => import('./features/workspaces/team-management-page'),
    'TeamManagementPage',
  ),
});
const parksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parques',
  component: lazyRouteComponent(
    () => import('./features/parks/parks-catalog-page'),
    'ParksCatalogPage',
  ),
});
const invitationAcceptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/convite/aceitar',
  component: lazyRouteComponent(workspacePages, 'InvitationAcceptPage'),
});
// Keep invitations already delivered with the previous URL working until they expire.
const legacyInvitationAcceptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/accept',
  component: lazyRouteComponent(workspacePages, 'InvitationAcceptPage'),
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    signInRoute,
    signUpRoute,
    signupConfirmRoute,
    signupProfileRoute,
    verifyEmailRoute,
    secondStepRoute,
    recoverRoute,
    resetRoute,
    noWorkspaceRoute,
    appRoute,
    issueDetailRoute,
    issueHistoryRoute,
    archivedIssuesRoute,
    accountRoute,
    parksRoute,
    teamRoute,
    invitationAcceptRoute,
    legacyInvitationAcceptRoute,
  ]),
  defaultNotFoundComponent: SessionCheckFallback,
});
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
