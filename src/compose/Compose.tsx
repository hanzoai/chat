/**
 * The composer.
 *
 * A field and three controls, and the count is the point. What used to sit here
 * — a badge per tool, a menu of parameters, a model-and-preset picker on `+`,
 * an artifacts mode, a pin per badge and an edit mode for arranging them — asked
 * the reader to hold a model of the machine before they could write a sentence.
 * Each of those ideas still exists; none of them is a question this row asks.
 *
 * The BOX is `Composer` from `@hanzo/ui/chat`, and everything the box knows how
 * to do is deleted from here: Enter sends and Shift+Enter writes a line, the
 * field grows with the draft between a floor and a ceiling, and ONE control
 * submits and stops. The pair of absolutely-positioned buttons that used to
 * live in this file is the arrangement every surface got subtly different.
 *
 * What stays is this surface's own: which model answers, and the one send path
 * everything funnels through — typed, dropped from a link, or picked from an
 * opening.
 *
 * Attachments, the tool badges and the microphone went with the routes behind
 * them. There is no upload for a chat turn to carry; a completion takes OpenAI
 * `tools` rather than the old server's `{web_search: true}`; and `/v1/models`
 * publishes no transcription model to dictate with. Each is gone rather than
 * left as a control that does nothing.
 */
import { YStack } from '@hanzo/ui'
import { Composer, ready } from '@hanzo/ui/chat'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import { Starters, type Starter } from '~/compose/Starters'
import { useDraft } from '~/compose/draft'
import type { Handoff } from '~/compose/link'
import { payload, type Conversation, type Draft, type Payload } from '~/compose/submit'

/** The reading measure. `Thread` caps and centres its own column at this; the
 *  box sits OUTSIDE the thread and has to be told, or the two columns are
 *  different widths and the answer does not line up with the question. */
const COLUMN = 768

/** How tall the field may grow before it scrolls. Past this the composer is
 *  eating the conversation it belongs to. */
const CEILING = 240

export interface ComposeProps {
  conversation?: Conversation | null
  /** The turn this one answers — the last message in the thread. */
  parent?: string | null
  /** A turn is in flight: the send control becomes stop. */
  busy?: boolean
  disabled?: boolean
  /** The model picker. Which models exist is settings'; where the control sits
   *  is the composer's, and that is the whole of what crosses here. */
  model?: ReactNode
  /** A question that arrived in the address bar. */
  link?: Handoff | null
  /** The thread has no turns yet, so openings are worth offering. */
  empty?: boolean
  starters?: Starter[]
  /**
   * The turn is leaving.
   *
   * Answer `false` to KEEP the draft. A send can be held — for a consent
   * nobody has given yet, for a session that lapsed — and a box that empties
   * on the ASK rather than on the departure throws the question away behind
   * the dialog that is asking about it.
   */
  onSend: (turn: Payload) => boolean | void
  onStop?: () => void
  /** Where a refused upload, a denied microphone or a file that is too large
   *  gets said. Omit it and those reasons are discarded — the composer has
   *  nowhere of its own to put a sentence. */
  onTrouble?: (say: string) => void
}

export const Compose = ({
  conversation = null,
  parent = null,
  busy = false,
  disabled = false,
  model,
  link = null,
  empty = false,
  starters,
  onSend,
  onStop,
  onTrouble,
}: ComposeProps) => {
  const field = useRef<HTMLTextAreaElement>(null)

  const conversationId = conversation?.conversationId ?? null
  const { draft, write, clear } = useDraft(conversationId)

  const say = useCallback((trouble: string) => onTrouble?.(trouble), [onTrouble])

  /**
   * The ONE send. Typed, dictated, picked from an opening, handed over in a
   * link — all four arrive here, so a rule about sending is written once.
   */
  const fire = useCallback(
    (text: string) => {
      const going: Draft = { ...draft, text: text.trim() }
      if (!ready(going.text, busy, disabled)) return
      const gone = onSend(payload({ draft: going, conversation, parent }))
      if (gone !== false) clear()
    },
    [draft, busy, disabled, conversation, parent, onSend, clear, say],
  )

  const send = useCallback(() => fire(draft.text), [fire, draft.text])

  // A question handed over in a link fills the box; `submit=true` also sends
  // it. Sending waits for the text to actually BE the draft — firing in the
  // same pass would send whatever was in the box before the handoff.
  const seeded = useRef<string | null>(null)
  const armed = useRef(false)
  useEffect(() => {
    if (!link || seeded.current === link.text) return
    seeded.current = link.text
    armed.current = link.send
    write(link.text)
  }, [link, write])
  useEffect(() => {
    if (!armed.current || draft.text !== seeded.current) return
    armed.current = false
    fire(draft.text)
  }, [draft.text, fire])

  return (
    <YStack
      width="100%"
      maxWidth={COLUMN}
      alignSelf="center"
      gap="$3"
      data-testid="compose"
    >
      {empty && <Starters starters={starters} disabled={busy || disabled} onPick={fire} />}
      <Composer
        value={draft.text}
        onChange={write}
        onSend={send}
        onStop={onStop}
        busy={busy}
        disabled={disabled}
        rows={1}
        maxHeight={CEILING}
        label="Message"
        hint={busy ? 'Generating…' : 'Enter to send, Shift+Enter for a new line'}
        // The ref, and only the ref. The field is already addressable —
        // `Composer` marks it `[data-slot="composer-field"]` and it answers to
        // its accessible name — so its props take no test handle, and a third
        // name for one element is the one nobody keeps in step.
        field={{ ref: field }}
      >
        {/* Which model answers. */}
        {model}
      </Composer>
    </YStack>
  )
}
