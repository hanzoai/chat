import { useCallback } from 'react';
import { RESET, useAtomCallback } from 'jotai/utils';
import { clearLocalStorage } from '~/utils/localStorage';
import store from '~/store';

export default function useClearStates() {
  const clearConversations = store.useClearConvoState();
  const clearSubmissions = store.useClearSubmissionState();
  const clearLatestMessages = store.useClearLatestMessages();

  const clearStates = useAtomCallback(
    useCallback(
      async (get, set, skipFirst?: boolean) => {
        /** Read the keys BEFORE the clears below reset `conversationKeysAtom`,
         * otherwise there is nothing left to iterate. */
        const keys = get(store.conversationKeysAtom);

        await clearSubmissions(skipFirst);
        await clearConversations(skipFirst);
        await clearLatestMessages(skipFirst);

        for (const key of keys) {
          if (skipFirst === true && key === 0) {
            continue;
          }

          set(store.filesByIndex(key), RESET);
          set(store.presetByIndex(key), RESET);
          set(store.textByIndex(key), RESET);
          set(store.showStopButtonByIndex(key), RESET);
          set(store.abortScrollFamily(key), RESET);
          set(store.isSubmittingFamily(key), RESET);
          set(store.optionSettingsFamily(key), RESET);
          set(store.showPopoverFamily(key), RESET);
          set(store.showMentionPopoverFamily(key), RESET);
          set(store.showPromptsPopoverFamily(key), RESET);
          set(store.activePromptByIndex(key), RESET);
          set(store.globalAudioURLFamily(key), RESET);
          set(store.globalAudioFetchingFamily(key), RESET);
          set(store.globalAudioPlayingFamily(key), RESET);
          set(store.activeRunFamily(key), RESET);
          set(store.audioRunFamily(key), RESET);
          set(store.messagesSiblingIdxFamily(key.toString()), RESET);
        }

        clearLocalStorage(skipFirst);
      },
      [clearSubmissions, clearConversations, clearLatestMessages],
    ),
  );

  return clearStates;
}
