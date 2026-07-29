import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import store from '~/store';

/**
 * Hook that provides lazy access to addedConvo without subscribing to changes.
 * Use this to avoid unnecessary re-renders when addedConvo changes.
 */
export default function useGetAddedConvo() {
  return useAtomCallback(useCallback((get) => get(store.conversationByKeySelector(1)), []));
}
