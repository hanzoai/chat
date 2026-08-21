import { useMemo } from 'react';
import {
  Constants,
  supportsFiles,
  EModelEndpoint,
  mergeFileConfig,
  isAgentsEndpoint,
  getEndpointField,
  getEndpointFileConfig,
} from '@hanzochat/data-provider';
import type { TConversation } from '@hanzochat/data-provider';
import { useGetFileConfig, useGetEndpointsQuery, useGetAgentByIdQuery } from '~/data-provider';
import { useAgentsMapContext } from '~/Providers';
import { useUpload } from './useUpload';

/**
 * What this conversation can be given, and how.
 *
 * `enabled` is the whole of the question the composer asks: some endpoints
 * take no files at all, and an "Add" that opens onto nothing is worse than one
 * that says it cannot. The derivation under it is the subtle part — an agent's
 * endpointType comes from its provider, through a fetch when the agent is not
 * in the map, and `useResponsesApi` has to prefer an explicit `false` on the
 * conversation over the agent's `true`.
 */
export function useAttach(conversation: TConversation | null, disableInputs: boolean) {
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;
  const { endpoint } = conversation ?? { endpoint: null };
  const isAgents = useMemo(() => isAgentsEndpoint(endpoint), [endpoint]);

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

  const { add, takes, library, portals } = useUpload({
    endpoint,
    endpointType,
    conversationId,
    agentId: conversation?.agent_id,
    useResponsesApi,
  });

  const enabled = useMemo(() => {
    if (disableInputs || endpointFileConfig?.disabled === true) {
      return false;
    }
    return isAgents || endpointSupportsFiles;
  }, [disableInputs, endpointFileConfig?.disabled, isAgents, endpointSupportsFiles]);

  return { add, takes, library, enabled, portals };
}
