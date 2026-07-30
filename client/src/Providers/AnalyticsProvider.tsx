import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TelemetryProvider, useTelemetry } from '@hanzogui/telemetry';
import { useAuthContext } from '~/hooks/AuthContext';

/**
 * Binds the visitor to the authenticated user. This is the ONE thing
 * <TelemetryProvider> does not do for us: it owns pageviews, errors and
 * interaction capture, but identity is the app's to assert. Uses the stable
 * user id — never email/PII.
 */
function IdentityBridge() {
  const telemetry = useTelemetry();
  const { user, isAuthenticated } = useAuthContext();

  const userId = isAuthenticated ? user?.id : undefined;
  useEffect(() => {
    if (userId) {
      telemetry.identify(userId);
    }
  }, [telemetry, userId]);

  return null;
}

/**
 * The ONE telemetry surface for Hanzo Chat. Everything — pageviews, product
 * events, exceptions, interaction capture — is POSTed to the ONE front door
 * (POST api.hanzo.ai/v1/event) and lensed server-side; there is no page tag and
 * no second client. Host and publishable ingest key resolve from the
 * environment (VITE_HANZO_API_URL, VITE_HANZO_INGEST_KEY), so neither is named
 * here: the default host IS the front door.
 *
 * Mounted inside AuthContextProvider so it can read the live JWT and the
 * resolved user, and it covers logged-in, guest AND logged-out visitors alike.
 *
 * Consent is not our business either — the provider honors Global Privacy
 * Control and Do-Not-Track itself, and a stored in-app choice outranks both.
 * `path` hands it react-router's location so a SPA navigation is counted once,
 * by the router, rather than by patching the History API.
 */
export default function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();
  const { pathname } = useLocation();

  // Read the live token at capture time without re-creating the client: the
  // 'session' sentinel (cookie-session auth, no JWT) is treated as anonymous.
  const tokenRef = useRef<string | undefined>(token);
  tokenRef.current = token;

  return (
    <TelemetryProvider
      product="chat"
      path={pathname}
      getToken={() => {
        const value = tokenRef.current;
        return value && value !== 'session' ? value : undefined;
      }}
    >
      <IdentityBridge />
      {children}
    </TelemetryProvider>
  );
}
