import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import store from '~/store';

/**
 * Deep-link entry to inline build mode: `hanzo.chat/build[?prompt=...]`. Flips the
 * build-mode flag and lands on a fresh chat; the composer auto-fills from
 * `?prompt=` / `?q=` (via useQueryParams). ChatView renders the split chat +
 * preview shell whenever buildMode is on.
 */
export default function BuildRoute() {
  const setBuildMode = useSetRecoilState(store.buildMode);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setBuildMode(true);
  }, [setBuildMode]);

  const qs = searchParams.toString();
  return <Navigate to={`/c/new${qs ? `?${qs}` : ''}`} replace />;
}
