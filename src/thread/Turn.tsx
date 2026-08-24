/**
 * One turn, as it appears.
 *
 * `Message` decides the whole presentation from `role` — a question is a
 * contained bubble, an answer is full-bleed prose — so nothing here re-decides
 * alignment, width or fill. What is left is what this app knows and a component
 * library cannot: which parts the turn has, which sources it cited, whether it
 * failed, and which of its siblings you are reading.
 *
 * The four components this replaces (a turn, its content, its renderer and its
 * placeholder) all drew the same body and disagreed about the last one.
 */
import { Failure, Message, Sources, type Source } from '@hanzo/ui/chat'

import { Actions, acts, type ActionsProps } from './Actions'
import { Cited } from './Cite'
import { Edit } from './Edit'
import { Parts } from './Parts'
import { Siblings } from './Siblings'
import { plain, role, type Choice, type Vote } from './tree'

const OOPS = 'Something went wrong.'

export interface TurnProps {
  choice: Choice
  /** This turn is still arriving. Closes the body with a caret. */
  busy?: boolean
  editing?: boolean
  /** Offer to rewrite. Absent, the turn is not editable. */
  onEdit?: () => void
  onCancel?: () => void
  onSave?: (text: string) => void
  onRetry?: () => void
  onVote?: (vote: Vote | null) => void
  /** Show a different sibling of this fork. */
  onSibling?: (index: number) => void
  onSource?: (source: Source) => void
}

export const Turn = ({
  choice,
  busy = false,
  editing = false,
  onEdit,
  onCancel,
  onSave,
  onRetry,
  onVote,
  onSibling,
  onSource,
}: TurnProps) => {
  const { message, index, count } = choice
  const mine = role(message) === 'user'
  const text = plain(message)

  const action: ActionsProps = {
    text,
    mine,
    vote: message.feedback?.rating ?? null,
    onEdit,
    onRetry,
    onVote,
  }

  const siblings =
    count > 1 && onSibling ? <Siblings index={index} count={count} onPick={onSibling} /> : null

  // An empty row is still a row: it takes the gap under every turn in the
  // conversation and says nothing. Hand `undefined` up instead.
  const bar =
    siblings || (!editing && acts(action)) ? (
      <>
        {siblings}
        {editing ? null : <Actions {...action} />}
      </>
    ) : undefined

  return (
    <Message role={role(message)} busy={busy} actions={bar}>
      {editing && onSave && onCancel ? (
        <Edit value={text} onSave={onSave} onCancel={onCancel} />
      ) : message.error ? (
        <Failure onRetry={onRetry}>{text || OOPS}</Failure>
      ) : (
        // Citations are minted deep inside the markdown tree, so the sources
        // reach them through context rather than through every element in the map.
        <Cited sources={message.sources}>
          <Parts message={message} busy={busy} />
          {message.sources && message.sources.length > 0 ? (
            <Sources sources={message.sources} onOpen={onSource} />
          ) : null}
        </Cited>
      )}
    </Message>
  )
}
