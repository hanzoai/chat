import React, { useCallback, useMemo, memo } from 'react';
import { useAtomValue } from 'jotai';
import { type TMessage } from '@hanzochat/data-provider';
import type { TMessageProps, TMessageIcon } from '~/common';
import MessageContent from '~/components/Chat/Messages/Content/MessageContent';
import PlaceholderRow from '~/components/Chat/Messages/ui/PlaceholderRow';
import SiblingSwitch from '~/components/Chat/Messages/SiblingSwitch';
import HoverButtons from '~/components/Chat/Messages/HoverButtons';
import MessageIcon from '~/components/Chat/Messages/MessageIcon';
import { useLocalize, useMessageActions, useContentMetadata } from '~/hooks';
import SubRow from '~/components/Chat/Messages/SubRow';
import { cn, getMessageAriaLabel, SMART_ROUTING_MODEL } from '~/utils';
import { fontSizeAtom } from '~/store/fontSize';
import { MessageContext } from '~/Providers';
import store from '~/store';
import { USER_TURN, chatWidth, turnColumn } from '~/common/turn';

type MessageRenderProps = {
  message?: TMessage;
  isSubmitting?: boolean;
} & Pick<
  TMessageProps,
  'currentEditId' | 'setCurrentEditId' | 'siblingIdx' | 'setSiblingIdx' | 'siblingCount'
>;

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
      agent,
      assistant,
      enterEdit,
      conversation,
      messageLabel,
      latestMessage,
      handleFeedback,
      handleContinue,
      copyToClipboard,
      regenerateMessage,
    } = useMessageActions({
      message: msg,
      currentEditId,
      setCurrentEditId,
    });
    const fontSize = useAtomValue(fontSizeAtom);
    const maximizeChatSpace = useAtomValue(store.maximizeChatSpace);

    const handleRegenerateMessage = useCallback(() => regenerateMessage(), [regenerateMessage]);
    const hasNoChildren = !(msg?.children?.length ?? 0);
    const isLast = useMemo(
      () => hasNoChildren && (msg?.depth === latestMessage?.depth || msg?.depth === -1),
      [hasNoChildren, msg?.depth, latestMessage?.depth],
    );
    const isLatestMessage = msg?.messageId === latestMessage?.messageId;
    /** Only pass isSubmitting to the latest message to prevent unnecessary re-renders */
    const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;

    const iconData: TMessageIcon = useMemo(
      () => ({
        endpoint: msg?.endpoint ?? conversation?.endpoint,
        model: msg?.model ?? conversation?.model,
        iconURL: msg?.iconURL,
        modelLabel: messageLabel,
        isCreatedByUser: msg?.isCreatedByUser,
      }),
      [
        messageLabel,
        conversation?.endpoint,
        conversation?.model,
        msg?.model,
        msg?.iconURL,
        msg?.endpoint,
        msg?.isCreatedByUser,
      ],
    );

    /**
     * When smart routing served this conversation (`model === 'auto'`), the
     * response echoes the model that actually ran in `msg.model`. Surface it so
     * the user sees which model handled their prompt.
     */
    const routedModel = useMemo(() => {
      if (msg?.isCreatedByUser === true || conversation?.model !== SMART_ROUTING_MODEL) {
        return null;
      }
      const served = msg?.model;
      if (!served || served === SMART_ROUTING_MODEL) {
        return null;
      }
      return served;
    }, [msg?.isCreatedByUser, msg?.model, conversation?.model]);

    const { hasParallelContent } = useContentMetadata(msg);

    if (!msg) {
      return null;
    }


    const baseClasses = {
      common: 'group mx-auto flex flex-1 gap-3 transition-all duration-300 transform-gpu ',
      chat: chatWidth({ maximize: maximizeChatSpace, parallel: hasParallelContent }),
    };

    const conditionalClasses = {
      focus: 'focus:outline-none focus:ring-2 focus:ring-border-xheavy',
    };

    return (
      <div
        id={msg.messageId}
        aria-label={getMessageAriaLabel(msg, localize)}
        className={cn(
          baseClasses.common,
          baseClasses.chat,
          conditionalClasses.focus,
          'message-render',
        )}
      >
        {/* No avatar, no sender name, no routed-model tag (owner call): the
            user's turn is a glass bubble on the right, the reply plain and full
            width — the contrast is what says who is speaking. */}
        <div
          className={cn(
            'relative flex w-full flex-col',
            msg.isCreatedByUser ? 'user-turn' : 'agent-turn',
          )}
        >
          <div className={turnColumn(msg.isCreatedByUser)}>
            <div
              className={cn(
                'flex max-w-full flex-grow flex-col gap-0',
                msg.isCreatedByUser && USER_TURN,
              )}
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
            </div>
            {hasNoChildren && effectiveIsSubmitting ? (
              <PlaceholderRow />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    );
  },
);

export default MessageRender;
