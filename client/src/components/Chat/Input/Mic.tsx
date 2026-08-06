import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useVoice, type Speech } from '@hanzo/voice';
import { dataService } from '@hanzochat/data-provider';
import { TooltipAnchor, useToastContext } from '@hanzochat/client';

import { useChatFormContext } from '~/Providers';
import { useGetAudioSettings, useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { cn } from '~/utils';
import store from '~/store';

/**
 * The composer's microphone — DICTATION, not a spoken conversation.
 *
 * One click opens the mic and shows a live waveform of what it is hearing; the
 * transcript streams into the composer as you speak and STAYS there. A second
 * click (the stop square) ends it and leaves the text in the box for you to
 * read and send yourself. Nothing is auto-sent and no reply is read back —
 * this is a way of typing with your voice, which is what a composer mic is for.
 *
 * The machine is still `@hanzo/voice` (shared with hanzo.app): its `onLevel`
 * drives the waveform, its partials fill the composer, and each settled
 * utterance is committed so the next one appends after it instead of replacing.
 */

/** How many bars the waveform holds. The newest level enters on the right. */
const BARS = 48;

/** A dictation shorter than this that heard nothing is just a misclick; past
 *  it, silence means the browser's speech engine produced no words at all. */
const SILENT_MS = 2000;

export default function Mic({
  disabled,
  onRecordingChange,
}: {
  disabled: boolean;
  /** Told when dictation opens/closes so the composer row can clear itself and
   *  give the waveform the full width. */
  onRecordingChange?: (open: boolean) => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { setValue, getValues } = useChatFormContext();
  const { speechToTextEndpoint } = useGetAudioSettings();
  const chosenVoice = useAtomValue(store.voice);

  const speech = useMemo<Speech | undefined>(() => {
    if (speechToTextEndpoint !== 'external') {
      return undefined;
    }
    return {
      transcribe: async (audio) => {
        const form = new FormData();
        form.append('audio', audio, 'turn.webm');
        const { text } = await dataService.speechToText(form);
        return text ?? '';
      },
    };
  }, [speechToTextEndpoint]);

  // The text that was already in the composer, plus every settled utterance so
  // far. Live partials are appended to THIS, so a pause never rewrites what was
  // already dictated.
  const kept = useRef<string | null>(null);
  const join = useCallback((heard: string) => {
    const before = kept.current;
    return before ? `${before} ${heard}` : heard;
  }, []);

  // The waveform samples live in a ref (onLevel fires ~60/s) and are flushed to
  // state on an interval, so the mic draws at a cheap ~16fps instead of
  // re-rendering the whole composer on every animation frame.
  const samples = useRef<number[]>(new Array(BARS).fill(0));
  const [bars, setBars] = useState<number[]>(samples.current);
  const [elapsed, setElapsed] = useState(0);

  // Whether the engine returned a single word this session. Brave records
  // audio happily but ships its speech engine disabled, so a dictation can run
  // for minutes and insert nothing — with no error from anywhere. The close
  // handler below names that instead of letting it pass as a mystery.
  const spoken = useRef(false);
  const openedAt = useRef(0);

  const voice = useVoice({
    speech,
    onLevel: (value) => {
      samples.current = [...samples.current.slice(1), value];
    },
    onPartial: (heard) => {
      spoken.current = true;
      if (kept.current === null) {
        kept.current = (getValues('text') || '').trim();
      }
      setValue('text', join(heard), { shouldValidate: true });
    },
    onUtterance: (said) => {
      // Commit it: the composer already shows it, and folding it into `kept`
      // means the next partial appends rather than replacing this sentence.
      spoken.current = true;
      kept.current = join(said);
      setValue('text', kept.current, { shouldValidate: true });
    },
  });

  // Let the composer row know, so it can hand the recorder the full width.
  useEffect(() => {
    onRecordingChange?.(voice.open);
  }, [voice.open, onRecordingChange]);

  useEffect(() => {
    if (!voice.open) {
      // Ended without one word, after a real attempt (a shorter run is a
      // misclick). The recording worked; the transcription never did.
      if (
        openedAt.current > 0 &&
        !spoken.current &&
        performance.now() - openedAt.current >= SILENT_MS
      ) {
        showToast({
          message: localize('com_ui_dictation_nothing'),
          severity: NotificationSeverity.WARNING,
        });
      }
      openedAt.current = 0;
      kept.current = null;
      samples.current = new Array(BARS).fill(0);
      setBars(samples.current);
      setElapsed(0);
      return;
    }
    spoken.current = false;
    openedAt.current = performance.now();
    const draw = setInterval(() => setBars([...samples.current]), 60);
    const clock = setInterval(
      () => setElapsed(Math.floor((performance.now() - openedAt.current) / 1000)),
      250,
    );
    return () => {
      clearInterval(draw);
      clearInterval(clock);
    };
    // `showToast` (context) and `localize` are not identity-stable; listing
    // them would re-run this effect mid-dictation and reset the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.open]);

  if (voice.open) {
    const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    return (
      // Dictation takes the WHOLE row: `flex-1` grows the recorder across the
      // composer so the waveform spans the full width instead of a thumbnail
      // crammed by the send button. The bars pack at a fixed 3px rhythm and
      // center in that room — spread edge-to-edge (`justify-between`) they
      // drifted apart on a wide screen and read as a row of dots, not sound.
      // A phone is the other way: the packed row is wider than the space, so
      // it clips symmetrically at the edges instead of overflowing.
      <div className="flex flex-1 items-center gap-3 pr-1" aria-label={localize('com_ui_dictating')}>
        <div
          className="flex h-9 flex-1 items-center justify-center gap-[3px] overflow-hidden"
          aria-hidden="true"
        >
          {bars.map((v, i) => (
            <span
              key={i}
              className="w-[3px] shrink-0 rounded-full bg-white"
              style={{ height: `${Math.max(4, Math.round(v * 34))}px`, opacity: 0.45 + v * 0.55 }}
            />
          ))}
        </div>
        <span className="tabular-nums text-xs text-text-secondary">{`${mm}:${ss}`}</span>
        <TooltipAnchor
          description={localize('com_ui_dictation_stop')}
          render={
            <button
              type="button"
              aria-label={localize('com_ui_dictation_stop')}
              onClick={voice.toggle}
              className="flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-surface-hover"
            >
              {/* White, not red: stopping dictation keeps the text — it is not
                  a destructive act, and red was the one warm pixel in the row. */}
              <span className="block size-3.5 rounded-[3px] bg-white" />
            </button>
          }
        />
      </div>
    );
  }

  return (
    <TooltipAnchor
      description={voice.reason ?? localize('com_ui_dictate')}
      render={
        <button
          type="button"
          aria-label={voice.reason ?? localize('com_ui_dictate')}
          disabled={disabled || !!voice.blocked}
          onClick={voice.toggle}
          className={cn(
            'flex size-9 items-center justify-center rounded-full p-1 text-white transition-colors',
            'hover:bg-surface-hover disabled:opacity-40 [&_svg]:size-5',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <path d="M12 19v3" />
          </svg>
        </button>
      }
    />
  );
}
