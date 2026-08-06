import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Voice, useVoice, type Speech } from '@hanzo/voice';
import { dataService } from '@hanzochat/data-provider';
import { useToastContext } from '@hanzochat/client';

import { useChatFormContext } from '~/Providers';
import { useGetAudioSettings, useLocalize } from '~/hooks';
import { getLatestText, cn } from '~/utils';
import store from '~/store';

/**
 * The composer's microphone — one click starts a conversation, the next ends it.
 *
 * The machine is `@hanzo/voice`, the same one hanzo.app's builder uses: the
 * transcript streams into this composer as it is heard, each pause is sent
 * through `ask` (the composer's own submit path, never a second one), the reply
 * is read back, and speaking over the reply stops it and starts the next turn.
 *
 * Speech itself is whatever `speech:` in chat.yaml points at — the platform's
 * `/v1/audio/*` — reached through the routes this server already has. With no
 * `speech:` configured the browser's own recogniser and voice stand in, which
 * is exactly what happened before this control existed.
 */
export default function Mic({
  disabled,
  ask,
  isSubmitting,
  index = 0,
  onLive,
}: {
  disabled: boolean;
  ask: (data: { text: string }) => void;
  isSubmitting: boolean;
  index?: number;
  /** Reported up so the composer can leave the reply to this control. */
  onLive?: (live: boolean) => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { setValue, getValues, reset } = useChatFormContext();
  const { speechToTextEndpoint, textToSpeechEndpoint } = useGetAudioSettings();
  const chosenVoice = useAtomValue(store.voice);
  const latestMessage = useAtomValue(store.latestMessageFamily(index));

  // Configured speech goes through this server's own speech routes; anything
  // unconfigured is simply absent, and the browser leg covers it.
  const speech = useMemo<Speech | undefined>(() => {
    const configured: Partial<Speech> = {};
    if (speechToTextEndpoint === 'external') {
      configured.transcribe = async (audio) => {
        const form = new FormData();
        form.append('audio', audio, 'turn.webm');
        const { text } = await dataService.speechToText(form);
        return text ?? '';
      };
    }
    if (textToSpeechEndpoint === 'external') {
      configured.speak = async (text) => {
        const form = new FormData();
        form.append('input', text);
        form.append('voice', chosenVoice ?? '');
        const audio = await dataService.textToSpeech(form);
        return new Blob([audio], { type: 'audio/mpeg' });
      };
    }
    return configured.transcribe || configured.speak ? (configured as Speech) : undefined;
  }, [speechToTextEndpoint, textToSpeechEndpoint, chosenVoice]);

  // Whatever was already typed is kept: the transcript is appended to it, and
  // the turn that gets sent is the whole line, exactly as if it had been typed.
  const kept = useRef<string | null>(null);
  const join = useCallback((heard: string) => {
    const before = kept.current;
    return before ? `${before} ${heard}` : heard;
  }, []);

  const submitting = useRef(isSubmitting);
  submitting.current = isSubmitting;

  const voice = useVoice({
    speech,
    // The reading voice, for the browser leg; the platform leg carries it in
    // the request instead (see `speak` above).
    voice: chosenVoice ?? undefined,
    onPartial: (heard) => {
      if (kept.current === null) kept.current = (getValues('text') || '').trim();
      setValue('text', join(heard), { shouldValidate: true });
    },
    onUtterance: (said) => {
      const turn = join(said);
      kept.current = null;
      if (submitting.current) {
        showToast({ message: localize('com_ui_speech_while_submitting'), status: 'error' });
        return;
      }
      ask({ text: turn });
      reset({ text: '' });
    },
  });

  useEffect(() => onLive?.(voice.open), [voice.open, onLive]);

  // Read the settled reply back. `say` is a no-op outside a conversation, so a
  // typed turn stays silent without anyone here asking whether it was spoken.
  const read = useRef<string | null>(null);
  useEffect(() => {
    if (isSubmitting || !latestMessage || latestMessage.isCreatedByUser) return;
    const text = getLatestText(latestMessage);
    const id = latestMessage.messageId;
    if (!text || !id || read.current === id) return;
    read.current = id;
    void voice.say(text);
  }, [isSubmitting, latestMessage, voice]);

  return (
    <Voice
      voice={voice}
      disabled={disabled}
      className={cn(
        // Off: a static white mic. Listening: the mic itself carries the state,
        // flashing white–green; the cursor over it turns it solid red — the
        // stop affordance, said in color where a tooltip would be too late.
        'flex size-9 items-center justify-center rounded-full p-1 text-white transition-colors',
        'hover:bg-surface-hover disabled:opacity-40',
        'data-[state=listening]:animate-[hzMicFlash_1.1s_ease-in-out_infinite]',
        'data-[state=listening]:hover:animate-none data-[state=listening]:hover:text-red-500',
        'data-[state=speaking]:animate-pulse motion-reduce:animate-none',
        'motion-reduce:data-[state=listening]:text-green-400',
        '[&_svg]:size-5',
      )}
    />
  );
}
