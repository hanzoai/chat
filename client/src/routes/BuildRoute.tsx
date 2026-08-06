import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { buildAppUrl } from '~/utils';

/**
 * Deep-link handoff: `hanzo.chat/build[?prompt=...]` sends the visitor to the
 * hanzo.app builder — chat's sibling product for building apps. The build
 * experience lives entirely at hanzo.app (one destination, same as the composer
 * button, the `/build` command, and the starter chip); chat stays the chat
 * product. `?prompt=` / `?q=` seed the builder. We render a chat redirect as a
 * fallback in case the external navigation is blocked.
 */
export default function BuildRoute() {
  const [searchParams] = useSearchParams();
  const prompt = searchParams.get('prompt') ?? searchParams.get('q') ?? '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace(buildAppUrl(prompt));
    }
  }, [prompt]);

  return <Navigate to="/" replace />;
}
