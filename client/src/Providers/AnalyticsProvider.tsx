import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AnalyticsProvider as CaptureProvider,
  useAnalytics,
  usePageview,
} from '@hanzo/event/react';
import { useAuthContext } from '~/hooks/AuthContext';

const ANALYTICS_HOST = import.meta.env.VITE_HANZO_ANALYTICS_HOST || 'https://api.hanzo.ai';

/**
 * Publishable ingest key (pk_…) — write-only, safe in the bundle. It resolves the
 * org server-side for requests that carry no bearer, which is how logged-out and
 * guest views (the landing IS the composer) reach the fail-closed door. Mint one
 * per org via POST /v1/ingest/keys. Unset → anonymous events are best-effort.
 */
const INGEST_KEY = import.meta.env.VITE_HANZO_INGEST_KEY?.trim() || undefined;

/**
 * Consent gate — an explicit browser opt-out (Global Privacy Control, then legacy
 * Do-Not-Track) suppresses pageviews, events AND errors. This is the whole consent
 * surface: the client sends a stable id, never email/PII.
 */
function consented(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    doNotTrack?: string | null;
  };
  if (nav.globalPrivacyControl === true) {
    return false;
  }
  const dnt = nav.doNotTrack;
  return dnt !== '1' && dnt !== 'yes';
}

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
 * The ONE telemetry client for Hanzo Chat: @hanzo/event → POST /v1/event, the
 * single front door Cloud fans out into the web (analytics), product (insights)
 * and error (sentry) lenses. There is no page tag — this client covers pageviews
 * and errors for logged-in, guest AND logged-out visitors alike. Mounted inside
 * AuthContextProvider so it can read the live JWT and the resolved user.
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
      ingestKey: INGEST_KEY,
      enabled: consented(),
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
