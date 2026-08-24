/**
 * A conversation is a TREE, and the screen shows one path down it.
 *
 * Every turn names its parent, so an edit or a regeneration does not replace
 * what was there — it adds a sibling under the same parent, and the reader
 * chooses between them. Flattening that into a list is what makes "‹ 2/3 ›"
 * impossible to render and a re-ask look like a deletion.
 *
 * Two functions and one shape:
 *
 *   build(messages)        the wire's flat array -> roots, children attached
 *   path(roots, chosen)    roots + one index per fork -> the turns on screen
 *
 * `path` returns a FLAT list, which is the whole point: rendering a tree by
 * recursion means every turn is a component that mounts the rest of the
 * conversation below it, so a token arriving at the end re-renders the top.
 * The sibling walk happens here, once, over data — the view maps a list.
 *
 * The field names are the server's, because the client has to speak the wire it
 * is served beside; the SHAPE is only what the thread reads. Anything richer
 * satisfies it structurally, so no module has to hand its types down.
 */
import type { Source } from '@hanzo/ui/chat'

/** Who is speaking. The wire says it with a boolean; the view wants the noun. */
export type Role = 'user' | 'assistant' | 'system'

/** A thumbs-up or thumbs-down on an answer. The strings are the wire's. */
export type Vote = 'thumbsUp' | 'thumbsDown'

/** Something attached to a turn — an upload, or a file the model produced. */
export interface Doc {
  file_id?: string
  filename?: string
  filepath?: string
  /** A local object URL, present before the upload lands. */
  preview?: string
  type?: string
  height?: number
  width?: number
  size?: number
}

/** A tool the assistant ran, and how it went. */
export interface Call {
  id?: string
  name?: string
  /** JSON, as a string, or already parsed. Providers disagree. */
  args?: string | Record<string, unknown>
  output?: string
  /** 0..1. Absent while the call is still opening. */
  progress?: number
  type?: string
}

/**
 * One piece of a turn.
 *
 * Discriminated on `type`, which is what lets `Parts` be a switch rather than a
 * chain of `if ('text' in part)`. A wire that grows a new kind lands in the
 * default branch and renders nothing, rather than throwing inside a stream.
 */
export type Part =
  | { type: 'text'; text?: string | { value?: string }; tool_call_ids?: string[] }
  | { type: 'think'; think?: string | { value?: string } }
  | { type: 'tool_call'; tool_call?: Call }
  | { type: 'image_file'; image_file?: Doc }
  | { type: 'image_url'; image_url?: { url?: string; detail?: string } }
  | { type: 'error'; error?: string; text?: string }
  | { type: 'agent_update'; agent_update?: { agentId?: string; index?: number } }

/**
 * A turn, as the server keeps it.
 *
 * `content` and `text` are both here and both optional because both arrive: a
 * modern turn is a part array, an older one (and every user turn) is a string.
 * `plain()` is the one place that reconciles them.
 */
export interface Message {
  messageId: string
  parentMessageId?: string | null
  conversationId?: string | null
  isCreatedByUser?: boolean
  sender?: string
  text?: string
  content?: Part[]
  files?: Doc[]
  /**
   * What the answer cited, already resolved. The thread renders citations it is
   * handed rather than digging them out of a tool's output — deriving them here
   * would put the shape of one tool's JSON in the middle of the view.
   */
  sources?: Source[]
  error?: boolean
  unfinished?: boolean
  feedback?: { rating?: Vote } | null
  model?: string | null
  endpoint?: string | null
  createdAt?: string
}

/** A message with its replies. A tree IS its root. */
export interface Tree extends Message {
  children: Tree[]
}

/** The group key of the top level. Roots have no parent to name them. */
export const ROOT = ''

/** Which sibling is showing at each fork, keyed by the parent's id. */
export type Chosen = Readonly<Record<string, number>>

/** One turn on screen, and where it sits among its siblings. */
export interface Choice {
  message: Tree
  /** The fork this turn was chosen from — its parent's id, or `ROOT`. */
  group: string
  index: number
  count: number
}

/**
 * The wire's flat array as a forest.
 *
 * A turn whose parent has not arrived (or never existed) is a root, so a partial
 * page renders instead of vanishing. Insertion order is preserved, which is what
 * makes "the last sibling" mean "the newest".
 */
export const build = (messages: readonly Message[]): Tree[] => {
  const byId = new Map<string, Tree>()
  const roots: Tree[] = []

  for (const message of messages) {
    if (!message) continue
    const node: Tree = { ...message, children: [] }
    byId.set(node.messageId, node)
    const parent = node.parentMessageId == null ? undefined : byId.get(node.parentMessageId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return roots
}

const clamp = (i: number, count: number) => (i < 0 ? 0 : i >= count ? count - 1 : i)

/**
 * The turns on screen, from the top down.
 *
 * At each level it takes the chosen sibling — the LAST one by default, because
 * the newest answer is the one you just asked for — and descends into its
 * children. The key it records the choice under is the chosen turn's own id,
 * which is exactly the id its children will share, so a fork deeper in the
 * conversation cannot collide with one above it and no key has to be minted.
 */
export const path = (roots: readonly Tree[], chosen: Chosen): Choice[] => {
  const turns: Choice[] = []
  // The top level is a fork only among turns that SHARE a parent. Rewriting the
  // opening question makes a second root and those two really are siblings; a
  // turn whose parent did not arrive in this page is not one of them, and
  // letting it join that set means the default — the newest — is a stray row,
  // and the entire conversation goes blank behind it.
  const top = roots.length > 0 ? (roots[0].parentMessageId ?? null) : null
  let level: readonly Tree[] = roots.filter((root) => (root.parentMessageId ?? null) === top)
  let group = ROOT

  while (level.length > 0) {
    const count = level.length
    const index = clamp(chosen[group] ?? count - 1, count)
    const message = level[index]
    turns.push({ message, group, index, count })
    group = message.messageId
    level = message.children
  }

  return turns
}

/** Who said it. There is no system turn in a conversation, only in a settings screen. */
export const role = (message: Message): Role => (message.isCreatedByUser ? 'user' : 'assistant')

const said = (value: string | { value?: string } | undefined): string =>
  typeof value === 'string' ? value : (value?.value ?? '')

/**
 * The turn as text — what gets copied, and what an edit starts from.
 *
 * Only the prose: reasoning and tool output are how the answer was reached, not
 * the answer, and pasting a page of JSON into a document is never what was
 * meant by "copy".
 */
export const plain = (message: Message): string => {
  const parts = message.content
  if (!parts || parts.length === 0) return message.text ?? ''
  return parts
    .map((part) => (part.type === 'text' ? said(part.text) : ''))
    .join('')
    .trim()
}

/** The value of a text or think part, whichever spelling the provider used. */
export const value = said
