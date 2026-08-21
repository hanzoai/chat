import React from 'react';
import { useMessageProcess } from '~/hooks';
import type { TMessageProps } from '~/common';

import MultiMessage from '~/components/Chat/Messages/MultiMessage';
import ContentRender from './ContentRender';
import { TURN_ROW } from '~/common/turn';

const MessageContainer = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="text-token-text-primary w-full border-0 bg-transparent dark:border-0 dark:bg-transparent">
    {children}
  </div>
));

export default function MessageContent(props: TMessageProps) {
  const { conversation, isSubmitting } = useMessageProcess({ message: props.message });
  const { message, currentEditId, setCurrentEditId } = props;

  if (!message || typeof message !== 'object') {
    return null;
  }

  const { children, messageId = null } = message;

  return (
    <>
      <MessageContainer>
        <div className={TURN_ROW}>
          <ContentRender {...props} isSubmitting={isSubmitting} />
        </div>
      </MessageContainer>
      <MultiMessage
        key={messageId}
        messageId={messageId}
        conversation={conversation}
        messagesTree={children ?? []}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
      />
    </>
  );
}
