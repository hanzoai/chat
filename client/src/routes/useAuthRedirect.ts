import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks';
import { useGetStartupConfig } from '~/data-provider';

export default function useAuthRedirect() {
  const { user, roles, isAuthenticated, isGuest } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until startup config is known before deciding — otherwise a fresh
    // guest visitor is bounced to /login before `allowGuestChat` (and the guest
    // session) has loaded.
    if (startupConfig == null) {
      return;
    }
    const timeout = setTimeout(() => {
      // Guests (and any context where guest chat is enabled) stay on the chat
      // surface; only truly unauthenticated, non-guest users go to /login.
      if (!isAuthenticated && !isGuest && startupConfig.allowGuestChat !== true) {
        navigate('/login', { replace: true });
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated, isGuest, startupConfig, navigate]);

  return {
    user,
    roles,
    isAuthenticated,
  };
}
