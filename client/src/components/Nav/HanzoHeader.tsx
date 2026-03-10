/**
 * Unified Hanzo header bar for cross-app navigation.
 * Uses @hanzo/ui/navigation HanzoHeader with Chat-specific config.
 */
import React, { useCallback } from 'react';
import { useAuthContext } from '~/hooks';

// Use require() to bypass Vite CJS static analysis for @hanzo/ui
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _nav = (() => {
  try {
    return require('@hanzo/ui/navigation');
  } catch {
    return null;
  }
})();

const HanzoHeaderComponent: React.FC<Record<string, unknown>> | null = _nav?.HanzoHeader ?? null;

export default function ChatHanzoHeader() {
  const { user, logout } = useAuthContext();

  const handleSignOut = useCallback(() => {
    logout('/login?redirect=false');
  }, [logout]);

  if (!HanzoHeaderComponent) return null;

  return (
    <HanzoHeaderComponent
      currentApp="Chat"
      currentAppId="chat"
      user={
        user
          ? {
              id: user.id,
              name: user.name ?? user.username,
              email: user.email,
              avatar: user.avatar,
            }
          : undefined
      }
      onSignOut={handleSignOut}
    />
  );
}
