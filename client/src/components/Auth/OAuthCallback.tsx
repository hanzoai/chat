/**
 * OAuth Callback Handler for Hanzo IAM (hanzo.id)
 *
 * Flow:
 * 1. User clicks "Sign in" → redirects to hanzo.id OIDC
 * 2. After auth, hanzo.id redirects back with ?code=xxx&state=yyy
 * 3. This component exchanges the code via cloud gateway /api/signin
 * 4. Gateway sets session cookie, returns user claims + access token
 * 5. We set the auth context and redirect to /c/new
 */
import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setTokenHeader, dataService } from 'librechat-data-provider';
import { Spinner } from '@librechat/client';
import { useAuthContext } from '~/hooks/AuthContext';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) {
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      console.error('Missing code or state in OAuth callback');
      navigate('/login', { replace: true });
      return;
    }

    exchangedRef.current = true;

    // Exchange code for session via cloud gateway
    const exchangeCode = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_HANZO_API_URL || ''}/api/signin?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (!response.ok) {
          throw new Error(`Signin failed: ${response.status}`);
        }

        const body = await response.json();
        const claims = body.status === 'ok' ? body.data : body;

        // Set the access token if present
        if (claims?.accessToken || claims?.AccessToken) {
          const token = claims.accessToken || claims.AccessToken;
          setTokenHeader(token);
        }

        // Navigate to chat
        navigate('/c/new', { replace: true });
      } catch (err) {
        console.error('OAuth code exchange failed:', err);
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    exchangeCode();
  }, [searchParams, navigate, login]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto mb-4 h-8 w-8" />
        <p className="text-text-secondary">Signing in...</p>
      </div>
    </div>
  );
}
