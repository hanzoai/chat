import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Login, ApiErrorWatcher } from '~/components/Auth';
import OAuthCallback from '~/components/Auth/OAuthCallback';
import { MarketplaceProvider } from '~/components/Agents/MarketplaceContext';
import AgentMarketplace from '~/components/Agents/Marketplace';
import { OAuthSuccess, OAuthError } from '~/components/OAuth';
import { ChatsAndTasks } from '~/components/Chats';
import { AuthContextProvider } from '~/hooks/AuthContext';
import { AnalyticsProvider } from '~/Providers';
import RouteErrorBoundary from './RouteErrorBoundary';
import BuildRoute from './BuildRoute';
import LandingPage from '~/components/Landing/LandingPage';
import { IAM_ORG } from '~/utils/iam';
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

// `/` IS the new chat, so the redirect runs the other way now. There were two
// URLs for one screen and the shorter one was the impostor: every entry bounced
// to `/c/new`, which then had to be special-cased as a conversation id that is
// not a conversation. One canonical URL, and `/c/new` folds onto it.
//
// The query string is carried by hand because React Router's plain <Navigate>
// drops it, and a cross-surface deep link like `/c/new?q=…&submit=true` has to
// survive the fold.
const NewChatCanonical = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/', search }} replace={true} />;
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
          ],
        },
        // Marketing keeps a home, it just stops being the front door — the same
        // shape chatgpt.com uses, where the app answers `/` and the pitch lives at
        // `/pricing`. Declared OUTSIDE <Root/> because LandingPage brings its own
        // full-page chrome and must not mount inside the chat shell.
        //
        // It is HANZO's pitch — its wordmark, its copy, its cross-app chrome — so
        // it is served to Hanzo's tenant and nobody else's. Every brand runs this
        // same image, and a brand with no marketing page of its own has no use for
        // another brand's; it sends the visitor to the product instead.
        {
          path: 'welcome',
          element: IAM_ORG === 'hanzo' ? <LandingPage /> : <Navigate to="/" replace={true} />,
        },
        dashboardRoutes,
        {
          path: '/',
          element: <Root />,
          children: [
            {
              index: true,
              element: <ChatRoute />,
            },
            {
              // Declared BEFORE the dynamic sibling so a static segment wins:
              // `new` was never a conversation id, it was a sentinel meaning
              // "no conversation yet", which is what `/` already says.
              path: 'c/new',
              element: <NewChatCanonical />,
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
              path: 'chats',
              element: <ChatsAndTasks />,
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
    // An address the app does not serve (`/register`, a stale bookmark) had no
    // match, so react-router threw and RouteErrorBoundary printed a stack-trace
    // panel — "Status: 404 Not Found", "Download error logs" — at a URL a person
    // types. The splat ranks last, so it only catches what nothing else claims,
    // and sends it to the one canonical entry point.
    {
      path: '*',
      element: <Navigate to="/" replace={true} />,
    },
  ],
  { basename: baseHref },
);
