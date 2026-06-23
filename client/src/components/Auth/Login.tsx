import { useEffect, useState } from 'react';
import { ErrorTypes, registerPage } from 'librechat-data-provider';
import { OpenIDIcon, useToastContext } from '@librechat/client';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Login as IamLogin } from '@hanzo/iam/views';
import type { TLoginLayoutContext } from '~/common';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import SocialButton from '~/components/Auth/SocialButton';
import { useAuthContext } from '~/hooks/AuthContext';
import { getLoginError } from '~/utils';
import { getHanzoIamConfig, isStaticIamMode } from '~/utils/iam';
import { useLocalize } from '~/hooks';
import LoginForm from './LoginForm';

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

  // Embedded IAM login (in-app form; no redirect to the IAM-hosted page).
  const iamConfig = getHanzoIamConfig();
  const isStaticMode = isStaticIamMode();

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
  // Embedded IAM login does NOT auto-redirect — the form renders in-app.
  // Only the upstream OpenID provider (non-static mode) auto-redirects.
  const shouldAutoRedirect =
    !isAutoRedirectDisabled &&
    !isStaticMode &&
    startupConfig?.openidLoginEnabled &&
    startupConfig?.openidAutoRedirect &&
    startupConfig?.serverDomain;

  useEffect(() => {
    if (shouldAutoRedirect && startupConfig?.serverDomain) {
      window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
    }
  }, [shouldAutoRedirect, startupConfig]);

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

  // Embedded IAM is only available when the static-mode VITE_* config is built in.
  const hasEmbeddedIam = isStaticMode && iamConfig != null;

  // OpenID is the working fallback whenever the embedded IAM form and the
  // email/password form are both unavailable — guarantees a usable login path
  // (server-proxied /oauth/openid -> hanzo.id) regardless of build-time config.
  const showOpenIDFallback =
    !hasEmbeddedIam &&
    startupConfig?.emailLoginEnabled !== true &&
    startupConfig?.openidLoginEnabled === true &&
    startupConfig?.serverDomain != null;

  return (
    <>
      {error != null && <ErrorMessage>{localize(getLoginError(error))}</ErrorMessage>}

      {/* Embedded Hanzo IAM login — in-app form, stays on hanzo.chat. */}
      {hasEmbeddedIam && iamConfig && (
        <div className="mt-4">
          <IamLogin
            serverUrl={iamConfig.serverUrl}
            clientId={iamConfig.clientId}
            organization={iamConfig.organization}
            redirectUri={iamConfig.redirectUri}
            state=""
          />
        </div>
      )}

      {/* OpenID fallback button (e.g. hanzo.id) when no in-app form is available. */}
      {showOpenIDFallback && startupConfig && (
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
