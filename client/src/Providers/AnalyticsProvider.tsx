import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AnalyticsProvider as CaptureProvider,
  useAnalytics,
  usePageview,
} from '@hanzo/capture/react';
import { useAuthContext } from '~/hooks/AuthContext';

const ANALYTICS_HOST = import.meta.env.VITE_HANZO_ANALYTICS_HOST || 'https://api.hanzo.ai';

/**
 * Identifies the authenticated user and fires a pageview on every route change.
 * The provider fires the first pageview itself; this keeps subsequent SPA
 * navigations tracked. Identity uses the stable user id — never email/PII.
 */
function AnalyticsBridge() {
  const analytics = useAnalytics();
  const { user, isAuthenticated } = useAuthContext();
  const { pathname } = useLocation();

  usePageview(pathname);

  const userId = isAuthenticated ? user?.id : undefined;
  useEffect(() => {
    if (userId != null && userId) {
      analytics.identify(userId);
    }
  }, [analytics, userId]);

  return null;
}

/**
 * First-party product analytics for Hanzo Chat (@hanzo/capture → cloud
 * /v1/analytics). Mounted inside AuthContextProvider so it can read the live JWT
 * and the resolved user; anonymous events still flow when no token is present.
 */
export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();

  // Read the live token at capture time without re-creating the config: the
  // 'session' sentinel (cookie-session auth, no JWT) is treated as anonymous.
  const tokenRef = useRef<string | undefined>(token);
  tokenRef.current = token;

  const config = useMemo(
    () => ({
      product: 'chat',
      host: ANALYTICS_HOST,
      getToken: () => {
        const value = tokenRef.current;
        return value && value !== 'session' ? value : undefined;
      },
    }),
    [],
  );

  return (
    <CaptureProvider config={config}>
      <AnalyticsBridge />
      {children}
    </CaptureProvider>
  );
}
