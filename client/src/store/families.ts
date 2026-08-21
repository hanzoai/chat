import { useCallback, useEffect } from 'react';
import { createSearchParams } from 'react-router-dom';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { RESET, atomFamily, atomWithReset, useAtomCallback } from 'jotai/utils';
import type { SetStateAction } from 'jotai';
import {
  Constants,
  SystemRoles,
  LocalStorageKeys,
  isEphemeralAgentId,
} from '@hanzochat/data-provider';
import type { TMessage, TPreset, TConversation, TSubmission } from '@hanzochat/data-provider';
import type { TOptionSettings, ExtendedFile } from '~/common';
import {
  clearModelForNonEphemeralAgent,
  createChatSearchParams,
  storeEndpointSettings,
  logger,
} from '~/utils';
import { useSetConvoContext } from '~/Providers/SetConvoContext';
import { family } from './utils';
import userStore from './user';

const latestMessageKeysAtom = atomWithReset<(string | number)[]>([]);

const submissionKeysAtom = atomWithReset<(string | number)[]>([]);

const latestMessageFamily = family<string | number | null, TMessage | null>(null);

const submissionByIndex = family<string | number, TSubmission | null>(null);

const conversationKeysAtom = atomWithReset<(string | number)[]>([]);

const latestMessageKeysSelector = atom(
  (get) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(latestMessageFamily(key)) !== null);
  },
  (_get, set, newKeys: (string | number)[]) => {
    logger.log('setting latestMessageKeys', { newKeys });
    set(latestMessageKeysAtom, newKeys);
  },
);

const submissionKeysSelector = atom(
  (get) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(submissionByIndex(key)) !== null);
  },
  (_get, set, newKeys: (string | number)[]) => {
    logger.log('setting submissionKeysAtom', newKeys);
    set(submissionKeysAtom, newKeys);
  },
);

/**
 * The conversation as stored. `conversationByIndex` wraps this to carry the
 * write-through to localStorage and the URL, so the raw value stays resettable.
 */
const storedConversation = family<string | number, TConversation | null>(null);

