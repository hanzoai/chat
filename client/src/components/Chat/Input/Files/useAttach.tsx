import { useMemo } from 'react';
import {
  Constants,
  supportsFiles,
  EModelEndpoint,
  mergeFileConfig,
  isAgentsEndpoint,
  getEndpointField,
  isAssistantsEndpoint,
  getEndpointFileConfig,
} from '@hanzochat/data-provider';
import type { TConversation } from '@hanzochat/data-provider';
import { useGetFileConfig, useGetEndpointsQuery, useGetAgentByIdQuery } from '~/data-provider';
import { useAgentsMapContext } from '~/Providers';
import { AttachmentIcon } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import type { MenuItemProps } from '~/common';
import { useUpload } from './useUpload';

/**
 * What attaching offers in THIS conversation, as menu items.
 *
 * Attaching used to be its own button beside the "+", which asked the composer
 * to explain two controls that both mean "add something to this turn". Now the
 * "+" holds it, so this hook answers items rather than a control — the shape
 * `useToolsItems` already established for the turn's tools.
 *
 * Three cases, ONE input and one set of dialogs behind all of them:
 *
 *  - an endpoint that cannot take files → NO items. An "Attach" that opens onto
 *    nothing is worse than an absent one, and it is why this returns a list and
 *    not a component: an empty list simply does not render.
 *  - assistants → ONE item. Those endpoints expose no capability choice, so a
 *    menu of one is the honest shape; it takes the same `upload` trigger the
 *    other items use, with no accept filter (exactly what the old plain button
 *    did) rather than a second hidden input.
 *  - everything else → the capability items (image / document / OCR / file
 *    search / code), which is where a real choice exists.
 *
 * `useUpload` is called UNCONDITIONALLY, before any of that is decided —
 * hooks cannot be branched on, and its dialogs and file input must exist even
 * when the menu shows nothing.
 *
 * `portals` (the hidden input + the two dialogs) must be rendered by exactly ONE
 * consumer, or there are two inputs and two dialog sets.
 */
export function useAttach(conversation: TConversation | null, disableInputs: boolean) {
  const localize = useLocalize();
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;
  const { endpoint } = conversation ?? { endpoint: null };
  const isAgents = useMemo(() => isAgentsEndpoint(endpoint), [endpoint]);
  const isAssistants = useMemo(() => isAssistantsEndpoint(endpoint), [endpoint]);

  const agentsMap = useAgentsMapContext();

  const needsAgentFetch = useMemo(() => {
    if (!isAgents || !conversation?.agent_id) {
      return false;
    }
    const agent = agentsMap?.[conversation.agent_id];
    return !agent?.model_parameters;
  }, [isAgents, conversation?.agent_id, agentsMap]);

  const { data: agentData } = useGetAgentByIdQuery(conversation?.agent_id, {
    enabled: needsAgentFetch,
  });

  const useResponsesApi = useMemo(() => {
    if (!isAgents || !conversation?.agent_id || conversation?.useResponsesApi) {
      return conversation?.useResponsesApi;
    }
    const agent = agentData || agentsMap?.[conversation.agent_id];
    return agent?.model_parameters?.useResponsesApi;
  }, [isAgents, conversation?.agent_id, conversation?.useResponsesApi, agentData, agentsMap]);

  const { data: fileConfig = null } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const { data: endpointsConfig } = useGetEndpointsQuery();

  const endpointType = useMemo(
    () =>
      getEndpointField(endpointsConfig, endpoint, 'type') ||
      (endpoint as EModelEndpoint | undefined),
    [endpoint, endpointsConfig],
  );

  const endpointFileConfig = useMemo(
    () => getEndpointFileConfig({ endpoint, fileConfig, endpointType }),
    [endpoint, fileConfig, endpointType],
  );

  const endpointSupportsFiles: boolean = useMemo(
    () => supportsFiles[endpointType ?? endpoint ?? ''] ?? false,
    [endpointType, endpoint],
  );

  const isUploadDisabled = useMemo(
    () => (disableInputs || endpointFileConfig?.disabled) ?? false,
    [disableInputs, endpointFileConfig?.disabled],
  );

  const { items, upload, portals } = useUpload({
    endpoint,
    endpointType,
    conversationId,
    disabled: disableInputs,
    agentId: conversation?.agent_id,
    endpointFileConfig,
    useResponsesApi,
  });

  const attachItems = useMemo<MenuItemProps[]>(() => {
    if (isAssistants && endpointSupportsFiles && !isUploadDisabled) {
      return [
        {
          label: localize('com_sidepanel_attach_files'),
          onClick: () => upload(),
          icon: <AttachmentIcon className="icon-md mr-2 text-text-secondary" />,
        },
      ];
    }
    if (isAgents || (endpointSupportsFiles && !isUploadDisabled)) {
      return items;
    }
    return [];
    // `upload` is stable for the life of the hook; `items` carries the rest.
  }, [isAssistants, isAgents, endpointSupportsFiles, isUploadDisabled, items, upload, localize]);

  return { items: attachItems, portals };
}
