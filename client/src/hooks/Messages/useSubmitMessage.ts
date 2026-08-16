import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { replaceSpecialVars } from '@hanzochat/data-provider';
import { useChatContext, useChatFormContext, useAddedChatContext } from '~/Providers';
import { useAuthContext } from '~/hooks/AuthContext';
import store from '~/store';

/**
 * Sending a message.
 *
 * NOT where a slash command is read: this is reached by a conversation starter
 * an agent wrote, by a prompt somebody shared, and by a `?prompt=` in the
 * address bar — none of which the viewer typed. Typed commands live in the
 * composer's own submit (components/Chat/Input/ChatForm), beside `/build` and
 * the agent command.
 */
export default function useSubmitMessage() {
  const { user } = useAuthContext();
  const methods = useChatFormContext();
  const { conversation: addedConvo } = useAddedChatContext();
  const { ask, index, getMessages, setMessages, latestMessage } = useChatContext();

  const autoSendPrompts = useAtomValue(store.autoSendPrompts);
  const setActivePrompt = useSetAtom(store.activePromptByIndex(index));

  const submitMessage = useCallback(
    (data?: { text: string }) => {
      if (!data) {
        return console.warn('No data provided to submitMessage');
      }

      const rootMessages = getMessages();
      const isLatestInRootMessages = rootMessages?.some(
        (message) => message.messageId === latestMessage?.messageId,
      );
      if (!isLatestInRootMessages && latestMessage) {
        setMessages([...(rootMessages || []), latestMessage]);
      }

      /* The composer empties when the message LEAVES, never when it is asked
         for. `ask` holds a free-tier send until consent is given, and a link
         like `hanzo.chat/?q=…&submit=true` submits on arrival — so clearing
         here left a first-time visitor looking at an empty box behind a dialog
         they had not answered, and threw their question away if they declined. */
      ask(
        {
          text: data.text,
        },
        {
          addedConvo: addedConvo ?? undefined,
          sent: () => methods.reset(),
        },
      );
    },
    [ask, methods, addedConvo, setMessages, getMessages, latestMessage],
  );

  const submitPrompt = useCallback(
    (text: string) => {
      const parsedText = replaceSpecialVars({ text, user });
      if (autoSendPrompts) {
        submitMessage({ text: parsedText });
        return;
      }

      const currentText = methods.getValues('text');
      const newText = currentText.trim().length > 1 ? `\n${parsedText}` : parsedText;
      setActivePrompt(newText);
    },
    [autoSendPrompts, submitMessage, setActivePrompt, methods, user],
  );

  return { submitMessage, submitPrompt };
}
