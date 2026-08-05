import { useState, useEffect, useCallback } from 'react';
import { OGDialog, OGDialogTemplate, Button } from '@hanzochat/client';
import { LOGIN_REQUIRED, startHanzoLogin, takePendingLogin, type LoginReason } from '~/utils/login';
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
  // The signed-out preview itself was refused, so there is no anonymous product
  // behind this gate to explain away. Saying so beats what used to happen: the
  // marketing page rendered with no composer and no reason given.
  unavailable: {
    title: 'com_auth_login_unavailable_title',
    message: 'com_auth_login_unavailable_message',
  },
  // Not a refusal. Nothing failed — this is the offer made on arrival, so its
  // copy sells the upgrade rather than explaining a denial, and its dismissal
  // ("keep going signed out") is a real path, not a dead end.
  welcome: {
    title: 'com_auth_login_welcome_title',
    message: 'com_auth_login_welcome_message',
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
  /** A refusal that landed before this mounted is still news. Rendering it consumes it. */
  const [reason, setReason] = useState<LoginReason | null>(takePendingLogin);
  const localize = useLocalize();

  useEffect(() => {
    const handler = (event: Event) => {
      takePendingLogin();
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
        /* The template volunteers a Cancel button unless told not to, and it
           renders BESIDE whatever `buttons` say. That handed every reason below
           a dismissal — including the refusals, which is the one thing the
           comment there rules out — and on the arrival gate it put two controls
           for one idea side by side, "Cancel" next to "Stay logged out", with
           the redundant one taking focus first. This gate names its own exits. */
        showCancelButton={false}
        buttons={
          <>
            {/* Dismissal is only offered for the arrival gate. A refusal has
                nothing behind it to go back to, so closing it there would just
                return the visitor to the thing that already failed. */}
            {reason === 'welcome' && (
              <Button variant="outline" onClick={() => setReason(null)}>
                {localize('com_auth_login_stay_logged_out')}
              </Button>
            )}
            <Button variant="submit" onClick={handleLogin}>
              {localize('com_auth_login_button')}
            </Button>
          </>
        }
      />
    </OGDialog>
  );
}
