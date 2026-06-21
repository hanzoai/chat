import { useCallback } from 'react';
import { dataService } from 'librechat-data-provider';
import type { TUser } from 'librechat-data-provider';

const GUEST_ROLE = 'GUEST';

export type GuestSession = {
  token: string;
  user: TUser;
  model: string;
  endpoint: string;
};

/**
 * Acquires an ephemeral guest session for anonymous preview chat.
 *
 * Returns `null` when guest issuance fails (e.g. quota for new sessions reached
 * or guest chat disabled), letting the caller fall back to the login gate.
 */
export default function useGuestAuth() {
  const acquireGuestToken = useCallback(async (): Promise<GuestSession | null> => {
    try {
      const data = await dataService.getGuestToken();
      const user = {
        id: 'guest',
        role: GUEST_ROLE,
        username: 'guest',
        name: 'Guest',
        email: '',
      } as unknown as TUser;
      return { token: data.token, user, model: data.model, endpoint: data.endpoint };
    } catch (_error) {
      return null;
    }
  }, []);

  return { acquireGuestToken };
}
