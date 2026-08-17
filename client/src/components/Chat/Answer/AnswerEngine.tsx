import { useCallback, useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useSearchParams } from 'react-router-dom';
import type { SearchMode } from '@hanzo/ai';
import { useLocalize, useAuthContext } from '~/hooks';
import useAnswer from '~/hooks/useAnswer';
import { cn } from '~/utils';
import { COLUMN } from '~/components/chrome';
import store from '~/store';
import ChatForm from '~/components/Chat/Input/ChatForm';
import ConversationStarters from '~/components/Chat/Input/ConversationStarters';
import { Notice } from '~/components/Free';
import AnswerComposer from './AnswerComposer';
import AnswerView from './AnswerView';
import Modes from './Modes';

/**
 * The answer engine — hanzo.chat's default surface.
 *
 * One mode switch over TWO composers, each the real thing for its job:
 *
 *   chat  -> the actual ChatForm. Not a re-implementation: attachments, the
 *            `/build` and `/agent` command interception, `?prompt=`/`?q=`/
 *            `?submit=` query-param prefill and the `?project=` opener all live
 *            in that component, and routing chat through anything else silently
 *            drops them.
 *   web   -> AnswerComposer, which streams a grounded, cited answer in place.
 *
 * Rendered only on the landing (no messages yet), so nothing here can touch an
 * existing conversation — the moment a thread exists this branch is gone.
 */
/**
 * Query params that mean "this visit is a CHAT", not a search.
 *
 * `?prompt=`/`?q=`/`?submit=` are read by useQueryParams and `?project=` seeds
 * the composer's default value — all of them inside ChatForm, which only mounts
 * in chat mode. Chat is the default now, so this no longer decides the FIRST
 * paint; it forces a visitor who has since switched to a web mode back into chat
 * when a link like `/c/new?q=…&submit=true` is opened client-side, which would
 * otherwise prefill a field nobody rendered.
 */
const CHAT_PARAMS = ['prompt', 'q', 'submit', 'project'];

/** `label` is the chip caption; `text` is the ask that gets run. */
type Starter = { label: string; text: string };

/**
 * Suggestions for the web modes, one set per mode, shown under the composer the
 * way chat shows its starters. Clicking one RUNS it, so every `text` is a
 * complete, standalone ask. ConversationStarters is not reused here — that
 * component is chat-coupled (it sends through the chat form and carries the
 * app-builder handoff), and the builder funnel stays chat-only on purpose.
 */
const MODE_STARTERS: Partial<Record<SearchMode, Starter[]>> = {
  search: [
    { label: 'Espresso machines', text: 'What is the best espresso machine under $400, according to recent reviews?' },
    { label: 'Daily protein', text: 'How much protein per day does an active adult actually need?' },
    { label: 'Fewest delays', text: 'Which US airlines had the fewest delays this year?' },
    { label: 'EV: lease or buy', text: 'Is it cheaper to lease or buy an electric car right now?' },
  ],
  news: [
    { label: 'AI this week', text: 'What are the biggest AI announcements this week?' },
    { label: 'World briefing', text: 'Brief me on the top world stories today.' },
    { label: 'Markets today', text: 'What moved the markets today, and why?' },
    { label: 'Space', text: 'What launches and discoveries happened in space this week?' },
  ],
  research: [
    { label: 'Solid-state batteries', text: 'Write a brief on how solid-state batteries change EV economics over the next decade.' },
    { label: 'Carbon removal', text: 'Compare the leading carbon removal approaches — cost per ton, scale today, and who funds each.' },
    { label: 'AI regulation', text: 'How do the EU AI Act and current US policy differ on frontier-model rules?' },
    { label: 'Creator economy', text: 'Map the creator economy: major platforms, their take rates, and where the money flows.' },
  ],
};

