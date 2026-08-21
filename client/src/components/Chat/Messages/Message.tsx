import React from 'react';
import { useMessageProcess } from '~/hooks';
import type { TMessageProps } from '~/common';
import MessageRender from './ui/MessageRender';
import { TURN_ROW } from '~/common/turn';
import MultiMessage from './MultiMessage';

const MessageContainer = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="text-token-text-primary w-full border-0 bg-transparent dark:border-0 dark:bg-transparent">
    {children}
  </div>
));

export default function Message(props: TMessageProps) {
  const { conversation } = useMessageProcess({ message: props.message });
  const { message, currentEditId, setCurrentEditId } = props;

  if (!message || typeof message !== 'object') {
    return null;
  }

  const { children, messageId = null } = message;

  return (
    <>
      <MessageContainer>
        <div className={TURN_ROW}>
          <MessageRender {...props} />
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
