import { useMemo, useCallback } from 'react';
import { EModelEndpoint, Constants } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useSubmitMessage } from '~/hooks';

/** `label` is the chip caption; `text` is what gets armed into the composer. */
type Starter = { label: string; text: string };

/**
 * Curated fallback chips for plain-model chats (no agent/assistant-specific
 * starters). Short, honest verbs that seed the composer (hanzo.ai hero style) —
 * a trailing space leaves the cursor ready for the user to finish the thought.
 */
const DEFAULT_STARTERS: Starter[] = [
  { label: 'Summarize', text: 'Summarize ' },
  { label: 'Write code', text: 'Write code to ' },
  { label: 'Explain', text: 'Explain ' },
  { label: 'Brainstorm', text: 'Brainstorm ideas for ' },
];

const ConversationStarters = () => {
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const endpointType = useMemo(() => {
    let ep = conversation?.endpoint ?? '';
    if (ep === EModelEndpoint.azureOpenAI) {
      ep = EModelEndpoint.openAI;
    }
    return getIconEndpoint({
      endpointsConfig,
      iconURL: conversation?.iconURL,
      endpoint: ep,
    });
  }, [conversation?.endpoint, conversation?.iconURL, endpointsConfig]);

  const { data: documentsMap = new Map() } = useGetAssistantDocsQuery(endpointType, {
    select: (data) => new Map(data.map((dbA) => [dbA.assistant_id, dbA])),
  });

  const { entity, isAgent } = getEntity({
    endpoint: endpointType,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const starters: Starter[] = useMemo(() => {
    // Author-provided starters are full prompts; caption == prompt text.
    const toStarters = (list: string[]): Starter[] => list.map((text) => ({ label: text, text }));

    if (entity?.conversation_starters?.length) {
      return toStarters(entity.conversation_starters);
    }

    // Agents may intentionally omit starters — honor that (no defaults).
    if (isAgent) {
      return [];
    }

    const docStarters = documentsMap.get(entity?.id ?? '')?.conversation_starters;
    if (docStarters?.length) {
      return toStarters(docStarters);
    }

    // Plain-model chat: fall back to curated defaults so the empty state isn't bare.
    return DEFAULT_STARTERS;
  }, [documentsMap, isAgent, entity]);

  // Reuse the ONE composer-arming path (respects the autoSendPrompts preference).
  const { submitPrompt } = useSubmitMessage();
  const armComposer = useCallback((text: string) => submitPrompt(text), [submitPrompt]);

  if (!starters.length) {
    return null;
  }

  return (
    <div className="mx-auto mt-5 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 px-4">
      {starters.slice(0, Constants.MAX_CONVO_STARTERS).map(({ label, text }, index) => (
        <button
          key={index}
          onClick={() => armComposer(text)}
          title={label}
          className="max-w-full truncate rounded-full border border-border-light bg-surface-primary-alt px-4 py-2 text-sm text-text-secondary transition-colors duration-200 hover:border-border-medium hover:bg-surface-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy motion-reduce:transition-none"
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ConversationStarters;
