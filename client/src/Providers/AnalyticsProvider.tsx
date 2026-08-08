import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AnalyticsProvider as CaptureProvider,
  useAnalytics,
  usePageview,
} from '@hanzo/event/react';
import { ObserveProvider } from '@hanzo/observe/react';
import { setTelemetry } from '@hanzo/ui/telemetry';
import { useAuthContext } from '~/hooks/AuthContext';

const ANALYTICS_HOST = import.meta.env.VITE_HANZO_ANALYTICS_HOST || 'https://api.hanzo.ai';

/**
 * Publishable ingest key (pk-…) — write-only, safe in the bundle. It resolves the
 * org server-side for requests that carry no bearer, which is how logged-out and
 * guest views (the landing IS the composer) reach the fail-closed door. Mint one
 * per org via POST /v1/keys with {"type":"publishable"}.
 *
 * Unset is NOT best-effort: cloud takes an unkeyed beacon down the anonymous lane,
 * whose allowlist admits only pageview and error. Every track/identify/group is
 * then dropped — and the caller still gets 200, so the loss is silent on both
 * ends. The key is what buys full-capability ingest.
 */
const INGEST_KEY = import.meta.env.VITE_PUBLISHABLE_KEY?.trim() || undefined;

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
 * navigations tracked. Identity is the IAM subject — never email/PII.
 *
 * WHICH ID. `user.openidId` is the Hanzo IAM `sub`, the same value hanzo.ai and
 * cloud.hanzo.ai identify this user by. It is deliberately NOT `user.id`, which is
 * chat's own row id: keying on that splits one user into a separate identity per
 * property, so cross-property funnels and retention silently measure nothing. A
 * local (non-OIDC) dev account has no IAM identity and is correctly left
 * unidentified rather than given a fabricated one.
 *
 * HISTORY SURVIVES SIGN-UP. Nothing here mints or resets an id. @hanzo/event stamps
 * `anonymousId` from the `hz_anon_id` localStorage value on EVERY event, including
 * this identify, and that value is minted once per browser and never cleared on
 * login — so the identify arrives carrying the same anonymous id the visitor's
 * pre-signup pageviews were filed under, and the two join.
 */
function AnalyticsBridge() {
  const analytics = useAnalytics();
  const { user, isAuthenticated } = useAuthContext();
  const { pathname } = useLocation();

  usePageview(pathname);

  // The shared components emit through an AMBIENT client, not this one. Left
  // unregistered that ambient client is a SECOND client with no credential, and
  // it was posting the same $pageview this one does — three refused requests per
  // load, answered 401, while the keyed request beside them succeeded. Installing
  // this client as the ambient one collapses the two into a single keyed stream,
  // which is what the rest of the estate does (hanzoai/console src/lib/event.ts).
  useEffect(() => {
    setTelemetry({
      enabled: true,
      product: 'chat',
      client: analytics,
      track: (event, properties, commerce) => analytics.capture(event, properties, commerce),
      pageview: (path, properties) => analytics.pageview(path, properties),
      identify: (personId, traits) => analytics.identify(personId, traits),
      group: (groupId, traits) => analytics.group(groupId, traits),
      captureError: (err, context) => analytics.captureError(err, context),
      captureException: (err, context) => analytics.captureError(err, context),
      setCohort: (patch) => analytics.setCohort(patch),
      flush: () => analytics.flush(),
    });
  }, [analytics]);

  const iamSubject = isAuthenticated ? user?.openidId : undefined;
  useEffect(() => {
    if (iamSubject) {
      analytics.identify(iamSubject);
    }
  }, [analytics, iamSubject]);

  return null;
}

/**
 * The ONE telemetry client for Hanzo Chat: @hanzo/event → POST /v1/event, the
 * single front door Cloud fans out into the web (analytics), product (insights)
 * and error (sentry) lenses. There is no page tag — this client covers pageviews
 * and errors for logged-in, guest AND logged-out visitors alike. Mounted inside
 * AuthContextProvider so it can read the live JWT and the resolved user.
 *
 * <ObserveProvider> rides the SAME client (it defaults to the one from
 * CaptureProvider) and adds default-on interaction autocapture ($click/$input/
 * $change/$submit) over a semantic DOM hierarchy; input values are redacted by
 * default (PII-free). nav={false} because AnalyticsBridge already counts each
 * pageview exactly once — observe must not patch history and double-count.
 * `enabled` is the one consent gate, shared by the client and autocapture.
 */
export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();

  // Read the live token at capture time without re-creating the config: the
  // 'session' sentinel (cookie-session auth, no JWT) is treated as anonymous.
  const tokenRef = useRef<string | undefined>(token);
  tokenRef.current = token;

  const enabled = consented();

  const config = useMemo(
    () => ({
      product: 'chat',
      host: ANALYTICS_HOST,
      enabled,
      // Signed in -> the visitor's OWN IAM token, so cloud attributes the event to
      // their org and user. Signed out -> the publishable key, which is admission
      // for anonymous traffic and nothing more.
      //
      // The key is supplied HERE and never as `ingestKey`. The SDK resolves the
      // credential as `ingestKey ?? token`, so passing it there makes the key win
      // even for a signed-in user — their events get filed under the key's org
      // instead of their own, and this `getToken` becomes unreachable. Feeding it
      // through the resolver inverts that to `token ?? key`, which is the order
      // the product wants: one credential per state, the token whenever there is
      // one.
      getToken: () => {
        const value = tokenRef.current;
        return value && value !== 'session' ? value : INGEST_KEY;
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
