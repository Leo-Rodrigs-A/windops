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
import { AppRoot } from './app-root';
import { AuthProvider } from './auth/auth-context';
import './styles.css';
import { ThemeProvider } from './theme/theme-context';

function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ThemeProvider>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });
const accessPages = () => import('./pages/access-pages');
const workspacePages = () => import('./pages/workspace-pages');
const issuePages = () => import('./pages/issues-pages');
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
  component: lazyRouteComponent(issuePages, 'WorkspaceHomePage'),
});
const issueDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chamados/$issueId',
  component: lazyRouteComponent(issuePages, 'IssueDetailPage'),
});
const issueHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/historico',
  component: lazyRouteComponent(issuePages, 'IssueHistoryPage'),
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/conta',
  component: lazyRouteComponent(issuePages, 'AccountSettingsPage'),
});
const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/equipe',
  component: lazyRouteComponent(workspacePages, 'TeamManagementPage'),
});
const parksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parques',
  component: lazyRouteComponent(() => import('./pages/parks-page'), 'ParksCatalogPage'),
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
    verifyEmailRoute,
    secondStepRoute,
    recoverRoute,
    resetRoute,
    noWorkspaceRoute,
    appRoute,
    issueDetailRoute,
    issueHistoryRoute,
    accountRoute,
    parksRoute,
    teamRoute,
    invitationAcceptRoute,
    legacyInvitationAcceptRoute,
  ]),
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
