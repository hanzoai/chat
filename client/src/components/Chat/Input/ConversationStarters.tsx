import React, { useMemo, useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { useSetAtom } from 'jotai';
import { AppWindow, MessageCircleDashed } from 'lucide-react';
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
import store from '~/store';

/** `label` is the chip caption; `text` is the message that gets sent. */
type Starter = { label: string; text: string };

/**
 * A chip either SENDS a prompt or DOES something. Both were always in this row —
 * "Build an app" leaves for the builder rather than sending anything — but the
 * action was hand-written after the loop, so the row was one list plus an
 * exception. Two kinds in ONE list means the order is a property of the list and
 * an action can sit anywhere in it, which is what lets the row lead with what
 * you can DO and follow with what you can ask.
 */
type Chip = { label: string; icon?: React.ReactNode; solid?: boolean } & (
  | { text: string; act?: never }
  | { act: () => void; text?: never }
);

/**
 * Curated fallback prompts for plain-model chats (no agent/assistant-specific
 * starters). Clicking one SENDS it, so every `text` is a complete, standalone
 * prompt that stands on its own — the short `label` is only the caption.
 *
 * Two, not four. Each names a DIFFERENT thing this product does — it writes and
 * runs code, and it makes pictures — where Summarize / Explain / Brainstorm were
 * three ways of saying "it answers questions", which the composer above them
 * already says. The row is what the app can do that you might not guess.
 */
const DEFAULT_STARTERS: Starter[] = [
  {
    label: 'Write code',
    text: 'Write a Python script that renames every file in a folder to a slugified version of its name.',
  },
  {
    label: 'Make an image',
    text: 'Make an image of a paper boat crossing a puddle at night, lit by a streetlight.',
  },
];

const ConversationStarters = () => {
  const localize = useLocalize();
  const { user } = useAuthContext();
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
  const setIsTemporary = useSetAtom(store.isTemporary);

  /**
   * The row, in the order a first-time reader should meet it: what you can DO,
   * then what you can ASK.
   *
   * The two actions only join a DEFAULT row. An agent's author wrote their
   * starters and did not ask for a builder handoff or a privacy switch beside
   * them, so an authored row is left exactly as authored.
   */
  const chips: Chip[] = useMemo(() => {
    const prompts: Chip[] = starters
      .slice(0, Constants.MAX_CONVO_STARTERS)
      .map(({ label, text }) => ({ label, text }));
    if (!isDefault) {
      return prompts;
    }
    return [
      {
        label: localize('com_ui_build_app'),
        icon: <AppWindow className="icon-sm" aria-hidden="true" />,
        act: openBuilder,
      },
      {
        label: localize('com_ui_temporary'),
        icon: <MessageCircleDashed className="icon-sm" aria-hidden="true" />,
        // SOLID, like the composer it turns black. Private is the one surface in
        // this app you cannot see through, and the chip that switches it on is
        // the first place that rule is visible — so the row shows you what you
        // are about to get before you get it.
        solid: true,
        act: () => setIsTemporary(true),
      },
      ...prompts,
    ];
  }, [isDefault, starters, localize, openBuilder, setIsTemporary]);

  if (!chips.length) {
    return null;
  }

  return (
    <>
      <div className="mx-auto mt-5 flex w-full max-w-2xl flex-wrap items-center justify-center gap-1.5 px-4">
      {chips.map(({ label, text, act, icon, solid }, index) => (
        <button
          key={index}
          onClick={() => (act ? act() : send(text as string))}
          disabled={isSubmitting && act == null}
          title={label}
          className={cn(
            // `glass hz-chip` — the same material family as the composer, but a
            // lighter liquid-glass fill (see style.css) so the landing video
            // reads through the suggestions instead of dark slabs on the hero.
            'inline-flex min-h-11 max-w-full items-center gap-1 truncate rounded-full px-3 py-1.5 text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            solid === true ? 'border border-border-medium bg-black' : 'glass hz-chip',
            // On a phone the row is ONE row, never an orphan: the first two
            // chips show and the rest step out. Indexing the RENDERED list is
            // what keeps that true — the old rule counted prompts and then let
            // the build chip through separately, so it depended on how many
            // prompts happened to exist and on whether anyone was signed in.
            index >= 2 && 'max-sm:hidden',
          )}
        >
          {icon}
          {label}
        </button>
      ))}
      </div>
      {/* No closing pitch under the chips. A "Ship your first app today" action
          line used to sit here, and it went to the SAME builder the "Build an
          app" chip goes to — one destination wearing two controls, stacked one
          above the other. The chip is the one that stays: it sits with its
          siblings, so the row reads as a set of things you can do rather than a
          set plus an advertisement for one of them. */}
    </>
  );
};

export default ConversationStarters;
