import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchMode } from '@hanzo/ai';
import { useLocalize } from '~/hooks';
import useAnswer from '~/hooks/useAnswer';
import ChatForm from '~/components/Chat/Input/ChatForm';
import ConversationStarters from '~/components/Chat/Input/ConversationStarters';
import AnswerComposer from './AnswerComposer';
import AnswerView from './AnswerView';
import ModeChips from './ModeChips';

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

export default function AnswerEngine({ index = 0 }: { index?: number }) {
  const localize = useLocalize();
  const answer = useAnswer();

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

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-4">
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
        <div className="flex flex-1 flex-col items-center justify-end pb-6 sm:justify-center">
          <h1 className="text-balance px-2 text-center text-3xl font-medium tracking-tight text-text-primary sm:text-4xl">
            {localize('com_ui_landing_title')}
          </h1>
        </div>
      )}

      <div className="shrink-0 pb-3 pt-2">
        <div className="mb-2 px-1">
          <ModeChips mode={mode} setMode={changeMode} />
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
