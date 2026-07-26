import { useState, useEffect, useCallback } from 'react';
import { OGDialog, OGDialogTemplate, Button } from '@hanzochat/client';
import { LOGIN_REQUIRED, startHanzoLogin, type LoginReason } from '~/utils/login';
import { useLocalize, type TranslationKeys } from '~/hooks';

/** Copy per reason the gate opened. */
const copy: Record<LoginReason, { title: TranslationKeys; message: TranslationKeys }> = {
  limit: {
    title: 'com_auth_login_limit_title',
    message: 'com_auth_login_limit_message',
  },
  anonymous: {
    title: 'com_auth_login_anonymous_title',
    message: 'com_auth_login_anonymous_message',
  },
};

/**
 * The ONE login gate for a visitor who is not signed in. It stands in for the
 * raw server error a refused chat request would otherwise render as a reply, and
 * offers the existing OpenID / Hanzo IAM login — it does not implement a new one.
 *
 * Opens on the `loginRequired` window event (see `requireLogin`), dispatched by
 * the chat submission path on a `402 { type: 'GUEST_LIMIT' }` (free preview quota
 * spent) or a `401` (not signed in).
 */
export default function LoginGate() {
  const [reason, setReason] = useState<LoginReason | null>(null);
  const localize = useLocalize();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: LoginReason }>).detail;
      setReason(detail?.reason ?? 'anonymous');
    };
    window.addEventListener(LOGIN_REQUIRED, handler);
    return () => window.removeEventListener(LOGIN_REQUIRED, handler);
  }, []);

  const handleLogin = useCallback(() => {
    startHanzoLogin();
  }, []);

  const { title, message } = copy[reason ?? 'anonymous'];

  return (
    <OGDialog open={reason !== null} onOpenChange={(open) => !open && setReason(null)}>
      <OGDialogTemplate
        title={localize(title)}
        className="max-w-md"
        main={<div className="text-sm text-text-secondary">{localize(message)}</div>}
        buttons={
          <Button variant="submit" onClick={handleLogin}>
            {localize('com_auth_login_button')}
          </Button>
        }
      />
    </OGDialog>
  );
}
