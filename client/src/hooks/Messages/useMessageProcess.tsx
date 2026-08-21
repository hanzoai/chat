import { Constants } from '@hanzochat/data-provider';
import { useEffect, useRef, useMemo } from 'react';
import type { TMessage } from '@hanzochat/data-provider';
import { getTextKey, TEXT_KEY_DIVIDER, logger } from '~/utils';
import { useMessagesViewContext } from '~/Providers';

export default function useMessageProcess({ message }: { message?: TMessage | null }) {
  const latestText = useRef<string | number>('');
  const hasNoChildren = useMemo(() => (message?.children?.length ?? 0) === 0, [message]);

  const { conversation, setLatestMessage, isSubmitting } = useMessagesViewContext();

  useEffect(() => {
    const convoId = conversation?.conversationId;
    if (convoId === Constants.NEW_CONVO) {
      return;
    }
    if (!message) {
      return;
    }
    if (!hasNoChildren) {
      return;
    }

    const textKey = getTextKey(message, convoId);

    // Check for text/conversation change
    const logInfo = {
      textKey,
      'latestText.current': latestText.current,
      messageId: message.messageId,
      convoId,
    };

    /* Extracted convoId from previous textKey (format: messageId|||length|||lastChars|||convoId) */
    let previousConvoId: string | null = null;
    if (
      latestText.current &&
      typeof latestText.current === 'string' &&
      latestText.current.length > 0
    ) {
      const parts = latestText.current.split(TEXT_KEY_DIVIDER);
      previousConvoId = parts[parts.length - 1] || null;
    }

    if (
      textKey !== latestText.current ||
      (convoId != null && previousConvoId != null && convoId !== previousConvoId)
    ) {
      logger.log('latest_message', '[useMessageProcess] Setting latest message; logInfo:', logInfo);
      latestText.current = textKey;
      setLatestMessage({ ...message });
    } else {
      logger.log('latest_message', 'No change in latest message; logInfo', logInfo);
    }
  }, [hasNoChildren, message, setLatestMessage, conversation?.conversationId]);

  return {
    isSubmitting,
    conversation,
  };
}
