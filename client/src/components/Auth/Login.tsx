import { useEffect, useState } from 'react';
import { ErrorTypes, registerPage } from 'librechat-data-provider';
import { OpenIDIcon, useToastContext } from '@librechat/client';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { TLoginLayoutContext } from '~/common';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import SocialButton from '~/components/Auth/SocialButton';
import { useAuthContext } from '~/hooks/AuthContext';
import { getLoginError } from '~/utils';
import { useLocalize } from '~/hooks';
import LoginForm from './LoginForm';

/**
 * Build Hanzo IAM OIDC authorize URL from env vars.
 * Used in static SPA mode when VITE_HANZO_IAM_URL is set.
 */
function getHanzoIamUrl(): string | null {
  const iamUrl = import.meta.env.VITE_HANZO_IAM_URL;
  const appId = import.meta.env.VITE_HANZO_IAM_APP;
  const org = import.meta.env.VITE_HANZO_IAM_ORG;

  if (!iamUrl || !appId) {
    return null;
  }

  const redirectUri = `${window.location.origin}/auth/callback`;
  const state = `hanzo-chat-${Date.now()}`;

  // Store state for CSRF verification
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: 'openid profile email',
  });

  return `${iamUrl}/oauth/authorize?${params.toString()}`;
}

function Login() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { error, setError, login } = useAuthContext();
  const { startupConfig } = useOutletContext<TLoginLayoutContext>();

  const [searchParams, setSearchParams] = useSearchParams();
  // Determine if auto-redirect should be disabled based on the URL parameter
  const disableAutoRedirect = searchParams.get('redirect') === 'false';

  // Persist the disable flag locally so that once detected, auto-redirect stays disabled.
  const [isAutoRedirectDisabled, setIsAutoRedirectDisabled] = useState(disableAutoRedirect);

  // Check if we're in static/IAM mode
  const hanzoIamUrl = getHanzoIamUrl();
  const isStaticMode = !!import.meta.env.VITE_HANZO_API_URL;

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

  // Once the disable flag is detected, update local state and remove the parameter from the URL.
  useEffect(() => {
    if (disableAutoRedirect) {
      setIsAutoRedirectDisabled(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('redirect');
      setSearchParams(newParams, { replace: true });
    }
  }, [disableAutoRedirect, searchParams, setSearchParams]);

  // Determine whether we should auto-redirect to OpenID or Hanzo IAM
  const shouldAutoRedirect =
    !isAutoRedirectDisabled &&
    ((startupConfig?.openidLoginEnabled &&
      startupConfig?.openidAutoRedirect &&
      startupConfig?.serverDomain) ||
      (isStaticMode && hanzoIamUrl));

  useEffect(() => {
    if (shouldAutoRedirect) {
      if (isStaticMode && hanzoIamUrl) {
        console.log('Auto-redirecting to Hanzo IAM...');
        window.location.href = hanzoIamUrl;
      } else if (startupConfig?.serverDomain) {
        console.log('Auto-redirecting to OpenID provider...');
        window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
      }
    }
  }, [shouldAutoRedirect, startupConfig, isStaticMode, hanzoIamUrl]);

  // Render fallback UI if auto-redirect is active.
  if (shouldAutoRedirect) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">
          {isStaticMode
            ? 'Redirecting to Hanzo...'
            : localize('com_ui_redirecting_to_provider', { 0: startupConfig?.openidLabel })}
        </p>
        {!isStaticMode && startupConfig && (
          <div className="mt-4">
            <SocialButton
              key="openid"
              enabled={startupConfig.openidLoginEnabled}
              serverDomain={startupConfig.serverDomain}
              oauthPath="openid"
              Icon={() =>
                startupConfig.openidImageUrl ? (
                  <img src={startupConfig.openidImageUrl} alt="OpenID Logo" className="h-5 w-5" />
                ) : (
                  <OpenIDIcon />
                )
              }
              label={startupConfig.openidLabel}
              id="openid"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {error != null && <ErrorMessage>{localize(getLoginError(error))}</ErrorMessage>}

      {/* Hanzo IAM button (static mode) */}
      {isStaticMode && hanzoIamUrl && (
        <div className="mt-4">
          <a
            href={hanzoIamUrl}
            className="flex w-full items-center justify-center space-x-3 rounded-2xl border border-border-light bg-surface-primary px-5 py-3 text-text-primary transition-colors duration-200 hover:bg-surface-tertiary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <p>Sign in with Hanzo</p>
          </a>
        </div>
      )}

      {/* Email/password form (non-static mode or as fallback) */}
      {startupConfig?.emailLoginEnabled === true && !isStaticMode && (
        <LoginForm
          onSubmit={login}
          startupConfig={startupConfig}
          error={error}
          setError={setError}
        />
      )}
      {startupConfig?.registrationEnabled === true && !isStaticMode && (
        <p className="my-4 text-center text-sm font-light text-gray-700 dark:text-white">
          {' '}
          {localize('com_auth_no_account')}{' '}
          <a
            href={registerPage()}
            className="inline-flex p-1 text-sm font-medium text-green-600 underline decoration-transparent transition-all duration-200 hover:text-green-700 hover:decoration-green-700 focus:text-green-700 focus:decoration-green-700 dark:text-green-500 dark:hover:text-green-400 dark:hover:decoration-green-400 dark:focus:text-green-400 dark:focus:decoration-green-400"
          >
            {localize('com_auth_sign_up')}
          </a>
        </p>
      )}
    </>
  );
}

export default Login;
