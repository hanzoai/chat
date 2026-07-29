import { useEffect, useRef } from 'react';
import { useResetAtom } from 'jotai/utils';
import { logger } from '~/utils';
import store from '~/store';

/**
 * Hook to reset visible artifacts when the conversation ID changes
 * @param conversationId - The current conversation ID
 */
export default function useIdChangeEffect(conversationId: string) {
  const lastConvoId = useRef<string | null>(null);
  const resetVisibleArtifacts = useResetAtom(store.visibleArtifacts);

  useEffect(() => {
    if (conversationId !== lastConvoId.current) {
      logger.log('conversation', 'Conversation ID change');
      resetVisibleArtifacts();
    }
    lastConvoId.current = conversationId;
  }, [conversationId, resetVisibleArtifacts]);
}
