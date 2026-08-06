import { useState, useEffect, useRef, useCallback } from 'react';
import { useToastContext } from '@hanzochat/client';
import { useUpdateConversationMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { logger } from '~/utils';

/**
 * Inline-rename state for one conversation: the draft title, whether the row is
 * in edit mode, and the write.
 *
 * Both surfaces that rename — the sidebar row and the Chats and tasks pane —
 * drive `RenameForm` from this, so "what a rename does" (trim, fall back to
 * Untitled, toast on failure, restore the old title) is stated once.
 */
export default function useConvoRename(conversationId: string | null, title: string | null) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const mutation = useUpdateConversationMutation(conversationId ?? '');

  const [titleInput, setTitleInput] = useState(title ?? '');
  const [renaming, setRenaming] = useState(false);
  const previousTitle = useRef(title);

  useEffect(() => {
    if (title !== previousTitle.current) {
      setTitleInput(title ?? '');
      previousTitle.current = title;
    }
  }, [title]);

  const startRename = useCallback(() => {
    setTitleInput(title ?? '');
    setRenaming(true);
  }, [title]);

  const cancelRename = useCallback(() => {
    setTitleInput(title ?? '');
    setRenaming(false);
  }, [title]);

  const submitRename = useCallback(
    async (newTitle: string) => {
      if (!conversationId || newTitle === title) {
        setRenaming(false);
        return;
      }
      try {
        await mutation.mutateAsync({
          conversationId,
          title: newTitle.trim() || localize('com_ui_untitled'),
        });
      } catch (error) {
        logger.error('Error renaming conversation', error);
        setTitleInput(title ?? '');
        showToast({
          message: localize('com_ui_rename_failed'),
          severity: NotificationSeverity.ERROR,
          showIcon: true,
        });
      } finally {
        setRenaming(false);
      }
    },
    [conversationId, title, mutation, localize, showToast],
  );

  return { titleInput, setTitleInput, renaming, startRename, cancelRename, submitRename };
}
