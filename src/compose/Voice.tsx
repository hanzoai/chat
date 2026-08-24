/**
 * Dictation — a way of typing, not a spoken conversation.
 *
 * One press opens the microphone; a second closes it, and what was said stays
 * in the box for the reader to check and send themselves. NOTHING IS AUTO-SENT
 * and no reply is read back. `@hanzo/voice` can run a whole spoken conversation
 * — its `onUtterance` is documented as "send this" — and the one decision this
 * file makes is not to: a composer microphone is for writing, and a control
 * that sometimes writes and sometimes sends is the one nobody can describe.
 *
 * The machine is `@hanzo/voice`, shared with every other Hanzo surface, so the
 * browser recogniser, the platform transcriber, the fallback between them and
 * the reasons voice cannot run are answered once for the estate. The chrome is
 * this app's, because the package's own button is an unstyled `<button>` meant
 * to be dressed by whoever mounts it.
 *
 * What is NOT here: a canvas waveform. Two hundred lines to say what a button
 * that has changed shape already says.
 */
import { Button, Spinner } from '@hanzo/ui'
import { useVoice, type Speech } from '@hanzo/voice'
import { Mic, Square } from '@hanzogui/lucide-icons-2'
import { useCallback, useMemo, useRef } from 'react'

import { api } from '~/data/api'
import { http } from '~/data/http'

export interface VoiceProps {
  disabled?: boolean
  /** What is in the box now. Dictation appends to it rather than replacing it —
   *  a sentence typed before somebody reached for the microphone is theirs. */
  text: string
  /** The whole draft, rewritten as the transcript grows. A partial REPLACES the
   *  last partial, so this cannot be an append. */
  onText: (text: string) => void
  onTrouble?: (say: string) => void
}

export const Voice = ({ disabled = false, text, onText, onTrouble }: VoiceProps) => {
  // The draft as of this render, readable from inside a callback that was
  // created several utterances ago.
  const now = useRef(text)
  now.current = text

  // Everything dictation has settled so far, including whatever was already in
  // the box. Live partials are appended to THIS, so a pause never rewrites the
  // sentence before it. Null until the first word — the box is only read once,
  // at the start, or every partial would re-read text it just wrote.
  const before = useRef<string | null>(null)
  const join = useCallback((heard: string) => {
    const held = before.current
    return held ? `${held} ${heard}` : heard
  }, [])

  /**
   * Our half of the platform's speech service: audio in, text out.
   *
   * The package never owns a credential — each surface authenticates
   * differently — so this is where the one HTTP client fills that in.
   */
  const speech = useMemo<Speech>(
    () => ({
      transcribe: async (audio) => {
        const form = new FormData()
        form.append('audio', audio, 'turn.webm')
        const said = await http.form<{ text?: string }>(api.files.listen, form)
        return said.text?.trim() ?? ''
      },
    }),
    [],
  )

  const voice = useVoice({
    speech,
    onPartial: (heard) => {
      if (before.current === null) before.current = now.current.trim()
      onText(join(heard))
    },
    onUtterance: (said) => {
      // Settle it: the box already shows it, and folding it in means the next
      // partial appends rather than overwriting this sentence.
      if (before.current === null) before.current = now.current.trim()
      before.current = join(said)
      onText(before.current)
    },
    // A platform service that refuses sounds exactly like one that works — the
    // browser stands in and the words keep arriving. Only this says otherwise.
    onRefusal: (refusal) => onTrouble?.(refusal.error.message),
  })

  const open = voice.open
  if (!open && before.current !== null) before.current = null

  return (
    <Button
      // The ring is the state. A colour would have to be spelled onto the
      // label, and a label inside a Button resolves its colour from the theme
      // scope the Button mounts — where the token means something quieter than
      // it does outside. The variant paints both halves, correctly, by itself.
      variant={open ? 'outline' : 'ghost'}
      size="icon-sm"
      // Voice that cannot run keeps its control and wears the reason. One that
      // disappears teaches nobody anything, and "where did the microphone go"
      // is a worse question than "why is it off".
      disabled={disabled || voice.blocked !== null}
      title={voice.reason ?? undefined}
      aria-label={open ? 'Stop dictating' : (voice.reason ?? 'Dictate')}
      aria-pressed={open}
      onPress={voice.toggle}
      data-testid="voice"
    >
      {voice.state === 'speaking' ? (
        <Spinner size={14} />
      ) : open ? (
        <Square size={14} />
      ) : (
        <Mic size={16} />
      )}
    </Button>
  )
}
