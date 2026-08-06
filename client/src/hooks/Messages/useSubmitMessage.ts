import { useCallback } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { replaceSpecialVars } from '@hanzochat/data-provider';
import { useChatContext, useChatFormContext, useAddedChatContext } from '~/Providers';
import { useAuthContext } from '~/hooks/AuthContext';
import { command } from '~/utils/backdrop';
import store from '~/store';

export default function useSubmitMessage() {
  const { user } = useAuthContext();
  const methods = useChatFormContext();
  const { conversation: addedConvo } = useAddedChatContext();
  const { ask, index, getMessages, setMessages, latestMessage } = useChatContext();

  const autoSendPrompts = useAtomValue(store.autoSendPrompts);
  const setActivePrompt = useSetAtom(store.activePromptByIndex(index));
  // Read-and-write access without subscribing: the composer must not re-render
  // every time the backdrop changes.
  const atoms = useStore();

  const submitMessage = useCallback(
    (data?: { text: string }) => {
      if (!data) {
        return console.warn('No data provided to submitMessage');
      }

      /**
       * `/background` (and `/bg`) never reach the model. They are handled here
       * because this is the ONE place typed text becomes a turn, so there is a
       * single answer to "was this a command or a message".
       *
       * Only what the viewer typed themselves gets this treatment. Assistant
       * output is deliberately NOT scanned for these lines: a model repeating
       * text from a web page or an uploaded file would be enough to redress
       * somebody's chat, which is a prompt injection with a visible effect.
       * A model-driven path belongs behind a real tool call the server
       * authorises — see the note in utils/backdrop on `merge`, which is the
       * contract such a tool would be validated against.
       */
      const next = command(data.text, atoms.get(store.backdrop));
      if (next) {
        atoms.set(store.backdrop, next);
        methods.reset();
        return;
      }

      const rootMessages = getMessages();
      const isLatestInRootMessages = rootMessages?.some(
        (message) => message.messageId === latestMessage?.messageId,
      );
      if (!isLatestInRootMessages && latestMessage) {
        setMessages([...(rootMessages || []), latestMessage]);
      }

      ask(
        {
          text: data.text,
        },
        {
          addedConvo: addedConvo ?? undefined,
        },
      );
      methods.reset();
    },
    [ask, methods, addedConvo, setMessages, getMessages, latestMessage, atoms],
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
