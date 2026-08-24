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
 * What stays is this surface's own: what may go INTO a turn (`+`), what the
 * turn is carrying (chips), a way to say it out loud, which model answers, and
 * the one send path everything funnels through — typed, dictated, dropped from
 * a link or picked from an opening.
 */
import { YStack, type GuiElement } from '@hanzo/ui'
import { Composer, ready } from '@hanzo/ui/chat'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { Attach, type AttachProps } from '~/compose/Attach'
import { Chips } from '~/compose/Chips'
import { Starters, type Starter } from '~/compose/Starters'
import { Voice } from '~/compose/Voice'
import { useDraft } from '~/compose/draft'
import type { Handoff } from '~/compose/link'
import {
  AGENTS,
  payload,
  settled,
  type Conversation,
  type Draft,
  type Payload,
} from '~/compose/submit'
import { useUpload, type Takes } from '~/compose/upload'

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
  /** A conversation that is never written down. */
  temporary?: boolean
  /** The model picker. Which models exist is settings'; where the control sits
   *  is the composer's, and that is the whole of what crosses here. */
  model?: ReactNode
  /** What the provider can read. */
  takes?: Takes
  /** MCP servers this deployment offers. */
  servers?: string[]
  can?: AttachProps['can']
  /** Largest file this conversation accepts, in bytes. */
  limit?: number
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
  temporary = false,
  model,
  takes = 'files',
  servers,
  can,
  limit,
  link = null,
  empty = false,
  starters,
  onSend,
  onStop,
  onTrouble,
}: ComposeProps) => {
  const field = useRef<HTMLTextAreaElement>(null)
  const frame = useRef<GuiElement | null>(null)
  const [landing, setLanding] = useState(false)

  const conversationId = conversation?.conversationId ?? null
  const { draft, write, put, take, tool, server, clear } = useDraft(conversationId)

  const say = useCallback((trouble: string) => onTrouble?.(trouble), [onTrouble])

  const { add, cancel } = useUpload({
    conversationId,
    endpoint: conversation?.endpoint ?? AGENTS,
    agentId: conversation?.agent_id,
    put,
    take,
    say,
    limit,
  })

  /** Taking a file back off STOPS it as well as hiding it. An upload nobody is
   *  waiting for still finishes, and its record then walks straight back into
   *  the draft the reader just cleared. */
  const remove = useCallback(
    (fileId: string) => {
      cancel(fileId)
      take(fileId)
    },
    [cancel, take],
  )

  /**
   * The ONE send. Typed, dictated, picked from an opening, handed over in a
   * link — all four arrive here, so a rule about sending is written once.
   */
  const fire = useCallback(
    (text: string) => {
      const going: Draft = { ...draft, text: text.trim() }
      if (!ready(going.text, busy, disabled)) return
      if (!settled(going)) {
        say('One of the files is still uploading.')
        return
      }
      const gone = onSend(payload({ draft: going, conversation, parent, temporary }))
      if (gone !== false) clear()
    },
    [draft, busy, disabled, conversation, parent, temporary, onSend, clear, say],
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

  // A pasted image is an attachment, not a filename. Bound to the node rather
  // than passed as a prop: the field is a cross-platform component and a paste
  // event is a web one, so it is read where the web actually is.
  useEffect(() => {
    const box = field.current
    if (!box) return
    const paste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (!files || files.length === 0) return
      e.preventDefault()
      add(files)
    }
    box.addEventListener('paste', paste)
    return () => box.removeEventListener('paste', paste)
  }, [add])

  // Dropping a file on the composer. Native handlers on the node — `react-dnd`
  // and a provider at the root of the app are a backend, a context and three
  // wrapper components to learn that a file was let go over a box.
  useEffect(() => {
    const box = frame.current
    // Where there is no DOM node there is no drag — the effect simply does not
    // apply, rather than being branched around at the call site.
    if (!box || !('addEventListener' in box)) return
    const carrying = (e: DragEvent) => (e.dataTransfer?.types ?? []).includes('Files')
    const onto = (e: DragEvent) => {
      if (!carrying(e)) return
      e.preventDefault()
      setLanding(true)
    }
    // A drag crossing from the box into one of its own children raises
    // `dragleave` too, so the mark has to check that the pointer really left.
    // Without it the highlight flickers off the moment you aim at the field.
    const away = (e: DragEvent) => {
      const to = e.relatedTarget
      if (to instanceof Node && box.contains(to)) return
      setLanding(false)
    }
    const land = (e: DragEvent) => {
      if (!carrying(e)) return
      e.preventDefault()
      setLanding(false)
      add(e.dataTransfer?.files ?? null)
    }
    box.addEventListener('dragover', onto)
    box.addEventListener('dragleave', away)
    box.addEventListener('drop', land)
    return () => {
      box.removeEventListener('dragover', onto)
      box.removeEventListener('dragleave', away)
      box.removeEventListener('drop', land)
    }
  }, [add])

  return (
    <YStack
      ref={frame}
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
        // The one mark that a drop would land here. The box already draws an
        // edge; lighting it is cheaper and clearer than an overlay that has to
        // be positioned, dismissed and kept out of the way of the caret.
        borderColor={landing ? '$color12' : '$borderColor'}
        // The ref, and only the ref. The field is already addressable —
        // `Composer` marks it `[data-slot="composer-field"]` and it answers to
        // its accessible name — so its props take no test handle, and a third
        // name for one element is the one nobody keeps in step.
        field={{ ref: field }}
      >
        {/* Left to right: what can go IN, which model answers, what is in
            there now, and a way to say it. The chips sit between the controls
            and the send arrow because that is where the eye lands last before
            committing — the moment to notice the turn is carrying something. */}
        <Attach
          takes={takes}
          disabled={disabled}
          tools={draft.tools}
          servers={servers}
          can={can}
          onFiles={add}
          onTool={tool}
          onServer={server}
        />
        {model}
        <Chips
          files={draft.files}
          tools={draft.tools}
          onTake={remove}
          onTool={tool}
          onServer={server}
          field={field}
        />
        <Voice disabled={disabled} text={draft.text} onText={write} onTrouble={say} />
      </Composer>
    </YStack>
  )
}
