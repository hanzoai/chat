import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import type { TConversation } from '@hanzochat/data-provider';
import store from '~/store';

export default function useGetConversation(index: string | number = 0) {
  return useAtomCallback(
    useCallback(
      (get) => get(store.conversationByKeySelector(index)) as TConversation | null,
      [index],
    ),
  );
}
