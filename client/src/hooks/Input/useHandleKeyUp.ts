import { useCallback, useMemo } from 'react';
import type { Setter } from '~/common';
import { useAtomValue, useSetAtom } from 'jotai';
import { PermissionTypes, Permissions } from '@hanzochat/data-provider';
import useHasAccess from '~/hooks/Roles/useHasAccess';
import store from '~/store';

/** Event Keys that shouldn't trigger a command */
const invalidKeys = {
  Escape: true,
  Backspace: true,
  Enter: true,
};

/**
 * Utility function to determine if a command should trigger.
 */
const shouldTriggerCommand = (
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>,
  commandChar: string,
) => {
  const text = textAreaRef.current?.value;
  if (typeof text !== 'string' || text.length === 0 || text[0] !== commandChar) {
    return false;
  }

  const startPos = textAreaRef.current?.selectionStart;
  if (typeof startPos !== 'number') {
    return false;
  }

  return startPos === 1;
};

/**
 * Custom hook for handling key up events with command triggers.
 */
const useHandleKeyUp = ({
  index,
  textAreaRef,
  setShowMentionPopover,
}: {
  index: number;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  setShowMentionPopover: Setter<boolean>;
}) => {
  const hasPromptsAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });
  const latestMessage = useAtomValue(store.latestMessageFamily(index));
  const setShowPromptsPopover = useSetAtom(store.showPromptsPopoverFamily(index));
  const setShowAgentsPopover = useSetAtom(store.showAgentsPopoverFamily(index));

  // Get the current state of command toggles
  const atCommandEnabled = useAtomValue(store.atCommand);
  const slashCommandEnabled = useAtomValue(store.slashCommand);

  const handleAtCommand = useCallback(() => {
    if (atCommandEnabled && shouldTriggerCommand(textAreaRef, '@')) {
      setShowMentionPopover(true);
    }
  }, [textAreaRef, setShowMentionPopover, atCommandEnabled]);

  const handlePromptsCommand = useCallback(() => {
    if (!slashCommandEnabled) {
      return;
    }
    const text = textAreaRef.current?.value ?? '';
    // `/agent …` opens the cloud-agents picker; a bare `/` opens Prompts. One
    // slash trigger, disambiguated by what follows it.
    if (/^\/agents?(\s|$)/.test(text)) {
      setShowPromptsPopover(false);
      setShowAgentsPopover(true);
      return;
    }
    if (!hasPromptsAccess) {
      return;
    }
    if (shouldTriggerCommand(textAreaRef, '/')) {
      setShowAgentsPopover(false);
      setShowPromptsPopover(true);
    }
  }, [
    textAreaRef,
    hasPromptsAccess,
    setShowPromptsPopover,
    setShowAgentsPopover,
    slashCommandEnabled,
  ]);

  const commandHandlers = useMemo(
    () => ({
      '@': handleAtCommand,
      '/': handlePromptsCommand,
    }),
    [handleAtCommand, handlePromptsCommand],
  );

  const handleUpArrow = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!latestMessage) {
        return;
      }

      const element = document.getElementById(`edit-${latestMessage.parentMessageId}`);
      if (!element) {
        return;
      }
      event.preventDefault();
      element.click();
    },
    [latestMessage],
  );

  /**
   * Main key up handler.
   */
  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const text = textAreaRef.current?.value;
      if (event.key === 'ArrowUp' && text?.length === 0) {
        handleUpArrow(event);
        return;
      }
      if (typeof text !== 'string' || text.length === 0) {
        return;
      }

      if (invalidKeys[event.key as keyof typeof invalidKeys]) {
        return;
      }

      const firstChar = text[0];
      const handler = commandHandlers[firstChar as keyof typeof commandHandlers];

      if (typeof handler === 'function') {
        handler();
      }
    },
    [textAreaRef, commandHandlers, handleUpArrow],
  );

  return handleKeyUp;
};

export default useHandleKeyUp;
