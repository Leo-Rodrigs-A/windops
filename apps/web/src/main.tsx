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

function RootLayout() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
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
  component: lazyRouteComponent(workspacePages, 'WorkspaceHomePage'),
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
