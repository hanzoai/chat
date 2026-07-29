import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
import { Constants } from '@hanzochat/data-provider';
import type { TEphemeralAgent } from '@hanzochat/data-provider';
import { logger } from '~/utils';
import { family } from './utils';

export const ephemeralAgentByConvoId = family<string, TEphemeralAgent | null>(null);

export function useUpdateEphemeralAgent() {
  const updateEphemeralAgent = useAtomCallback(
    useCallback((_get, set, convoId: string, agent: TEphemeralAgent | null) => {
      set(ephemeralAgentByConvoId(convoId), agent);
    }, []),
  );

  return updateEphemeralAgent;
}

/**
 * Creates a callback function to apply the ephemeral agent state
 * from the "new" conversation template to a specified conversation ID.
 */
export function useApplyNewAgentTemplate() {
  const applyTemplate = useAtomCallback(
    useCallback(
      (
        get,
        set,
        targetId: string,
        _sourceId: string | null = Constants.NEW_CONVO,
        ephemeralAgentState?: TEphemeralAgent | null,
      ) => {
        const sourceId = _sourceId || Constants.NEW_CONVO;
        logger.log('agents', `Attempting to apply template from "${sourceId}" to "${targetId}"`);

        if (targetId === sourceId) {
          logger.warn('agents', `Attempted to apply template to itself ("${sourceId}"). Skipping.`);
          return;
        }

        try {
          // 1. Read the current agent state of the "new" conversation template.
          //    Reading through the store subscribes nothing.
          const agentTemplate = ephemeralAgentState ?? get(ephemeralAgentByConvoId(sourceId));

          // 2. Check if a template state actually exists
          if (agentTemplate) {
            logger.log('agents', `Applying agent template to "${targetId}":`, agentTemplate);
            // 3. Set the state for the target conversation ID using the template value
            set(ephemeralAgentByConvoId(targetId), agentTemplate);
          } else {
            // 4. Handle the case where the "new" template has no agent state (is null)
            logger.warn(
              'agents',
              `Agent template from "${sourceId}" is null or unset. Setting agent for "${targetId}" to null.`,
            );
            set(ephemeralAgentByConvoId(targetId), null);
          }
        } catch (error) {
          logger.error(
            'agents',
            `Error applying agent template from "${sourceId}" to "${targetId}":`,
            error,
          );
          set(ephemeralAgentByConvoId(targetId), null);
        }
      },
      [],
    ),
  );

  return applyTemplate;
}

/**
 * Creates a callback function to read the current ephemeral agent state
 * for a specified conversation ID without subscribing the component.
 */
export function useGetEphemeralAgent() {
  const getEphemeralAgent = useAtomCallback(
    useCallback((get, _set, conversationId: string): TEphemeralAgent | null => {
      logger.log('agents', `[useGetEphemeralAgent] Reading state for ID: ${conversationId}`);
      return get(ephemeralAgentByConvoId(conversationId));
    }, []),
  );

  return getEphemeralAgent;
}
