import { useMemo, useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { AppWindow, ArrowRight } from 'lucide-react';
import { EModelEndpoint, Constants, replaceSpecialVars } from '@hanzochat/data-provider';
import {
  useChatContext,
  useChatFormContext,
  useAgentsMapContext,
  useAssistantsMapContext,
} from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { cn, getIconEndpoint, getEntity, openAppBuilder } from '~/utils';
import { useAuthContext, useSubmitMessage, useLocalize } from '~/hooks';

/** `label` is the chip caption; `text` is the message that gets sent. */
type Starter = { label: string; text: string };

/**
 * Curated fallback chips for plain-model chats (no agent/assistant-specific
 * starters). Clicking one SENDS it, so every `text` is a complete, standalone
 * prompt that stands on its own — the short `label` is only the caption.
 */
const DEFAULT_STARTERS: Starter[] = [
  { label: 'Summarize', text: 'Summarize the text I paste next into five bullet points.' },
  {
    label: 'Write code',
    text: 'Write a Python script that renames every file in a folder to a slugified version of its name.',
  },
  { label: 'Explain', text: 'Explain how HTTPS keeps a connection private, in plain language.' },
  {
    label: 'Brainstorm',
    text: 'Brainstorm ten ideas for a weekend side project I could ship in two days.',
  },
];

const ConversationStarters = () => {
  const localize = useLocalize();
  const { user, isAuthenticated } = useAuthContext();
  const { conversation, isSubmitting } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const methods = useChatFormContext();
  const composerText = useWatch({ control: methods.control, name: 'text' });

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

  /**
   * `isDefault` is true only for a plain-model chat that falls back to the
   * curated defaults — the case where we also offer the "Build an app" handoff
   * to hanzo.app. Author-provided (agent/assistant) starters are left untouched.
   */
  const { starters, isDefault } = useMemo(() => {
    // Author-provided starters are full prompts; caption == prompt text.
    const toStarters = (list: string[]): Starter[] => list.map((text) => ({ label: text, text }));

    if (entity?.conversation_starters?.length) {
      return { starters: toStarters(entity.conversation_starters), isDefault: false };
    }

    // Agents may intentionally omit starters — honor that (no defaults).
    if (isAgent) {
      return { starters: [] as Starter[], isDefault: false };
    }

    const docStarters = documentsMap.get(entity?.id ?? '')?.conversation_starters;
    if (docStarters?.length) {
      return { starters: toStarters(docStarters), isDefault: false };
    }

    // Plain-model chat: fall back to curated defaults so the empty state isn't bare.
    return { starters: DEFAULT_STARTERS, isDefault: true };
  }, [documentsMap, isAgent, entity]);

  /**
   * Clicking a starter is an INTENT, not a draft: it sends. `submitMessage` is
   * the same function ChatForm's onSubmit calls for a typed message, so there is
   * one send path — NOT `submitPrompt`, whose `autoSendPrompts` preference is
   * about inserting saved prompt-library entries into the composer.
   * `replaceSpecialVars` is kept so author-written starters can still use
   * `{{current_date}}` and friends. `isSubmitting` makes a second click while a
   * generation is in flight a no-op instead of a duplicate turn.
   */
  const { submitMessage } = useSubmitMessage();
  const send = useCallback(
    (text: string) => {
      if (isSubmitting) {
        return;
      }
      submitMessage({ text: replaceSpecialVars({ text, user }) });
    },
    [isSubmitting, submitMessage, user],
  );
  // "Build an app" hands the composer intent to the hanzo.app builder (new tab).
  const openBuilder = useCallback(() => openAppBuilder(composerText), [composerText]);

  if (!starters.length) {
    return null;
  }

  return (
    <>
      <div className="mx-auto mt-5 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 px-4">
      {starters.slice(0, Constants.MAX_CONVO_STARTERS).map(({ label, text }, index) => (
        <button
          key={index}
          onClick={() => send(text)}
          disabled={isSubmitting}
          title={label}
          className={cn(
            'min-h-11 max-w-full truncate rounded-full border border-border-light bg-surface-primary-alt px-4 py-2 text-sm text-text-secondary transition-colors duration-200 hover:border-border-medium hover:bg-surface-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            // A phone fits two of these per row, so five of them are three rows of
            // suggestions stacked under the one control an arriving visitor came
            // to use. The first is an example; the rest were a menu. Signed in
            // the screen belongs to someone who has already chosen to be here,
            // and the full set is useful again.
            index > 0 && !isAuthenticated && 'max-sm:hidden',
          )}
        >
          {label}
        </button>
      ))}
      {isDefault && (
        <button
          onClick={openBuilder}
          title={localize('com_ui_build_app')}
          // Same chip as its siblings — solid glass, not a dashed outline —
          // so the row reads as one set. It keeps its icon to stay legible as
          // the one that leaves for the builder.
          className={cn(
            'inline-flex min-h-11 max-w-full items-center gap-1.5 truncate rounded-full border border-border-light bg-surface-primary-alt px-4 py-2 text-sm text-text-secondary transition-colors duration-200 hover:border-border-medium hover:bg-surface-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy motion-reduce:transition-none',
            !isAuthenticated && 'max-sm:hidden',
          )}
        >
          <AppWindow className="icon-sm" aria-hidden="true" />
          {localize('com_ui_build_app')}
        </button>
      )}
      </div>
      {/* The funnel's endpoint: the chips above seed a conversation, this
          seeds an APP. A text-forward action line, not a fifth pill, so it
          reads as the one thing to do next; same builder handoff as the
          "Build an app" chip, carrying the composer's current text along. */}
      {isDefault && (
        <div className="mt-3 flex justify-center px-4">
          <button
            onClick={openBuilder}
            className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy"
          >
            {localize('com_ui_ship_first_app')}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </>
  );
};

export default ConversationStarters;
