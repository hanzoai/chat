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
/**
 * NO PUBLISHABLE INGEST KEY IS PASSED, AND THAT IS DELIBERATE.
 *
 * Do not "fix" a dropped event by baking a pk- here or adding an EVENT_INGEST_KEY
 * build arg. @hanzo/event resolves the outgoing credential as `ingestKey ?? token`
 * — a key does not SUPPLEMENT the bearer, it REPLACES it. Chat is multi-org (a
 * session's org is the verified IAM `owner` claim, api/server/controllers/auth/
 * iamSession.js), and cloud stamps the tenant from whichever single credential
 * arrives. So a baked key would file every org's users under the one org that
 * minted it, and overwrite each user's own identity while doing it.
 *
 * The signed-in path needs no key: the user's own IAM bearer already resolves
 * their org at FULL capability, which is why chat's signed-in pageviews land in
 * their own tenant today. Logged-out and guest views carry no bearer and take the
 * anonymous lane (pageview + error only, filed under `$public`) — the honest
 * outcome for a visitor who has not identified themselves, and what that lane is
 * for. Widening it for a multi-tenant app would cost tenant integrity.
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
