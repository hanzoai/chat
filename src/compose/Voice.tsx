/**
 * Dictation — a way of typing, not a spoken conversation.
 *
 * One press opens the microphone; a second closes it, and what was said lands
 * in the box for the reader to check and send themselves. Nothing is auto-sent
 * and nothing is read back: a composer microphone is for writing, and the two
 * jobs wearing one control is what made the old one hard to describe.
 *
 * The transcript comes from the server (`/v1/chat/files/speech/stt`), which is
 * why there is no engine here and no waveform: the browser's own speech engine
 * is absent in some browsers and disabled in others, and a canvas of moving
 * bars is 200 lines that say the same thing as a button that has changed shape.
 */
import { Button, Spinner } from '@hanzo/ui'
import { useCallback, useRef, useState } from 'react'

/** Where speech becomes text. */
const STT = '/v1/chat/files/speech/stt'

/** Under this, a recording is a misclick rather than a silence worth naming. */
const BLINK = 400

export interface VoiceProps {
  disabled?: boolean
  /** A bearer, when there is one. A guest sends no header at all. */
  token?: string
  /** What was heard. Appended by the caller — dictation adds to the draft, it
   *  does not replace it. */
  onHeard: (said: string) => void
  onTrouble?: (say: string) => void
}

type Doing = 'off' | 'hearing' | 'reading'

export const Voice = ({ disabled = false, token, onHeard, onTrouble }: VoiceProps) => {
  const [doing, set] = useState<Doing>('off')
  const tape = useRef<MediaRecorder | null>(null)
  const opened = useRef(0)

  const transcribe = useCallback(
    async (heard: Blob) => {
      const form = new FormData()
      form.append('audio', heard, 'turn.webm')
      const res = await fetch(STT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      if (!res.ok) throw new Error('That could not be transcribed.')
      const said = (await res.json()) as { text?: string }
      return said.text?.trim() ?? ''
    },
    [token],
  )

  const open = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onTrouble?.('This browser will not give a page the microphone.')
      return
    }
    let sound: MediaStream
    try {
      sound = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onTrouble?.('The microphone was refused. Allow it for this site and try again.')
      return
    }

    const bits: Blob[] = []
    const recorder = new MediaRecorder(sound)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) bits.push(e.data)
    }
    recorder.onstop = () => {
      for (const track of sound.getTracks()) track.stop()
      const brief = performance.now() - opened.current < BLINK
      if (brief || bits.length === 0) {
        set('off')
        return
      }
      set('reading')
      transcribe(new Blob(bits, { type: recorder.mimeType || 'audio/webm' })).then(
        (said) => {
          set('off')
          if (said) onHeard(said)
          // The recording worked and the transcription produced nothing. Say so
          // — a silent failure here reads as the microphone being broken.
          else onTrouble?.('Nothing was heard.')
        },
        (trouble: Error) => {
          set('off')
          onTrouble?.(trouble.message)
        },
      )
    }

    tape.current = recorder
    opened.current = performance.now()
    recorder.start()
    set('hearing')
  }, [onHeard, onTrouble, transcribe])

  const close = useCallback(() => {
    tape.current?.stop()
    tape.current = null
  }, [])

  const hearing = doing === 'hearing'
  const reading = doing === 'reading'

  return (
    <Button
      // The ring is the state. A colour would have to be spelled onto the
      // label, and a label inside a Button resolves its colour from the theme
      // scope the Button mounts — where the token means something quieter than
      // it does outside. The variant paints both halves, correctly, by itself.
      variant={hearing ? 'outline' : 'ghost'}
      size="icon-sm"
      disabled={disabled || reading}
      aria-label={hearing ? 'Stop dictating' : 'Dictate'}
      aria-pressed={hearing}
      onPress={() => (hearing ? close() : void open())}
      data-testid="voice"
    >
      {/* Glyphs, not icons: a filled circle is the universal record mark and a
          filled square the stop, both render wherever text does, and neither
          costs a package. */}
      {reading ? <Spinner size={14} /> : hearing ? '■' : '●'}
    </Button>
  )
}