export default function AnswerEngine({ index = 0 }: { index?: number }) {
  const localize = useLocalize();
  const maximizeChatSpace = useAtomValue(store.maximizeChatSpace);
  const answer = useAnswer();
  const { isAuthenticated } = useAuthContext();

  // Read through react-router, the same source useQueryParams reads, so a
  // client-side navigation to a chat link switches modes too — a one-time read of
  // window.location would only ever catch a full page load.
  const [searchParams] = useSearchParams();
  const chatIntent = CHAT_PARAMS.some((k) => searchParams.has(k));

  /**
   * `chat` is the default because it is the mode that WORKS for the visitor who
   * arrives with nothing. Chat is the guest-scoped preview (`ALLOW_GUEST_CHAT`,
   * `GUEST_MODEL`) and, when even that is refused, its submit path opens the login
   * gate — the one component built for a not-signed-in outcome. `search` relays to
   * cloud `/v1/ask`, which needs a real principal: an anonymous visitor's FIRST
   * message was a 401 rendered as an inline error, every time. It is also what the
   * chips already say — `chat` is listed first, as the thing this product is.
   */
  const [mode, setMode] = useState<SearchMode | 'chat'>('chat');

  // Only ever forces INTO chat: useQueryParams consumes and clears the params
  // once ChatForm has them, and that must not bounce the user back out.
  useEffect(() => {
    if (chatIntent) {
      setMode('chat');
    }
  }, [chatIntent]);
  // Empty until the real catalog resolves; the composer selects the first model
  // the caller is actually entitled to.
  const [model, setModel] = useState('');
  const [sources, setSources] = useState<string[]>([]);

  const toggleSource = useCallback((s: string) => {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const isChat = mode === 'chat';
  const hasResult = answer.query !== '';
  const { run, stop } = answer;

  // Leaving a web mode hides both the answer and its Stop button, so the switch
  // is the last chance to end the run — otherwise a billed stream finishes with
  // nothing on screen and no way to reach it.
  const changeMode = useCallback(
    (m: SearchMode | 'chat') => {
      // Side effect stays OUT of the updater — an updater must be pure, and
      // React invokes it twice under StrictMode.
      if (m !== mode && mode !== 'chat') {
        stop();
      }
      setMode(m);
    },
    [mode, stop],
  );

  const ask = useCallback(
    (text: string, m: SearchMode) => run(text, { mode: m, model: model || undefined, sources }),
    [run, model, sources],
  );

  // The column tracks the composer's OWN width law (COLUMN, shared with
  // ChatForm) so the box is the same size here as in a live thread — and so
  // "maximize chat space" reaches the landing at all. A bare max-w-3xl here
  // silently narrowed it, and sending the first message — which swaps this
  // landing for the docked ChatForm — snapped it 128px wider. The greeting and
  // mode tabs are centered, so the extra room on a wide screen costs them
  // nothing.
  return (
    <div className={cn('mx-auto flex h-full w-full flex-col px-3 sm:px-4', COLUMN(maximizeChatSpace))}>
      {hasResult && !isChat ? (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <AnswerView
            query={answer.query}
            answer={answer.answer}
            sources={answer.sources}
            followUps={answer.followUps}
            status={answer.status}
            isLoading={answer.isLoading}
            onFollowUp={(q) => ask(q, mode as SearchMode)}
          />
          {answer.error && <ErrorNotice message={answer.error} needsSignIn={answer.needsSignIn} />}
        </div>
      ) : (
        // Centred at every width. It used to sit at the bottom of its column on a
        // phone (`justify-end`), which parked the line directly on top of the
        // composer under a screen and a half of empty black — the greeting read
        // as a caption for the input rather than as the page's opening.
        <div className="flex flex-1 flex-col items-center justify-center pb-6">
          <h1 className="text-balance px-2 text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            {localize('com_ui_landing_title')}
          </h1>
          {/* WHAT IT IS, on the surface two other properties' primary action
              lands on. The page opened with "Explore new worlds." and then went
              straight to the terms — atmosphere, then price, and nothing in
              between saying what happens if you type here. hanzo.ai/chat already
              publishes this exact sentence, so the product and the page selling
              it stop describing different things.

              Shown to EVERYONE, unlike the line below it: what the thing does is
              true of a signed-in reader too, and it is the sentence a shared link
              arrives on.

              Above the terms, because "what is this" is the question a stranger
              has first; free-and-no-account is the answer to their second. */}
          <p className="mt-3 max-w-xl text-balance px-4 text-center text-sm text-text-secondary sm:text-base">
            {localize('com_ui_landing_lead')}
          </p>
          {/* The one fact a signed-out reader cannot see from the composer: that
              typing in it costs nothing and asks for no account. The preview has
              worked this way the whole time and the page never said so, which
              leaves every visitor to guess whether the box will stop and demand
              a card.

              No message count. The allowance is `GUEST_MESSAGE_MAX` and moves
              with the deployment, so a number written here is a promise this
              line has no way to keep. Signed in, the sentence is not true of
              them and is not shown. */}
          {!isAuthenticated && (
            <p className="mt-3 px-2 text-center text-sm text-text-secondary">
              {localize('com_ui_landing_free')}
            </p>
          )}
        </div>
      )}

      {/* The composer must not move when the mode does. This block is the last
          thing in a flex column, so its TOP is the container's bottom minus its
          own height — which means anything that renders BELOW the composer
          decides where the composer sits. The two composers differ in height by
          their own control rows (and, before the web modes had starters of
          their own, by chat's starter row), so picking Search dropped the input
          83px on the very pointer that was reaching for it (measured, 1440x900
          and 390x844).

          Reserving chat mode's natural height pins the top edge instead: the
          rows above the composer are identical in every mode, so the composer
          lands in the same place and the surplus falls below it, where there is
          nothing to move. `min-h` rather than `h` so a wrapped starter row can
          still grow rather than overflow — and the floor has to clear chat
          mode's TALLEST natural height, not its height at one width: at 768 and
          1024 the starter row wraps, 260 stopped binding, and the drift came
          back at 6px. */}
      <div className="min-h-[280px] shrink-0 pb-3 pt-2">
        {/* The offer to continue on Free, with the composer that carries the next
            message — where the thread view keeps it too. This screen is the one a
            first message of the day is sent from, so it is where a spent balance
            is met, and the offer has to be heard here or it is not heard at all. */}
        <Notice />
        {/* The mode row is the one thing on the arrival screen that is about the
            product rather than the visitor's question, and a phone has no room to
            spend on it before they have asked anything. It returns the moment
            there is a session — and at every width above a phone. */}
        <div className={cn('mb-2 px-1', !isAuthenticated && 'max-sm:hidden')}>
          <Modes mode={mode} setMode={changeMode} />
        </div>

        {isChat ? (
          <>
            <ChatForm index={index} />
            <ConversationStarters />
          </>
        ) : (
          <>
            <AnswerComposer
              model={model}
              setModel={setModel}
              sources={sources}
              toggleSource={toggleSource}
              isLoading={answer.isLoading}
              onSubmit={(text) => ask(text, mode as SearchMode)}
              onStop={answer.stop}
            />
            {!hasResult && (
              <ModeStarters mode={mode as SearchMode} disabled={answer.isLoading} ask={ask} />
            )}
            {hasResult && (
              <button
                type="button"
                onClick={answer.reset}
                className="mt-2 w-full text-center text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                {localize('com_answer_new_search')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The web modes' starter row. Chips match ConversationStarters' exactly — same
 * glass, same signed-out phone trim (one example, the rest `max-sm:hidden`) —
 * so switching modes changes the suggestions, not the furniture. No "Build an
 * app" chip and no ship-your-first-app line here: those seed a CHAT.
 */
function ModeStarters({
  mode,
  disabled,
  ask,
}: {
  mode: SearchMode;
  disabled: boolean;
  ask: (text: string, mode: SearchMode) => void;
}) {
  const { isAuthenticated } = useAuthContext();
  const starters = MODE_STARTERS[mode] ?? [];

  if (!starters.length) {
    return null;
  }

  return (
    <div className="mx-auto mt-5 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 px-4">
      {starters.map(({ label, text }, index) => (
        <button
          key={index}
          type="button"
          onClick={() => ask(text, mode)}
          disabled={disabled}
          title={text}
          className={cn(
            'glass min-h-11 max-w-full truncate rounded-full px-4 py-2 text-sm text-text-secondary transition-colors duration-200 hover:bg-surface-active-alt hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            index > 0 && !isAuthenticated && 'max-sm:hidden',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** An honest failure, with the one action that resolves it when there is one. */
function ErrorNotice({ message, needsSignIn }: { message: string; needsSignIn: boolean }) {
  const localize = useLocalize();
  return (
    <div className="mb-4 rounded-xl border border-border-medium bg-surface-secondary p-4 text-sm text-text-primary">
      <p>{message}</p>
      {needsSignIn && (
        <a
          href="/login"
          className="mt-3 inline-flex items-center rounded-full border border-surface-submit-hover bg-surface-submit px-4 py-2 text-sm font-medium text-white"
        >
          {localize('com_answer_sign_in')}
        </a>
      )}
    </div>
  );
}
