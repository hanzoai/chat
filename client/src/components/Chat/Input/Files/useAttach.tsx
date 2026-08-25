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

  const mapped = useMemo(
    () => (conversation?.agent_id != null ? agentsMap?.[conversation.agent_id] : undefined),
    [agentsMap, conversation?.agent_id],
  );

  const needsAgentFetch = useMemo(
    () => isAgents && conversation?.agent_id != null && !mapped?.model_parameters,
    [isAgents, conversation?.agent_id, mapped],
  );

  const { data: agentData } = useGetAgentByIdQuery(conversation?.agent_id, {
    enabled: needsAgentFetch,
  });

  /* The agent is read FIELD by field rather than object by object: the fetch
     answers before the map is filled and can carry a provider without model
     parameters, or the reverse, so picking one whole agent drops whichever
     half the winner happens to be missing. */
  const provider = agentData?.provider ?? mapped?.provider;

  const useResponsesApi = useMemo(() => {
    /* An explicit choice on the conversation is the answer, including `false`
       — that is a person turning the agent's `true` OFF, and reading it as
       "unset" turns it back on. */
    if (!isAgents || !conversation?.agent_id || conversation?.useResponsesApi != null) {
      return conversation?.useResponsesApi;
    }
    return (
      agentData?.model_parameters?.useResponsesApi ?? mapped?.model_parameters?.useResponsesApi
    );
  }, [isAgents, conversation?.agent_id, conversation?.useResponsesApi, agentData, mapped]);

  const { data: fileConfig = null } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const { data: endpointsConfig } = useGetEndpointsQuery();

  /* An agents conversation names `agents` as its endpoint, but files are taken
     by the PROVIDER underneath it — so every question below is asked about the
     provider, and `agents` is the answer only while none is known. Asking about
     `agents` instead is how a provider that accepts files inherits a refusal
     written for the wrapper. */
  const named = (isAgents ? provider : undefined) ?? endpoint;

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, named, 'type') || (named as EModelEndpoint | undefined),
    [named, endpointsConfig],
  );

  const endpointFileConfig = useMemo(
    () => getEndpointFileConfig({ endpoint: named, fileConfig, endpointType }),
    [named, fileConfig, endpointType],
  );

  const endpointSupportsFiles: boolean = useMemo(
    () => supportsFiles[endpointType ?? named ?? ''] ?? false,
    [endpointType, named],
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
