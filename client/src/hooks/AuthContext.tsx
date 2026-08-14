import {
  useRef,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from 'react';
import { debounce } from 'lodash';
import { useAtom, useSetAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { setTokenHeader, SystemRoles } from '@hanzochat/data-provider';
import type * as t from '@hanzochat/data-provider';
import { useGetRole, useGetUserQuery, useGetStartupConfig } from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext } from '~/common';
import { guestUser } from '~/utils/guest';
import { exchanging, probeSession } from '~/utils/sso';
import { getHanzoIamSdk } from '~/utils/iam';
import useTimeout from './useTimeout';
import store from '~/store';

const AuthContext = createContext<TAuthContext | undefined>(undefined);

const AuthContextProvider = ({
  authConfig,
  children,
}: {
  authConfig?: TAuthConfig;
  children: ReactNode;
}) => {
  const [user, setUser] = useAtom(store.user);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const setAuthenticatedAtom = useSetAtom(store.isAuthenticated);
  useEffect(() => setAuthenticatedAtom(isAuthenticated), [isAuthenticated, setAuthenticatedAtom]);
  const logoutRedirectRef = useRef<string | undefined>(undefined);

  /**
   * What the session probe has established about this visitor. A guest is the
   * FALLBACK identity for `none` — minting one while the probe is still in
   * flight lets the guest bearer land on top of the real one, and the signed-in
   * session then reads the guest's capped catalog as if it were its own.
   */
  const sessionRef = useRef<'unknown' | 'none' | 'live'>('unknown');

  const { data: startupConfig } = useGetStartupConfig();

  const { data: userRole = null } = useGetRole(SystemRoles.USER, {
    enabled: !!(isAuthenticated && (user?.role ?? '')),
  });
  const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
    enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
  });

  const navigate = useNavigate();

  const setUserContext = useMemo(
    () =>
      debounce((userContext: TUserContext) => {
        const { token, isAuthenticated, user, redirect } = userContext;
        setUser(user);
        setToken(token);
        //@ts-ignore - ok for token to be undefined initially
        setTokenHeader(token);
        setIsAuthenticated(isAuthenticated);
        sessionRef.current = isAuthenticated ? 'live' : 'none';
        if (isAuthenticated) {
          /** A real session supersedes the guest identity it replaces. */
          setIsGuest(false);
        }

        // Use a custom redirect if set
        const finalRedirect = logoutRedirectRef.current || redirect;
        // Clear the stored redirect
        logoutRedirectRef.current = undefined;

        if (finalRedirect == null) {
          return;
        }

        if (finalRedirect.startsWith('http://') || finalRedirect.startsWith('https://')) {
          window.location.href = finalRedirect;
        } else {
          navigate(finalRedirect, { replace: true });
        }
      }, 50),
    [navigate, setUser],
  );
  const doSetError = useTimeout({ callback: (error) => setError(error as string | undefined) });

  const queryClient = useQueryClient();

  /**
   * Sign out where the session actually lives.
   *
   * The issuer holds it — an SSO cookie at hanzo.id plus the refresh token this
   * browser stores — so ending it is `IAM#logout()`: revoke both tokens, end the
   * session there, then clear what this browser holds. Clearing only the local
   * copy would leave the issuer still recognising this browser, and the silent
   * probe below would sign the same person straight back in.
   */
  const logout = useCallback(
    (redirect?: string) => {
      if (redirect) {
        logoutRedirectRef.current = redirect;
      }
      void getHanzoIamSdk()
        .logout()
        .catch(() => {
          /* Reaching the issuer is best-effort; leaving this machine is not. */
        })
        .then(() => {
          setIsGuest(false);
          setUserContext({
            token: undefined,
            isAuthenticated: false,
            user: undefined,
            redirect: '/login',
          });
        });
    },
    [setUserContext],
  );

  const userQuery = useGetUserQuery({ enabled: !!(token ?? '') && !isGuest });

  /**
   * Become a guest.
   *
   * A guest is anonymous, which means they hold nothing: no account, no token,
   * no credential to acquire. The identity is entirely local, and the server
   * recognises the visitor by the absence of a bearer — which is why this cannot
   * fail and no longer asks anyone's permission. What a guest may do is decided
   * server-side (`enforceGuestScope`), never here.
   */
  const acquireGuest = useCallback(async (): Promise<boolean> => {
    if (sessionRef.current === 'live') {
      /* A real session landed in the meantime — it supersedes the guest. */
      return false;
    }
    // setUserContext is DEBOUNCED (50ms) and its unauth write ends in
    // setTokenHeader(undefined). Adopting a principal cancels whatever unauth
    // write is still pending, so it cannot land on top of this one.
    setUserContext.cancel();
    setUser(guestUser());
    setToken(undefined);
    setTokenHeader(undefined as unknown as string);
    setIsGuest(true);
    setIsAuthenticated(false);
    // Bootstrap queries (models, endpoints, convos) that fired before this
    // identity existed have burned their retries into a terminal error state,
    // and nothing else re-runs them — the chat pane would stay empty. Adopting a
    // principal refetches the world.
    await queryClient.invalidateQueries();
    return true;
  }, [setUser, setUserContext, queryClient]);

  /**
   * Start a sign-in. IAM owns every credential step, so there is nothing to
   * collect here and nothing to post — this hands the browser to the issuer and
   * `OAuthCallback` picks it up on the way back.
   */
  const login = () => {
    void getHanzoIamSdk().signinRedirect();
  };

  /**
   * Ref-held guest fallback so `adoptSession` (intentionally dep-free) always
   * sees the latest config/handler without resubscribing. When no session
   * exists and guest chat is enabled, fall back to the anonymous preview;
   * otherwise let the root route show the landing/login gate.
   */
  const guestFallbackRef = useRef<() => Promise<void>>(async () => {});
  guestFallbackRef.current = async () => {
    // A principal already landed (guest or real) — a straggler must not run the
    // fallback: its unauth branch resets the token header that the adopted
    // session just installed, and the next send goes out tokenless while the
    // composer still renders.
    if (isGuest || isAuthenticated) {
      return;
    }

    // The callback route is redeeming a code as we speak, and it wraps this
    // provider, so the ordinary signed-out path runs on top of it. Stand down: a
    // guest minted here spends the per-IP budget on somebody who is one round
    // trip from being signed in, and then races their real session into the
    // bargain. Rare before the probe existed; now every anonymous visitor passes
    // through that route exactly once.
    if (exchanging()) {
      return;
    }

    // This app has no session of its own. hanzo.id may still know this browser:
    // somebody who signed in at console.hanzo.ai or hanzo.app IS signed in, and
    // chat was the one surface that never asked — so it showed them "Log in" and
    // served them a 2-message anonymous trial while their credits sat unspent.
    //
    // Ask, silently, once per visit. This is a TOP-LEVEL navigation, which is
    // what makes it work: the SameSite=Lax session cookie rides a document
    // navigation, and `prompt=none` means the issuer answers from that session
    // or answers `login_required` — it renders nothing either way, so the
    // anonymous preview below survives for a visitor who really is a stranger.
    //
    // The earlier attempt at this used `IAM#signinSilent()`, a hidden iframe. It
    // could never have worked — Lax withholds the cookie from a cross-site
    // SUBRESOURCE, the edge answers X-Frame-Options: DENY, and the issuer refuses
    // on Sec-Fetch-Dest besides. Its removal took the correct conclusion with it.
    if (await probeSession()) {
      // The document is navigating to the issuer. Do not mint a guest on the way
      // out: it spends the per-IP mint budget on a page that is already gone, and
      // the session about to land supersedes it anyway.
      return;
    }

    // Settled: no session here and none at the issuer. Recorded only now, because
    // the effect below starts a guest the moment it reads 'none'.
    sessionRef.current = 'none';

    if (startupConfig?.allowGuestChat === true) {
      void acquireGuest().then((ok) => {
        if (!ok) {
          setUserContext({ token: undefined, isAuthenticated: false, user: undefined });
        }
      });
      return;
    }
    setUserContext({ token: undefined, isAuthenticated: false, user: undefined });
  };

  /** One probe at a time: the effect below refires on every auth-state change
   *  while signed out, and parallel probes mean parallel fallbacks — the
   *  stragglers land after the guest has adopted and undo it. */
  const refreshBusyRef = useRef(false);
  const adoptSession = useCallback(() => {
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping session adoption.');
      return;
    }
    if (refreshBusyRef.current) {
      return;
    }
    refreshBusyRef.current = true;

    /**
     * Ask IAM whether this browser still has a session.
     *
     * `getValidAccessToken` answers from what the browser already holds and
     * spends the refresh token on it when the access token has aged out, so a
     * reload and an expiry are the same question with the same answer. There is
     * nothing to ask this server: it issues no credential, and the token the
     * SDK returns is the one it will verify.
     */
    void getHanzoIamSdk()
      .getValidAccessToken()
      .then((token) => {
        if (token != null && token !== '') {
          setUserContext({ token, isAuthenticated: true, user: undefined });
          return;
        }
        return guestFallbackRef.current();
      })
      .catch((error) => {
        console.log('IAM session adoption error:', error);
        if (authConfig?.test === true) {
          return;
        }
        return guestFallbackRef.current();
      })
      .finally(() => {
        refreshBusyRef.current = false;
      });
  }, []);

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    } else if (userQuery.isError) {
      doSetError((userQuery.error as Error).message);
      navigate('/login', { replace: true });
    }
    if (error != null && error && isAuthenticated) {
      doSetError(undefined);
    }
    if (!isGuest && (token == null || !token || !isAuthenticated)) {
      adoptSession();
    }
  }, [
    token,
    isGuest,
    isAuthenticated,
    userQuery.data,
    userQuery.isError,
    userQuery.error,
    error,
    setUser,
    navigate,
    adoptSession,
    setUserContext,
  ]);

  // Adopt the guest identity once startup config confirms guest chat is enabled.
  // The fallback can run before startupConfig has loaded (when
  // `allowGuestChat` is still undefined), and it is not retried — so this effect
  // closes that race by acquiring the guest token when the flag becomes true.
  // It waits for `sessionRef` to say there is no session: the probe is the ONLY
  // thing that decides whether this visitor is a guest.
  useEffect(() => {
    if (
      sessionRef.current === 'none' &&
      startupConfig?.allowGuestChat === true &&
      !isAuthenticated &&
      !isGuest &&
      (token == null || !token)
    ) {
      void acquireGuest();
    }
  }, [startupConfig?.allowGuestChat, isAuthenticated, isGuest, token, acquireGuest]);

  useEffect(() => {
    const handleTokenUpdate = (event) => {
      console.log('tokenUpdated event received event');
      const newToken = event.detail;
      setUserContext({
        token: newToken,
        isAuthenticated: true,
        user: user,
      });
    };

    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [setUserContext, user]);

  // Make the provider update only when it should
  const memoedValue = useMemo(
    () => ({
      user,
      token,
      error,
      login,
      logout,
      setError,
      roles: {
        [SystemRoles.USER]: userRole,
        [SystemRoles.ADMIN]: adminRole,
      },
      isAuthenticated,
      isGuest,
    }),

    [user, error, isAuthenticated, isGuest, token, userRole, adminRole],
  );

  return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext should be used inside AuthProvider');
  }

  return context;
};

export { AuthContextProvider, useAuthContext, AuthContext };
