import { useCallback } from 'react';
import { useToastContext } from '@hanzochat/client';
import { useUpdateConversationMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { logger } from '~/utils';

/**
 * The one writer of a conversation's pinned state.
 *
 * `isPinned` is a persisted conversation flag, written through the same
 * `POST /v1/chat/convos/update` that carries a rename — one route for a
 * conversation's own metadata. The id is an argument rather than a hook
 * parameter so a single instance serves one row's menu or a multi-select
 * batch without a second code path.
 */
export default function useConvoPin() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const mutation = useUpdateConversationMutation('');

  const setPinned = useCallback(
    async (conversationId: string | null, isPinned: boolean) => {
      if (!conversationId) {
        return;
      }
      try {
        await mutation.mutateAsync({ conversationId, isPinned });
      } catch (error) {
        logger.error('Error pinning conversation', error);
        showToast({
          message: localize('com_ui_error'),
          severity: NotificationSeverity.ERROR,
          showIcon: true,
        });
      }
    },
    [mutation, showToast, localize],
  );

  return { setPinned, isPinning: mutation.isLoading };
}
