import { useCallback, useMemo, memo } from 'react';
import { type TMessage } from '@hanzochat/data-provider';
import type { TMessageProps } from '~/common';
import MessageContent from '~/components/Chat/Messages/Content/MessageContent';
import { useLocalize, useMessageActions, useContentMetadata } from '~/hooks';
import Turn from '~/components/Messages/Turn';
import SiblingSwitch from '../SiblingSwitch';
import HoverButtons from '../HoverButtons';
import { MessageContext } from '~/Providers';
import { getMessageAriaLabel } from '~/utils';
import SubRow from '../SubRow';

type MessageRenderProps = {
  message?: TMessage;
  isSubmitting?: boolean;
} & Pick<
  TMessageProps,
  'currentEditId' | 'setCurrentEditId' | 'siblingIdx' | 'setSiblingIdx' | 'siblingCount'
>;

/**
 * A turn whose body is a plain `text` string.
 *
 * Nothing this app writes takes this path — every completion comes back as a
 * content array — but conversations stored before that do, so it renders them.
 * The frame is `Turn`; only the body differs from `ContentRender`.
 */
const MessageRender = memo(
  ({
    message: msg,
    siblingIdx,
    siblingCount,
    setSiblingIdx,
    currentEditId,
    setCurrentEditId,
    isSubmitting = false,
  }: MessageRenderProps) => {
    const localize = useLocalize();
    const {
      ask,
      edit,
      index,
      enterEdit,
      conversation,
      latestMessage,
      handleContinue,
      handleFeedback,
      copyToClipboard,
      regenerateMessage,
    } = useMessageActions({ message: msg, currentEditId, setCurrentEditId });

    const handleRegenerateMessage = useCallback(() => regenerateMessage(), [regenerateMessage]);
    const hasNoChildren = !(msg?.children?.length ?? 0);
    const isLast = useMemo(
      () => hasNoChildren && (msg?.depth === latestMessage?.depth || msg?.depth === -1),
      [hasNoChildren, msg?.depth, latestMessage?.depth],
    );
    const isLatestMessage = msg?.messageId === latestMessage?.messageId;
    /** Only pass isSubmitting to the latest message to prevent unnecessary re-renders */
    const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;

    const { hasParallelContent } = useContentMetadata(msg);

    if (!msg) {
      return null;
    }

    return (
      <Turn
        id={msg.messageId}
        role={msg.isCreatedByUser === true ? 'user' : 'assistant'}
        label={getMessageAriaLabel(msg, localize)}
        wide={hasParallelContent}
        busy={hasNoChildren && effectiveIsSubmitting}
        actions={
          <SubRow classes="text-xs" pinned={isLast}>
            <SiblingSwitch
              siblingIdx={siblingIdx}
              siblingCount={siblingCount}
              setSiblingIdx={setSiblingIdx}
            />
            <HoverButtons
              index={index}
              isEditing={edit}
              message={msg}
              enterEdit={enterEdit}
              isSubmitting={isSubmitting}
              conversation={conversation ?? null}
              regenerate={handleRegenerateMessage}
              copyToClipboard={copyToClipboard}
              handleContinue={handleContinue}
              latestMessage={latestMessage}
              handleFeedback={handleFeedback}
              isLast={isLast}
            />
          </SubRow>
        }
      >
        <MessageContext.Provider
          value={{
            messageId: msg.messageId,
            conversationId: conversation?.conversationId,
            isExpanded: false,
            isSubmitting: effectiveIsSubmitting,
            isLatestMessage,
          }}
        >
          <MessageContent
            ask={ask}
            edit={edit}
            isLast={isLast}
            text={msg.text || ''}
            message={msg}
            enterEdit={enterEdit}
            error={!!(msg.error ?? false)}
            isSubmitting={effectiveIsSubmitting}
            unfinished={msg.unfinished ?? false}
            isCreatedByUser={msg.isCreatedByUser ?? true}
            siblingIdx={siblingIdx ?? 0}
            setSiblingIdx={setSiblingIdx ?? (() => ({}))}
          />
        </MessageContext.Provider>
      </Turn>
    );
  },
);

export default MessageRender;
