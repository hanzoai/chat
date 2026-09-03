/**
 * The ONE place a piece of a turn is decided.
 *
 * A `switch` over the discriminant, one branch per kind, each branch a sibling
 * file. The thing this replaces was a 230-line `if / else if` chain that
 * re-derived "is this really a tool call" three different ways and returned
 * `null` from six of them, so a kind nobody had seen since simply vanished with
 * no way to tell that from an empty answer.
 *
 * A kind the union does not name renders nothing rather than throwing: a stream
 * that grows a new part type must not take the answer around it down.
 */
import { Failure } from '@hanzo/ui/chat'

import type { Message, Part } from '../data/types.ts'
import { Files } from './Files.tsx'
import { Picture } from './Picture.tsx'
import { Prose } from './Prose.tsx'
import { Think } from './Think.tsx'
import { Tool } from './Tool.tsx'
import { value } from './tree.ts'

const OOPS = 'Something went wrong.'

interface PieceProps {
  part: Part
  /** The turn was written by a person, so its text is not markdown. */
  mine: boolean
  /** This is the last piece of a turn that is still arriving. */
  busy: boolean
}

const Piece = ({ part, mine, busy }: PieceProps) => {
  switch (part.type) {
    case 'text': {
      const said = value(part.text)
      // A part that is only whitespace is layout with nothing in it — the caret
      // at the end of the turn already says something is coming.
      return said.trim() ? <Prose source={said} verbatim={mine} /> : null
    }

    case 'think': {
      const thought = value(part.think)
      return thought.trim() ? <Think text={thought} busy={busy} /> : null
    }

    case 'tool_call':
      return part.tool_call ? <Tool call={part.tool_call} busy={busy} /> : null

    case 'image_file': {
      const doc = part.image_file
      return doc?.filepath ? <Picture src={doc.filepath} alt={doc.filename} /> : null
    }

    case 'image_url':
      return part.image_url?.url ? <Picture src={part.image_url.url} /> : null

    case 'error':
      return <Failure>{part.error || OOPS}</Failure>

    default:
      return null
  }
}

export interface PartsProps {
  message: Message
  /** The turn is still arriving. */
  busy?: boolean
}

export const Parts = ({ message, busy = false }: PartsProps) => {
  const mine = message.role === 'user'
  const parts = message.content
  const files = message.files

  // No parts is not an empty turn: every user turn and every older answer is a
  // plain string, and reading only `content` renders half a conversation blank.
  const body =
    !parts || parts.length === 0 ? (
      message.text ? (
        <Prose source={message.text} verbatim={mine} />
      ) : null
    ) : (
      parts.map((part, i) => (
        <Piece key={i} part={part} mine={mine} busy={busy && i === parts.length - 1} />
      ))
    )

  return (
    <>
      {files && files.length > 0 ? <Files files={files} /> : null}
      {body}
    </>
  )
}
