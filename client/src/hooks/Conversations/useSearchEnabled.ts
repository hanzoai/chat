import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useGetSearchEnabledQuery } from '~/data-provider';
import { logger } from '~/utils';
import store from '~/store';

export default function useSearchEnabled(isAuthenticated: boolean) {
  const setSearch = useSetRecoilState(store.search);
  const searchEnabledQuery = useGetSearchEnabledQuery({ enabled: isAuthenticated });

  useEffect(() => {
    // `enabled: null` means "still resolving", and the Nav renders a skeleton for
    // it. A signed-out visitor never runs this query at all, so without this
    // branch the state stays null forever and that skeleton becomes permanent —
    // the empty bordered box in the sidebar. Not-authenticated is a KNOWN answer
    // (no search), not a pending one; say so instead of shimmering indefinitely.
    if (!isAuthenticated) {
      setSearch((prev) => ({ ...prev, enabled: false }));
      return;
    }
    if (searchEnabledQuery.data === true) {
      setSearch((prev) => ({ ...prev, enabled: true }));
    } else if (searchEnabledQuery.data === false) {
      setSearch((prev) => ({ ...prev, enabled: false }));
    } else if (searchEnabledQuery.isError) {
      logger.error('Failed to get search enabled: ', searchEnabledQuery.error);
      setSearch((prev) => ({ ...prev, enabled: false }));
    }
  }, [
    isAuthenticated,
    searchEnabledQuery.data,
    searchEnabledQuery.error,
    searchEnabledQuery.isError,
    setSearch,
  ]);

  return searchEnabledQuery;
}
