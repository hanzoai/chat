/**
 * OAuth Callback Handler for Hanzo IAM (hanzo.id) — the @hanzo/iam session-bridge.
 *
 * Flow:
 * 1. User clicks "Log in with Hanzo" -> @hanzo/iam redirects to hanzo.id (PKCE).
 * 2. hanzo.id redirects back here with ?code=xxx&state=yyy.
 * 3. IAM.handleCallback() exchanges the code for the IAM tokens (PKCE).
 * 4. We POST { accessToken, idToken } to the backend session-bridge
 *    (/v1/chat/auth/iam/session), which JWKS-validates the token, reconciles the user,
 *    and issues the Chat session (refresh cookie + Mongo Session + Chat JWT) plus
 *    persists the id_token server-side for on-behalf-of cloud calls.
 * 5. We set the returned Chat JWT as the app bearer and redirect to /c/new.
 *
 * The IAM token is never used as the app bearer — the JWKS-issued Chat JWT is;
 * the id_token stays server-side for OBO.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { request, iamSession } from '@hanzochat/data-provider';
import { Spinner } from '@hanzochat/client';
import { getHanzoIamSdk } from '~/utils/iam';
import { meansNoSession } from '~/utils/sso';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) {
      return;
    }
    exchangedRef.current = true;

    /**
     * "Nobody is signed in" is an ANSWER, not a failure.
     *
     * The silent probe (`utils/sso.ts`) asks the issuer `prompt=none`, and the
     * issuer replies here with `error=login_required` when this browser has no
     * session. That is the expected reply for the visitor the anonymous preview
     * exists to serve — so it goes back to the product, quietly. Treating it as a
     * broken login would put a login screen in front of every first-time visitor,
     * which is exactly the guest experience the probe is built to preserve.
     */
    const answered = new URLSearchParams(window.location.search).get('error');
    if (meansNoSession(answered)) {
      navigate('/c/new', { replace: true });
      return;
    }

    const iamSdk = getHanzoIamSdk();
    if (!iamSdk) {
      console.error('IAM SDK not configured in callback');
      navigate('/login', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const tokens = await iamSdk.handleCallback();

        /** Trade the IAM token for a Chat session via the backend bridge. */
        const { token } = await request.post(iamSession(), {
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
        });

        if (!token) {
          throw new Error('session bridge returned no token');
        }

        /**
         * Set the Chat JWT as the app bearer and notify AuthContext (which then
         * fetches the user). The refresh cookie the bridge set drives reload
         * persistence via the silent-refresh path.
         */
        request.dispatchTokenUpdatedEvent(token);

        navigate('/c/new', { replace: true });
      } catch (err) {
        console.error('IAM session bridge failed:', err);
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    exchangeCode();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto mb-4 h-8 w-8" />
        <p className="text-text-secondary">Signing in...</p>
      </div>
    </div>
  );
}
