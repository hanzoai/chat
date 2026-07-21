import { useState, useEffect, useCallback } from 'react';
import { OGDialog, OGDialogTemplate, Button } from '@hanzochat/client';
import { getHanzoIamSdk } from '~/utils/iam';
import { useLocalize } from '~/hooks';

/**
 * Login gate shown when an anonymous guest exhausts the free message quota.
 * Reuses the existing OpenID / Hanzo IAM login flow — it does not implement a
 * new login. Listens for the `guestLimitReached` window event dispatched by the
 * chat submission path on a `402 { type: 'GUEST_LIMIT' }` response.
 */
export default function GuestLimitDialog() {
  const [open, setOpen] = useState(false);
  const localize = useLocalize();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('guestLimitReached', handler);
    return () => window.removeEventListener('guestLimitReached', handler);
  }, []);

  const handleLogin = useCallback(() => {
    getHanzoIamSdk().signinRedirect();
  }, []);

  return (
    <OGDialog open={open} onOpenChange={setOpen}>
      <OGDialogTemplate
        title={localize('com_auth_guest_limit_title')}
        className="max-w-md"
        main={
          <div className="text-sm text-text-secondary">
            {localize('com_auth_guest_limit_message')}
          </div>
        }
        buttons={
          <Button variant="submit" onClick={handleLogin}>
            {localize('com_auth_guest_limit_login')}
          </Button>
        }
      />
    </OGDialog>
  );
}
