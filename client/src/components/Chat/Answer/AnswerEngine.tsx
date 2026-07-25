import { useCallback, useState } from 'react';
import type { SearchMode } from '@hanzo/ai';
import { useSubmitMessage, useLocalize } from '~/hooks';
import useAnswer from '~/hooks/useAnswer';
import AnswerComposer from './AnswerComposer';
import AnswerView from './AnswerView';

/**
 * The answer engine — hanzo.chat's default surface.
 *
 * ONE input, mode-switched. `Chat` hands the text to the normal conversation flow
 * (`useSubmitMessage`, the same call the standard composer makes), so chat is
 * unchanged and a real thread takes over the view the moment it exists. Every
 * other mode runs the grounded answer engine through `/v1/chat/ask` and streams
 * sources, a cited answer, and follow-ups in place.
 *
 * Rendered only on the landing (no messages yet), so nothing here can touch an
 * existing conversation.
 */
export default function AnswerEngine() {
  const localize = useLocalize();
  const { submitMessage } = useSubmitMessage();
  const answer = useAnswer();

  const [mode, setMode] = useState<SearchMode | 'chat'>('search');
  const [model, setModel] = useState('enso');
  const [sources, setSources] = useState<string[]>([]);

  const toggleSource = useCallback((s: string) => {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const handleSubmit = useCallback(
    (text: string) => {
      if (mode === 'chat') {
        submitMessage({ text });
        return;
      }
      answer.run(text, { mode, model, sources });
    },
    [mode, model, sources, submitMessage, answer],
  );

  const hasResult = answer.query !== '';

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-4">
      {hasResult ? (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <AnswerView
            query={answer.query}
            answer={answer.answer}
            sources={answer.sources}
            followUps={answer.followUps}
            status={answer.status}
            isLoading={answer.isLoading}
            onFollowUp={(q) => answer.run(q, { mode: mode as SearchMode, model, sources })}
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
        <AnswerComposer
          mode={mode}
          setMode={setMode}
          model={model}
          setModel={setModel}
          sources={sources}
          toggleSource={toggleSource}
          isLoading={answer.isLoading}
          onSubmit={handleSubmit}
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
          className="mt-3 inline-flex items-center rounded-full bg-text-primary px-4 py-2 text-sm font-medium text-surface-primary"
        >
          {localize('com_answer_sign_in')}
        </a>
      )}
    </div>
  );
}
