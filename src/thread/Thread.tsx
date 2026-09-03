/**
 * The conversation on screen.
 *
 * `Thread` from @hanzo/ui/chat is the scroller AND the reading measure: it caps
 * and centres the column, and it decides follow-to-bottom with `pinned()` —
 * follow while the reader is at the end, stop the instant they scroll up.
 *
 * THERE IS NO SCROLL EFFECT HERE, and there must never be one. An effect that
 * scrolls on `messages` change is the bug this rebuild exists to remove: it
 * fires on every token, so a reader scrolling back through an answer is dragged
 * to the bottom several times a second and cannot read what they just asked
 * about. The decision belongs to the scroller, which can see where the reader
 * is; a message-shaped dependency cannot.
 *
 * What is left is this app's: turning the wire's flat array into a tree, keeping
 * which sibling each fork is showing, and knowing which turn is being rewritten.
 * Both pieces of state are HERE rather than in a store, because both are about
 * what this screen is showing and neither survives leaving it — so a screen
 * showing a different conversation mounts a different one of these.
 */
import { Fill } from '@hanzo/ui'
import { Thread as Scroll, type Source } from '@hanzo/ui/chat'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import type { Message } from '../data/types.ts'
import { build, path, type Choice, type Chosen, type Entry, type Vote } from './tree.ts'
import { Turn } from './Turn.tsx'

/**
 * The answer that has been asked for and has not started.
 *
 * A real turn with no content, so the caret, the width and the alignment come
 * from the same component every other turn uses. The version this replaces was a
 * separate placeholder row, which is how a placeholder ends up a different width
 * from the answer that replaces it.
 */
const WAITING = '~waiting'
const wait: Choice = {
  message: {
    messageId: WAITING,
    conversationId: null,
    parentMessageId: null,
    role: 'assistant',
    text: '',
    children: [],
  },
  group: WAITING,
  index: 0,
  count: 1,
}

export interface ThreadProps {
  messages: readonly Entry[]
  /** A turn has been asked for and has not finished. */
  busy?: boolean
  /** Shown instead of the conversation while there is none. */
  greeting?: ReactNode
  /** A turn was rewritten: ask again from there. Absent, turns are not editable. */
  onEdit?: (message: Message, text: string) => void
  onRetry?: (message: Message) => void
  onVote?: (message: Message, vote: Vote | null) => void
  onSource?: (source: Source) => void
}

export const Thread = ({
  messages,
  busy = false,
  greeting,
  onEdit,
  onRetry,
  onVote,
  onSource,
}: ThreadProps) => {
  const [chosen, setChosen] = useState<Chosen>({})
  const [editing, setEditing] = useState<string | null>(null)

  // Two steps, not one: the tree is a function of the messages alone, so moving
  // between siblings must not rebuild it.
  const roots = useMemo(() => build(messages), [messages])
  const turns = useMemo(() => path(roots, chosen), [roots, chosen])

  const pick = useCallback(
    (group: string, index: number) => setChosen((was) => ({ ...was, [group]: index })),
    [],
  )

  if (turns.length === 0 && !busy) {
    return (
      <Fill alignItems="center" justifyContent="center" paddingHorizontal="$4">
        {greeting}
      </Fill>
    )
  }

  const last = turns.length > 0 ? turns[turns.length - 1] : null
  // Nothing has come back yet: the last thing said was the question.
  const waiting = busy && (last == null || last.message.role === 'user')

  // The stream marks the turn it is writing; the prop covers a surface that
  // does not, which is every surface that renders a conversation it did not
  // send — a shared link replaying one, a page restored from cache.
  const arriving = (choice: Choice) =>
    choice.message.busy === true ||
    (busy && choice === last && choice.message.role === 'assistant')

  return (
    <Scroll>
      {turns.map((choice) => {
        const { message, group } = choice
        const answer = message.role === 'assistant'
        return (
          <Turn
            key={message.messageId}
            choice={choice}
            busy={arriving(choice)}
            editing={editing === message.messageId}
            onEdit={onEdit ? () => setEditing(message.messageId) : undefined}
            onCancel={() => setEditing(null)}
            onSave={
              onEdit
                ? (text) => {
                    setEditing(null)
                    onEdit(message, text)
                  }
                : undefined
            }
            onRetry={onRetry && answer ? () => onRetry(message) : undefined}
            onVote={onVote && answer ? (vote) => onVote(message, vote) : undefined}
            onSibling={(index) => pick(group, index)}
            onSource={onSource}
          />
        )
      })}
      {waiting ? <Turn key={WAITING} choice={wait} busy /> : null}
    </Scroll>
  )
}
