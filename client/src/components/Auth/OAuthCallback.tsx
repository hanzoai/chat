/**
 * OAuth Callback Handler for Hanzo IAM (hanzo.id)
 *
 * Flow:
 * 1. User clicks "Sign in" -> redirects to hanzo.id OIDC (via BrowserIamSdk)
 * 2. After auth, hanzo.id redirects back with ?code=xxx&state=yyy
 * 3. BrowserIamSdk.handleCallback() exchanges the code for tokens (PKCE)
 * 4. We set the access token header and redirect to /c/new
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTokenHeader } from 'librechat-data-provider';
import { Spinner } from '@librechat/client';
import { getHanzoIamSdk } from '~/utils/iam';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) {
      return;
    }
    exchangedRef.current = true;

    const iamSdk = getHanzoIamSdk();
    if (!iamSdk) {
      console.error('IAM SDK not configured in callback');
      navigate('/login', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const tokens = await iamSdk.handleCallback();

        if (tokens.access_token) {
          setTokenHeader(tokens.access_token);
        }

        navigate('/c/new', { replace: true });
      } catch (err) {
        console.error('OAuth code exchange failed:', err);
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
