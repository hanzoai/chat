import { useState, useEffect, useCallback } from 'react';
import { OGDialog, OGDialogTemplate, Button } from '@librechat/client';
import { getHanzoIamSdk, isStaticIamMode } from '~/utils/iam';
import { useGetStartupConfig } from '~/data-provider';
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
  const { data: startupConfig } = useGetStartupConfig();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('guestLimitReached', handler);
    return () => window.removeEventListener('guestLimitReached', handler);
  }, []);

  const handleLogin = useCallback(() => {
    const iamSdk = getHanzoIamSdk();
    if (isStaticIamMode() && iamSdk) {
      iamSdk.signinRedirect();
      return;
    }
    if (startupConfig?.openidLoginEnabled && startupConfig?.serverDomain) {
      window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
      return;
    }
    window.location.href = '/login';
  }, [startupConfig]);

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
