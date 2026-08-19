import { useEffect, useState, useCallback } from 'react';
import { ErrorTypes } from '@hanzochat/data-provider';
import { useToastContext } from '@hanzochat/client';
import { useSearchParams } from 'react-router-dom';
import { getHanzoIamSdk, IAM_PROVIDER_NAME } from '~/utils/iam';
import { useLocalize } from '~/hooks';

/**
 * Login — the single Hanzo IAM path.
 *
 * Renders one "Log in with Hanzo" action that starts the @hanzo/iam
 * redirect-PKCE authorize flow. IAM owns every credential step; the
 * `/auth/callback` route completes the token exchange. Auto-redirects
 * to IAM on mount unless `?redirect=false` is present.
 */
function Login() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const disableAutoRedirect = searchParams.get('redirect') === 'false';
  const [isAutoRedirectDisabled, setIsAutoRedirectDisabled] = useState(disableAutoRedirect);

  const handleIamLogin = useCallback(() => {
    getHanzoIamSdk().signinRedirect();
  }, []);

  useEffect(() => {
    const oauthError = searchParams?.get('error');
    if (oauthError && oauthError === ErrorTypes.AUTH_FAILED) {
      showToast({
        message: localize('com_auth_error_oauth_failed'),
        status: 'error',
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, localize]);

  useEffect(() => {
    if (disableAutoRedirect) {
      setIsAutoRedirectDisabled(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('redirect');
      setSearchParams(newParams, { replace: true });
    }
  }, [disableAutoRedirect, searchParams, setSearchParams]);

  const hasError = !!searchParams?.get('error');
  const shouldAutoRedirect = !isAutoRedirectDisabled && !hasError;

  useEffect(() => {
    if (shouldAutoRedirect) {
      getHanzoIamSdk().signinRedirect();
    }
  }, [shouldAutoRedirect]);

  if (shouldAutoRedirect) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">
          {localize('com_ui_redirecting_to_provider', { 0: IAM_PROVIDER_NAME })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-label="Log in with Hanzo"
        onClick={handleIamLogin}
        className="flex w-full items-center justify-center space-x-3 rounded-2xl border border-border-light bg-surface-primary px-5 py-3 text-text-primary transition-colors duration-200 hover:bg-surface-tertiary"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <p>Log in with Hanzo</p>
      </button>
    </div>
  );
}

export default Login;
