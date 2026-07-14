import { useMemo, useCallback } from 'react';
import { PenLine, Lightbulb, Code2, Sparkles } from 'lucide-react';
import { EModelEndpoint, Constants } from '@hanzochat/data-provider';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useSubmitMessage } from '~/hooks';

type Starter = { text: string; Icon?: typeof PenLine };

/**
 * Curated fallback starters for plain-model chats (no agent/assistant-specific
 * starters). Keeps the empty state from being bare and matches the ChatGPT/Claude
 * suggestion-chip pattern. Category-style so submitting reads naturally.
 */
const DEFAULT_STARTERS: Starter[] = [
  { text: 'Help me write or refine something', Icon: PenLine },
  { text: 'Explain a concept clearly', Icon: Lightbulb },
  { text: 'Review, debug, or improve some code', Icon: Code2 },
  { text: 'Brainstorm ideas and a plan', Icon: Sparkles },
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
    const toStarters = (list: string[]): Starter[] => list.map((text) => ({ text }));

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

  const { submitMessage } = useSubmitMessage();
  const sendConversationStarter = useCallback(
    (text: string) => submitMessage({ text }),
    [submitMessage],
  );

  if (!starters.length) {
    return null;
  }

  return (
    <div className="mx-auto mt-6 grid w-full max-w-2xl grid-cols-1 gap-2.5 px-4 sm:grid-cols-2">
      {starters.slice(0, Constants.MAX_CONVO_STARTERS).map(({ text, Icon = Sparkles }, index) => (
        <button
          key={index}
          onClick={() => sendConversationStarter(text)}
          className="group flex items-center gap-3 rounded-2xl border border-border-light bg-surface-primary-alt px-4 py-3.5 text-start transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-medium hover:bg-surface-tertiary hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-text-secondary transition-colors duration-200 group-hover:text-text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="line-clamp-2 text-balance text-sm text-text-secondary transition-colors duration-200 group-hover:text-text-primary">
            {text}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ConversationStarters;
