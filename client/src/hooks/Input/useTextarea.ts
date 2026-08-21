import debounce from 'lodash/debounce';
import { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { sends } from '@hanzo/ui/chat';
import type { KeyboardEvent } from 'react';
import { forceResize, insertTextAtCursor, getEntity, checkIfScrollable } from '~/utils';
import { useAssistantsMapContext } from '~/Providers/AssistantsMapContext';
import { useAgentsMapContext } from '~/Providers/AgentsMapContext';
import useFileHandling from '~/hooks/Files/useFileHandling';
import { useInteractionHealthCheck } from '~/data-provider';
import { useChatContext } from '~/Providers/ChatContext';
import { globalAudioId } from '~/common';
import { useLocalize } from '~/hooks';
import store from '~/store';

type KeyEvent = KeyboardEvent<HTMLTextAreaElement>;

export default function useTextarea({
  textAreaRef,
  submitButtonRef,
  setIsScrollable,
  disabled = false,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  submitButtonRef: React.RefObject<HTMLButtonElement | null>;
  setIsScrollable: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
}) {
  const localize = useLocalize();
  const isComposing = useRef(false);
  const agentsMap = useAgentsMapContext();
  const { handleFiles } = useFileHandling();
  const assistantMap = useAssistantsMapContext();
  const checkHealth = useInteractionHealthCheck();
  const enterToSend = useAtomValue(store.enterToSend);

  const { index, conversation, isSubmitting, filesLoading, latestMessage, setFilesLoading } =
    useChatContext();
  const [activePrompt, setActivePrompt] = useAtom(store.activePromptByIndex(index));

  const { endpoint = '' } = conversation || {};
  // `entity` itself is no longer read — the placeholder used to spell out the
  // agent/assistant name and now does not. isAgent/isAssistant are still needed
  // to choose between the "pick an agent" prompts below.
  const { isAgent, isAssistant } = getEntity({
    endpoint,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const isNotAppendable = latestMessage?.error === true && !isAssistant;
  // && (conversationId?.length ?? 0) > 6; // also ensures that we don't show the wrong placeholder

  useEffect(() => {
    const prompt = activePrompt ?? '';
    if (prompt && textAreaRef.current) {
      insertTextAtCursor(textAreaRef.current, prompt);
      forceResize(textAreaRef.current);
      setActivePrompt(undefined);
    }
  }, [activePrompt, setActivePrompt, textAreaRef]);

  useEffect(() => {
    const currentValue = textAreaRef.current?.value ?? '';
    if (currentValue) {
      return;
    }

    const getPlaceholderText = () => {
      if (disabled) {
        return localize('com_endpoint_config_placeholder');
      }
      const currentEndpoint = conversation?.endpoint ?? '';
      const currentAgentId = conversation?.agent_id ?? '';
      const currentAssistantId = conversation?.assistant_id ?? '';
      if (isAgent && (!currentAgentId || !agentsMap?.[currentAgentId])) {
        return localize('com_endpoint_agent_placeholder');
      } else if (
        isAssistant &&
        (!currentAssistantId || !assistantMap?.[currentEndpoint]?.[currentAssistantId])
      ) {
        return localize('com_endpoint_assistant_placeholder');
      }

      if (isNotAppendable) {
        return localize('com_endpoint_message_not_appendable');
      }

      // The resting placeholder is a constant invitation, not the model's name.
      //
      // It used to read "Message <sender>", which meant the field described the
      // machine rather than inviting the person, and it changed under you every
      // time the endpoint or agent changed — the effect this hook then has to
      // chase by reassigning the attribute imperatively below. "Ask anything" is
      // the same string for every endpoint, so there is nothing to recompute and
      // nothing to re-announce.
      //
      // The states above this line are deliberately kept: "choose an agent",
      // "not appendable" and the config prompt each say something the person
      // needs in order to proceed. Only the resting case is generic.
      return localize('com_endpoint_ask_anything');
    };

    const placeholder = getPlaceholderText();

    if (textAreaRef.current?.getAttribute('placeholder') === placeholder) {
      return;
    }

    const setPlaceholder = () => {
      const placeholder = getPlaceholderText();

      if (textAreaRef.current?.getAttribute('placeholder') !== placeholder) {
        textAreaRef.current?.setAttribute('placeholder', placeholder);
        forceResize(textAreaRef.current);
      }
    };

    const debouncedSetPlaceholder = debounce(setPlaceholder, 80);
    debouncedSetPlaceholder();

    return () => debouncedSetPlaceholder.cancel();
  }, [
    isAgent,
    localize,
    disabled,
    agentsMap,
    textAreaRef,
    isAssistant,
    assistantMap,
    conversation,
    latestMessage,
    isNotAppendable,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyEvent) => {
      if (textAreaRef.current && checkIfScrollable(textAreaRef.current)) {
        const scrollable = checkIfScrollable(textAreaRef.current);
        scrollable && setIsScrollable(scrollable);
      }
      if (e.key === 'Enter' && isSubmitting) {
        return;
      }

      checkHealth();

      /* `sends` is the shell's rule and the only one this app states. It knows
         the three signals an IME answers on — `isComposing`, a `Process` key and
         Safari's bare keyCode 229 — so a keystroke the IME has claimed never
         reaches either branch below, and the newline branch inherits that for
         free rather than re-deriving it. `isComposing.current` still feeds it:
         compositionstart/end are DOM events only this element sees. */
      const chord = sends(e.key, {
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        keyCode: e.keyCode,
        isComposing: isComposing.current || e.nativeEvent.isComposing,
      });
      if (!chord) {
        return;
      }

      e.preventDefault();

      /* Cmd/Ctrl+Enter sends whatever the preference says; a bare Enter under
         `enterToSend: false` is the same chord asking for a newline instead. */
      const forced = e.metaKey || e.ctrlKey;
      if (!enterToSend && !forced) {
        if (textAreaRef.current) {
          insertTextAtCursor(textAreaRef.current, '\n');
          forceResize(textAreaRef.current);
        }
        return;
      }

      const globalAudio = document.getElementById(globalAudioId) as HTMLAudioElement | undefined;
      if (globalAudio) {
        globalAudio.muted = false;
      }
      submitButtonRef.current?.click();
    },
    [isSubmitting, checkHealth, enterToSend, setIsScrollable, textAreaRef, submitButtonRef],
  );

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = () => {
    isComposing.current = false;
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const textArea = textAreaRef.current;
      if (!textArea) {
        return;
      }

      const clipboardData = e.clipboardData as DataTransfer | undefined;
      if (!clipboardData) {
        return;
      }

      if (clipboardData.files.length > 0) {
        setFilesLoading(true);
        const timestampedFiles: File[] = [];
        for (const file of clipboardData.files) {
          const newFile = new File([file], `clipboard_${+new Date()}_${file.name}`, {
            type: file.type,
          });
          timestampedFiles.push(newFile);
        }
        handleFiles(timestampedFiles);
      }
    },
    [handleFiles, setFilesLoading, textAreaRef],
  );

  return {
    textAreaRef,
    handlePaste,
    handleKeyDown,
    isNotAppendable,
    handleCompositionEnd,
    handleCompositionStart,
  };
}
