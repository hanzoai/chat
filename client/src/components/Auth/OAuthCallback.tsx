/**
 * Where a sign-in lands on the way back from Hanzo IAM (hanzo.id).
 *
 * 1. "Log in with Hanzo" hands the browser to hanzo.id (Authorization Code + PKCE).
 * 2. hanzo.id returns here with ?code=xxx&state=yyy.
 * 3. `IAM#handleCallback()` verifies state, spends the code, and stores the tokens.
 * 4. The access token becomes the app bearer.
 *
 * There is no fourth party and no exchange: the token IAM just issued is the one
 * every request carries and the one the server verifies against IAM's JWKS.
 * Trading it for a second, app-issued token would put a credential of our own
 * back in the middle of a flow whose whole point is that IAM owns the session.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '@hanzochat/data-provider';
import { Spinner } from '@hanzochat/client';
import { getHanzoIamSdk } from '~/utils/iam';
import { getPostLoginRedirect } from '~/utils/redirect';
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
     * Where the visitor was before the round trip. The silent probe records the
     * deep link it is about to navigate away from, so someone who arrived at
     * `/?q=…&submit=true` — hanzo.ai's composer handing over a prompt — is
     * returned to that URL rather than to a bare `/`, where the params it carried
     * would simply be gone. Reading it consumes it, so it is spent on this
     * landing and cannot replay on the next one.
     */
    const back = getPostLoginRedirect(new URLSearchParams(window.location.search)) ?? '/';

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
      navigate(back, { replace: true });
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
        if (!tokens.accessToken) {
          throw new Error('IAM returned no access token');
        }

        /**
         * Install the bearer and tell AuthContext, which then reads the user.
         * The SDK has already stored the tokens, so a reload asks it again
         * rather than asking this server for a session it does not keep.
         */
        request.dispatchTokenUpdatedEvent(tokens.accessToken);

        navigate(back, { replace: true });
      } catch (err) {
        console.error('IAM sign-in failed:', err);
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
