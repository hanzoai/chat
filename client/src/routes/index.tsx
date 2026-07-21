import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  Login,
  VerifyEmail,
  ApiErrorWatcher,
  TwoFactorScreen,
} from '~/components/Auth';
import OAuthCallback from '~/components/Auth/OAuthCallback';
import { MarketplaceProvider } from '~/components/Agents/MarketplaceContext';
import AgentMarketplace from '~/components/Agents/Marketplace';
import { OAuthSuccess, OAuthError } from '~/components/OAuth';
import { AuthContextProvider } from '~/hooks/AuthContext';
import { AnalyticsProvider } from '~/Providers';
import RouteErrorBoundary from './RouteErrorBoundary';
import BuildRoute from './BuildRoute';
import LoginLayout from './Layouts/Login';
import dashboardRoutes from './Dashboard';
import ShareRoute from './ShareRoute';
import ChatRoute from './ChatRoute';
import Search from './Search';
import Root from './Root';

const AuthLayout = () => (
  <AuthContextProvider>
    <AnalyticsProvider>
      <Outlet />
      <ApiErrorWatcher />
    </AnalyticsProvider>
  </AuthContextProvider>
);

// Landing redirect that PRESERVES the query string, so a cross-surface deep link
// to `/?project=<slug>` reaches `/c/new?project=<slug>` (React Router's plain
// <Navigate> drops the search) — one canonical destination for either entry URL.
const NewChatRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/c/new', search }} replace={true} />;
};

const baseEl = document.querySelector('base');
const baseHref = baseEl?.getAttribute('href') || '/';

export const router = createBrowserRouter(
  [
    {
      path: 'share/:shareId',
      element: <ShareRoute />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'build',
      element: <BuildRoute />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'auth/callback',
      element: (
        <AuthContextProvider>
          <OAuthCallback />
        </AuthContextProvider>
      ),
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'oauth',
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: 'success',
          element: <OAuthSuccess />,
        },
        {
          path: 'error',
          element: <OAuthError />,
        },
      ],
    },
    {
      path: 'verify',
      element: <VerifyEmail />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/',
          element: <LoginLayout />,
          children: [
            {
              path: 'login',
              element: <Login />,
            },
            {
              path: 'login/2fa',
              element: <TwoFactorScreen />,
            },
          ],
        },
        dashboardRoutes,
        {
          path: '/',
          element: <Root />,
          children: [
            {
              index: true,
              element: <NewChatRedirect />,
            },
            {
              path: 'c/:conversationId?',
              element: <ChatRoute />,
            },
            {
              path: 'search',
              element: <Search />,
            },
            {
              path: 'agents',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
            {
              path: 'agents/:category',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
          ],
        },
      ],
    },
  ],
  { basename: baseHref },
);
