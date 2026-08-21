import { memo, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { useLocalize } from '~/hooks';
import { BEAT_MS, beats, quipFor, speaksEnglish } from './quips';
import store from '~/store';

/**
 * What the assistant shows once it is answering and has produced no text yet.
 *
 * It was a pulsing dot, which says the same nothing however long you wait. A
 * quip advances a beat at a time instead, so the wait tells you it is a wait
 * and a long one earns its punchline. The last beat holds — the joke is over,
 * and the text being there at all is the signal the dot was carrying.
 *
 * `Quip` is the indicator; `EmptyTextPart` is that indicator inside the
 * message body a content part sits in. Three places drew this dot from three
 * copies of the same markup, which is how one of them came to be missing the
 * `submitting` class its own CSS selects on and drew nothing at all.
 */

/** The indicator itself: the words, or — while empty — the dot. */
export const Quip = memo(() => {
  const localize = useLocalize();
  const { i18n } = useTranslation();
  const english = speaksEnglish(i18n.language);

  /**
   * One quip per answer, chosen ON MOUNT from the pool the prompt earns, and
   * kept for as long as it streams.
   *
   * The prompt is read straight off the live submission rather than passed in:
   * this component takes no props and has three call sites, and threading the
   * same string through all three would be three chances for one of them to
   * forget and quietly go back to generic.
   *
   * `useState`'s initializer runs once, so the quip cannot be re-rolled by a
   * re-render — a joke that changed mid-beat would lose its own punchline.
   */
  const submission = useAtomValue(store.submission);
  const [quip] = useState(() => quipFor(submission?.userMessage?.text));
  const parts = useMemo(() => beats(quip), [quip]);
  const [beat, setBeat] = useState(0);
  const last = beat >= parts.length - 1;

  useEffect(() => {
    if (!english || last) {
      return;
    }
    const advance = setTimeout(() => setBeat((b) => b + 1), BEAT_MS);
    return () => clearTimeout(advance);
    // `beat` is a dependency because the timer is a CHAIN: each beat schedules
    // the next when it lands. Depending on `last` alone, the effect does not
    // re-run between beats and the quip stops one beat in.
  }, [english, last, beat]);

  return (
    // `submitting` is not decoration — the dot's rule is
    // `.submitting .result-thinking:empty:after`, so without it the empty span
    // draws nothing.
    <p className="submitting relative">
      {/* Empty, this span IS the dot — which is what a UI in a language these
          jokes were not written in still gets. */}
      <span className="result-thinking text-sm text-text-secondary">
        {english ? (
          <>
            {/* A beat is a joke, not a status. Announcing each one would read
                four fragments a second apart to a screen reader, so it hears
                the plain word once and the eye gets the joke. */}
            {/* The quip SHIMMERS and the dots MOVE, because the one question
                this state answers is "is anything happening". A static line
                with a literal ellipsis answered "no" for the whole wait. */}
            <span aria-hidden={true} className="shimmer">
              {parts[beat]}
            </span>
            {!last && (
              <span className="thinking-dots" aria-hidden={true}>
                <i />
                <i />
                <i />
              </span>
            )}
            <span className="sr-only">{localize('com_ui_thinking')}</span>
          </>
        ) : null}
      </span>
    </p>
  );
});

/** The indicator in the place a content part would have been. */
const EmptyTextPart = memo(() => (
  <div className="text-message mb-[0.625rem] flex min-h-[20px] flex-col items-start gap-3 overflow-visible">
    <div className="markdown prose dark:prose-invert w-full break-words dark:text-gray-100">
      <Quip />
    </div>
  </div>
));

export default EmptyTextPart;
