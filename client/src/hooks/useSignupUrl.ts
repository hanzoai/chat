import { useEffect, useState } from 'react';
import { IAM_SIGNUP_URL, signupUrl } from '~/utils/iam';

/**
 * Where the Sign up link points.
 *
 * The issuer's registration address is known at once, so the link is real from
 * the first paint; the authorize request it carries is minted asynchronously
 * (the SDK stores a one-shot PKCE verifier per attempt) and lands on the href
 * when it is ready. Both forms reach the same screen — the request is what
 * brings the new account back here holding a code.
 */
export default function useSignupUrl(): string {
  const [href, setHref] = useState(IAM_SIGNUP_URL);

  useEffect(() => {
    let live = true;
    void signupUrl()
      .then((url) => {
        if (live) {
          setHref(url);
        }
      })
      .catch(() => {
        /* The plain address still registers an account; only the trip back is
           longer, because the issuer answers it with a sign-in of its own. */
      });
    return () => {
      live = false;
    };
  }, []);

  return href;
}
