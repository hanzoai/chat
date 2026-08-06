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
import {
  useGetRole,
  useGetUserQuery,
  useLoginUserMutation,
  useLogoutUserMutation,
  useRefreshTokenMutation,
  useGetStartupConfig,
} from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext, TResError } from '~/common';
import { requireLogin } from '~/utils/login';
import { exchanging, probeSession } from '~/utils/sso';
import useGuestAuth from './useGuestAuth';
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
  const { acquireGuestToken } = useGuestAuth();

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

  const loginUser = useLoginUserMutation({
    onSuccess: (data: t.TLoginResponse) => {
      const { user, token, twoFAPending, tempToken } = data;
      if (twoFAPending) {
        // Redirect to the two-factor authentication route.
        navigate(`/login/2fa?tempToken=${tempToken}`, { replace: true });
        return;
      }
      setError(undefined);
      setUserContext({ token, isAuthenticated: true, user, redirect: '/c/new' });
    },
    onError: (error: TResError | unknown) => {
      const resError = error as TResError;
      doSetError(resError.message);
      navigate('/login', { replace: true });
    },
  });
  const logoutUser = useLogoutUserMutation({
    onSuccess: (data) => {
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: data.redirect ?? '/login',
      });
    },
    onError: (error) => {
      doSetError((error as Error).message);
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: '/login',
      });
    },
  });
  const refreshToken = useRefreshTokenMutation();
  const queryClient = useQueryClient();

  const logout = useCallback(
    (redirect?: string) => {
      if (redirect) {
        logoutRedirectRef.current = redirect;
      }
      logoutUser.mutate(undefined);
    },
    [logoutUser],
  );

  const userQuery = useGetUserQuery({ enabled: !!(token ?? '') && !isGuest });

  const acquireGuest = useCallback(async (): Promise<boolean> => {
    const session = await acquireGuestToken();
    if (sessionRef.current === 'live') {
      /* A real session landed while the guest token was in flight — drop it. */
      return false;
    }
    if (!session) {
      /**
       * The mint was REFUSED (per-IP quota, or guest chat off server-side). That
       * leaves this visitor with no product at all, and it used to pass silently:
       * `Root` fell through to the marketing page, so a 429 on an auxiliary token
       * read as a site with no composer and no explanation. Say it, and offer the
       * one thing that resolves it.
       */
      requireLogin('unavailable');
      return false;
    }
    // setUserContext is DEBOUNCED (50ms). A refresh failure queues its unauth
    // write — which ends in setTokenHeader(undefined) — and a local guest
    // mint outruns that timer, so the erase used to land AFTER this adoption
    // and every send left tokenless while the composer stayed up. Adopting a
    // principal cancels whatever unauth write is still pending.
    setUserContext.cancel();
    setUser(session.user);
    setToken(session.token);
    setTokenHeader(session.token);
    setIsGuest(true);
    setIsAuthenticated(false);
    // Bootstrap queries (models, endpoints, convos) that fired before this
    // bearer existed have burned their retries into a terminal error state,
    // and nothing else re-runs them — the chat pane would stay empty with a
    // valid session in hand. Adopting a principal refetches the world.
    await queryClient.invalidateQueries();
    return true;
  }, [acquireGuestToken, setUser, queryClient]);

  const login = (data: t.TLoginUser) => {
    loginUser.mutate(data);
  };

  /**
   * Ref-held guest fallback so `silentRefresh` (intentionally dep-free) always
   * sees the latest config/handler without resubscribing. When no session
   * exists and guest chat is enabled, acquire a guest token; otherwise let the
   * root route show the landing/login gate.
   */
  const guestFallbackRef = useRef<() => Promise<void>>(async () => {});
  guestFallbackRef.current = async () => {
    // A principal already landed (guest or real) — a straggler refresh must
    // not run the fallback: its unauth branch resets the token header that
    // the adopted session just installed, and the next send goes out
    // tokenless while the composer still renders.
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
   *  while signed out, and parallel refreshes mean parallel fallbacks — the
   *  stragglers land after the guest has adopted and undo it. */
  const refreshBusyRef = useRef(false);
  const silentRefresh = useCallback(() => {
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping silent refresh.');
      return;
    }
    if (refreshBusyRef.current) {
      return;
    }
    refreshBusyRef.current = true;
    refreshToken.mutate(undefined, {
      onSettled: () => {
        refreshBusyRef.current = false;
      },
      onSuccess: (data: t.TRefreshTokenResponse | undefined) => {
        const { user, token = '' } = data ?? {};
        if (token) {
          setUserContext({ token, isAuthenticated: true, user });
        } else if (user) {
          // Session-based auth: no JWT token, but user data means session is valid
          // Use a sentinel value so isAuthenticated works
          setUserContext({ token: 'session', isAuthenticated: true, user });
        } else {
          console.log('No valid session. User is not authenticated.');
          if (authConfig?.test === true) {
            return;
          }
          void guestFallbackRef.current();
        }
      },
      onError: (error) => {
        console.log('refreshToken mutation error:', error);
        if (authConfig?.test === true) {
          return;
        }
        void guestFallbackRef.current();
      },
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
      silentRefresh();
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
    silentRefresh,
    setUserContext,
  ]);

  // Acquire a guest session once startup config confirms guest chat is enabled.
  // silentRefresh's fallback can run before startupConfig has loaded (when
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
