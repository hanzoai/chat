import { useCallback, useMemo, memo } from 'react';
import type { TMessage, TMessageContentParts } from '@hanzochat/data-provider';
import type { TMessageProps } from '~/common';
import { useAttachments, useLocalize, useMessageActions, useContentMetadata } from '~/hooks';
import ContentParts from '~/components/Chat/Messages/Content/ContentParts';
import SiblingSwitch from '~/components/Chat/Messages/SiblingSwitch';
import HoverButtons from '~/components/Chat/Messages/HoverButtons';
import SubRow from '~/components/Chat/Messages/SubRow';
import { getMessageAriaLabel } from '~/utils';
import Turn from './Turn';

type ContentRenderProps = {
  message?: TMessage;
  isSubmitting?: boolean;
} & Pick<
  TMessageProps,
  'currentEditId' | 'setCurrentEditId' | 'siblingIdx' | 'setSiblingIdx' | 'siblingCount'
>;

/**
 * A turn whose body is a content array — every turn this app serves, since all
 * chat goes through the agents framework.
 *
 * It carries the body and nothing else; `Turn` is the frame.
 */
const ContentRender = memo(
  ({
    message: msg,
    siblingIdx,
    siblingCount,
    setSiblingIdx,
    currentEditId,
    setCurrentEditId,
    isSubmitting = false,
  }: ContentRenderProps) => {
    const localize = useLocalize();
    const { attachments, searchResults } = useAttachments({
      messageId: msg?.messageId,
      attachments: msg?.attachments,
    });
    const {
      edit,
      index,
      enterEdit,
      conversation,
      latestMessage,
      handleContinue,
      handleFeedback,
      copyToClipboard,
      regenerateMessage,
    } = useMessageActions({
      message: msg,
      searchResults,
      currentEditId,
      setCurrentEditId,
    });

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
              message={msg}
              isEditing={edit}
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
        <ContentParts
          edit={edit}
          isLast={isLast}
          enterEdit={enterEdit}
          siblingIdx={siblingIdx}
          messageId={msg.messageId}
          attachments={attachments}
          searchResults={searchResults}
          setSiblingIdx={setSiblingIdx}
          isLatestMessage={isLatestMessage}
          isSubmitting={effectiveIsSubmitting}
          isCreatedByUser={msg.isCreatedByUser}
          conversationId={conversation?.conversationId}
          content={msg.content as Array<TMessageContentParts | undefined>}
        />
      </Turn>
    );
  },
);

export default ContentRender;
