import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AnalyticsProvider as CaptureProvider,
  useAnalytics,
  usePageview,
} from '@hanzo/event/react';
import { ObserveProvider } from '@hanzo/observe/react';
import { useAuthContext } from '~/hooks/AuthContext';

const ANALYTICS_HOST = import.meta.env.VITE_HANZO_ANALYTICS_HOST || 'https://api.hanzo.ai';

/** Publishable ingest key (pk_…) — write-only, safe to ship in the bundle. It lets
 *  logged-out / guest visitors reach the ONE front door (POST /v1/event) so their
 *  pageviews + errors land server-side (Cloud stamps the org from the key). Chat has
 *  a first-class guest surface, so this is what makes anonymous guest telemetry
 *  accepted; provision one per org via POST /v1/ingest/keys. */
const INGEST_KEY = import.meta.env.VITE_HANZO_INGEST_KEY || undefined;

/** Consent gate — honor Do Not Track / Global Privacy Control as opt-out. The client
 *  sends no PII (a stable user id only, never email), so the browser's standard
 *  privacy signals are the whole consent surface. Opting out suppresses pageviews,
 *  events, errors, AND interaction autocapture. */
function telemetryEnabled(): boolean {
  if (typeof navigator === 'undefined') return true;
  const n = navigator as Navigator & { msDoNotTrack?: string | null; globalPrivacyControl?: boolean };
  const w = typeof window !== 'undefined' ? (window as Window & { doNotTrack?: string | null }) : undefined;
  const dnt = n.doNotTrack ?? w?.doNotTrack ?? n.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return false;
  if (n.globalPrivacyControl) return false;
  return true;
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
 * First-party telemetry for Hanzo Chat — the ONE @hanzo/event client to the ONE
 * front door (POST api.hanzo.ai/v1/event), which Cloud fans out to the web
 * (analytics), product (insights), and error (sentry) lenses. Mounted inside
 * AuthContextProvider so it reads the live JWT and resolved user; a publishable
 * ingest key carries logged-out / guest views. `<ObserveProvider>` rides the SAME
 * client and adds default-on interaction autocapture ($click/$input/$change/
 * $submit) with a semantic DOM hierarchy — input values redacted by default
 * (PII-free). nav={false}: the event layer already counts pageviews exactly once
 * (AnalyticsBridge), so observe does not also patch history; `enabled` mirrors the
 * DNT/GPC consent gate.
 */
export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();

  // Read the live token at capture time without re-creating the config: the
  // 'session' sentinel (cookie-session auth, no JWT) is treated as anonymous.
  const tokenRef = useRef<string | undefined>(token);
  tokenRef.current = token;

  const enabled = telemetryEnabled();

  const config = useMemo(
    () => ({
      product: 'chat',
      host: ANALYTICS_HOST,
      ingestKey: INGEST_KEY,
      enabled,
      getToken: () => {
        const value = tokenRef.current;
        return value && value !== 'session' ? value : undefined;
      },
    }),
    [enabled],
  );

  return (
    <CaptureProvider config={config}>
      <ObserveProvider nav={false} enabled={enabled}>
        <AnalyticsBridge />
        {children}
      </ObserveProvider>
    </CaptureProvider>
  );
}
