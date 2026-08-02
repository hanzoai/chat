import { useCallback } from 'react';
import { dataService, SystemRoles } from '@hanzochat/data-provider';
import type { TUser } from '@hanzochat/data-provider';

export type GuestSession = {
  token: string;
  user: TUser;
  model: string;
  endpoint: string;
};

/**
 * Where a live guest bearer waits out a reload.
 *
 * `sessionStorage`, not `localStorage`: this is a BEARER, and it must not outlive
 * the visit on a shared browser. The tab IS the visit — the same scope
 * `utils/login.ts` already uses for per-visit state. Nothing here is a preference,
 * so none of it reaches the signed-in principal that may follow (the rule
 * `store/__tests__/guestPersistence.spec.tsx` pins).
 */
const STORE_KEY = 'hanzo.guest.session';

/** Slack so a token that expires mid-request is never the one we reuse. */
const EXPIRY_SKEW_MS = 30_000;

type StoredSession = { token: string; model: string; endpoint: string; expiresAt: number };

const guestUser = () =>
  ({
    id: 'guest',
    role: SystemRoles.GUEST,
    username: 'guest',
    name: 'Guest',
    email: '',
  }) as unknown as TUser;

/** The stored bearer while it is still good, or null. */
function storedSession(): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) {
      return null;
    }
    const stored = JSON.parse(raw) as StoredSession;
    if (!stored?.token || stored.expiresAt - EXPIRY_SKEW_MS <= Date.now()) {
      sessionStorage.removeItem(STORE_KEY);
      return null;
    }
    return {
      token: stored.token,
      user: guestUser(),
      model: stored.model,
      endpoint: stored.endpoint,
    };
  } catch {
    return null;
  }
}

/**
 * Acquires an ephemeral guest session for anonymous preview chat.
 *
 * A live bearer is REUSED. Minting one is how the landing renders at all, so
 * minting a fresh one on every page load spent the per-IP mint budget
 * (`guestTokenLimiter`) on ordinary browsing — behind Cloudflare a single
 * `CF-Connecting-IP` can be a whole office, and a reload is not a new visitor.
 * The token already carries its own lifetime (`expiresIn`, `GUEST_TOKEN_EXPIRY`),
 * so a visit costs one mint per expiry window instead of one per paint.
 *
 * Returns `null` when guest issuance fails (mint quota reached, or guest chat
 * disabled), letting the caller say so instead of silently degrading.
 */
export default function useGuestAuth() {
  const acquireGuestToken = useCallback(async (): Promise<GuestSession | null> => {
    const reused = storedSession();
    if (reused) {
      return reused;
    }
    try {
      const data = await dataService.getGuestToken();
      try {
        sessionStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            token: data.token,
            model: data.model,
            endpoint: data.endpoint,
            expiresAt: Date.now() + data.expiresIn * 1000,
          } satisfies StoredSession),
        );
      } catch {
        /* A browser that refuses storage still gets a session; it just re-mints. */
      }
      return { token: data.token, user: guestUser(), model: data.model, endpoint: data.endpoint };
    } catch (_error) {
      return null;
    }
  }, []);

  return { acquireGuestToken };
}