const conversationByIndex = atomFamily((index: string | number) =>
  atom(
    (get) => get(storedConversation(index)),
    (get, set, update: SetStateAction<TConversation | null> | typeof RESET) => {
      const oldValue = get(storedConversation(index));
      set(storedConversation(index), update);

      if (update === RESET) {
        return;
      }

      const newValue = get(storedConversation(index));
      logger.log('conversation', 'Setting conversation:', { index, newValue, oldValue });

      /**
       * A guest leaves nothing behind. Its endpoint and model are a server-side
       * pin (`GUEST_ENDPOINT`/`GUEST_MODEL`), not a preference the visitor made,
       * so remembering them would hand the next principal on this browser — the
       * same person, signed in a redirect later — the guest's capped model and
       * rob the signed-in session of resolving its own default.
       */
      if (get(userStore.user)?.role === SystemRoles.GUEST) {
        return;
      }
      if (newValue?.assistant_id != null && newValue.assistant_id) {
        localStorage.setItem(
          `${LocalStorageKeys.ASST_ID_PREFIX}${index}${newValue.endpoint}`,
          newValue.assistant_id,
        );
      }
      if (newValue?.agent_id != null && !isEphemeralAgentId(newValue.agent_id)) {
        localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}${index}`, newValue.agent_id);
      }
      if (newValue?.spec != null && newValue.spec) {
        localStorage.setItem(LocalStorageKeys.LAST_SPEC, newValue.spec);
      }
      if (newValue?.tools && Array.isArray(newValue.tools)) {
        localStorage.setItem(
          LocalStorageKeys.LAST_TOOLS,
          JSON.stringify(newValue.tools.filter((el) => !!el)),
        );
      }

      if (!newValue) {
        return;
      }

      storeEndpointSettings(newValue);

      const convoToStore = { ...newValue };
      clearModelForNonEphemeralAgent(convoToStore);
      localStorage.setItem(
        `${LocalStorageKeys.LAST_CONVO_SETUP}_${index}`,
        JSON.stringify(convoToStore),
      );

      const disableParams = newValue.disableParams === true;
      const shouldUpdateParams =
        Number(index) === 0 &&
        !disableParams &&
        newValue.createdAt === '' &&
        JSON.stringify(newValue) !== JSON.stringify(oldValue) &&
        oldValue?.conversationId === Constants.NEW_CONVO;

      if (shouldUpdateParams) {
        const newParams = createChatSearchParams(newValue);
        const searchParams = createSearchParams(newParams);
        const url = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', url);
      }
    },
  ),
);

const filesByIndex = family<string | number, Map<string, ExtendedFile>>(new Map());

const allConversationsSelector = atom((get) => {
  const keys = get(conversationKeysAtom);
  return keys.map((key) => get(conversationByIndex(key))).map((convo) => convo?.conversationId);
});

const presetByIndex = family<string | number, TPreset | null>(null);

const textByIndex = family<string | number, string>('');

const showStopButtonByIndex = family<string | number, boolean>(false);

const abortScrollFamily = family<string | number, boolean>(false);

const isSubmittingFamily = family<string | number, boolean>(false);

const anySubmittingSelector = atom((get) => {
  const keys = get(conversationKeysAtom);
  return keys.some((key) => get(isSubmittingFamily(key)) === true);
});

const optionSettingsFamily = family<string | number, TOptionSettings>({});

const showPopoverFamily = family<string | number, boolean>(false);

const activePromptByIndex = family<string | number | null, string | undefined>(undefined);

const showMentionPopoverFamily = family<string | number | null, boolean>(false);


const showPromptsPopoverFamily = family<string | number | null, boolean>(false);

const showAgentsPopoverFamily = family<string | number | null, boolean>(false);

const globalAudioURLFamily = family<string | number | null, string | null>(null);

const globalAudioFetchingFamily = family<string | number | null, boolean>(false);

const globalAudioPlayingFamily = family<string | number | null, boolean>(false);

const activeRunFamily = family<string | number | null, string | null>(null);

const audioRunFamily = family<string | number | null, string | null>(null);

const messagesSiblingIdxFamily = family<string | null | undefined, number>(0);

function useCreateConversationAtom(key: string | number) {
  const hasSetConversation = useSetConvoContext();
  const [keys, setKeys] = useAtom(conversationKeysAtom);
  const setConversation = useSetAtom(conversationByIndex(key));
  const conversation = useAtomValue(conversationByIndex(key));

  useEffect(() => {
    if (!keys.includes(key)) {
      setKeys([...keys, key]);
    }
  }, [key, keys, setKeys]);

  return { hasSetConversation, conversation, setConversation };
}

function useClearConvoState() {
  /** Clears all active conversations. Pass `true` to skip the first or root conversation */
  const clearAllConversations = useAtomCallback(
    useCallback((get, set, skipFirst?: boolean) => {
      const conversationKeys = get(conversationKeysAtom);

      for (const conversationKey of conversationKeys) {
        if (skipFirst === true && conversationKey == 0) {
          continue;
        }

        /**
         * Read before the reset: the latest message is cleared only for a
         * conversation that actually held one.
         */
        const conversation = get(conversationByIndex(conversationKey));
        set(conversationByIndex(conversationKey), RESET);
        if (conversation) {
          set(latestMessageFamily(conversationKey), RESET);
        }
      }

      set(conversationKeysAtom, RESET);
    }, []),
  );

  return clearAllConversations;
}

const conversationByKeySelector = atomFamily((index: string | number) =>
  atom((get) => get(conversationByIndex(index))),
);

function useClearSubmissionState() {
  const clearAllSubmissions = useAtomCallback(
    useCallback((get, set, skipFirst?: boolean) => {
      const submissionKeys = get(submissionKeysSelector);
      logger.log('submissionKeys', submissionKeys);

      for (const key of submissionKeys) {
        if (skipFirst === true && key == 0) {
          continue;
        }

        logger.log('resetting submission', key);
        set(submissionByIndex(key), RESET);
      }

      set(submissionKeysSelector, []);
    }, []),
  );

  return clearAllSubmissions;
}

function useClearLatestMessages(context?: string) {
  const clearAllLatestMessages = useAtomCallback(
    useCallback(
      (get, set, skipFirst?: boolean) => {
        const latestMessageKeys = get(latestMessageKeysSelector);
        logger.log('[clearAllLatestMessages] latestMessageKeys', latestMessageKeys);
        if (context != null && context) {
          logger.log(`[clearAllLatestMessages] context: ${context}`);
        }

        for (const key of latestMessageKeys) {
          if (skipFirst === true && key == 0) {
            continue;
          }

          logger.log(`[clearAllLatestMessages] resetting latest message; key: ${key}`);
          set(latestMessageFamily(key), RESET);
        }

        set(latestMessageKeysSelector, []);
      },
      [context],
    ),
  );

  return clearAllLatestMessages;
}

const updateConversationSelector = atomFamily((conversationId: string) =>
  atom(null, (get, set, newPartialConversation: Partial<TConversation>) => {
    const keys = get(conversationKeysAtom);
    keys.forEach((key) => {
      set(conversationByIndex(key), (prevConversation) => {
        if (prevConversation && prevConversation.conversationId === conversationId) {
          return {
            ...prevConversation,
            ...newPartialConversation,
          };
        }
        return prevConversation;
      });
    });
  }),
);

export default {
  conversationKeysAtom,
  conversationByIndex,
  filesByIndex,
  presetByIndex,
  submissionByIndex,
  textByIndex,
  showStopButtonByIndex,
  abortScrollFamily,
  isSubmittingFamily,
  optionSettingsFamily,
  showPopoverFamily,
  latestMessageFamily,
  messagesSiblingIdxFamily,
  anySubmittingSelector,
  allConversationsSelector,
  conversationByKeySelector,
  useClearConvoState,
  useCreateConversationAtom,
  showMentionPopoverFamily,
  globalAudioURLFamily,
  activeRunFamily,
  audioRunFamily,
  globalAudioPlayingFamily,
  globalAudioFetchingFamily,
  activePromptByIndex,
  useClearSubmissionState,
  useClearLatestMessages,
  showPromptsPopoverFamily,
  showAgentsPopoverFamily,
  updateConversationSelector,
};
