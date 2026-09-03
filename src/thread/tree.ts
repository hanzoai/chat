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
 *   build(messages)        the flat array -> roots, with children attached
 *   path(roots, chosen)    roots + one index per fork -> the turns on screen
 *
 * `path` returns a FLAT list, which is the whole point: rendering a tree by
 * recursion means every turn is a component that mounts the rest of the
 * conversation below it, so a token arriving at the end re-renders the top. The
 * sibling walk happens here, once, over data — the view maps a list.
 *
 * The turn itself is `~/data/types`' — `data` owns the wire and the words for
 * it, and a second `Message` here would be the same fact in two homes, drifting
 * the first time the server grows a field.
 */
import type { Source } from '@hanzo/ui/chat'

import type { Feedback, Message } from '../data/types'

/** A thumbs-up or thumbs-down on an answer. */
export type Vote = Feedback['rating']

/**
 * A turn as the THREAD receives it: the wire's, plus the citations resolved for
 * it.
 *
 * `sources` is not on the wire type because nothing outside this module has an
 * opinion about them — the marker in the prose and the strip under the turn are
 * both here. The day a citation means something to another module, it moves to
 * `data` and this alias becomes `Message`.
 */
export type Entry = Message & { sources?: Source[] }

/** A turn with its replies. A tree IS its root. */
interface Tree extends Entry {
  children: Tree[]
}

/** The group key of the top level. Roots have no parent to name them. */
const ROOT = ''

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
 * The flat array as a forest.
 *
 * A turn whose parent has not arrived (or never existed) is a root, so a partial
 * page renders instead of vanishing. Insertion order is preserved, which is what
 * makes "the last sibling" mean "the newest".
 */
export const build = (messages: readonly Entry[]): Tree[] => {
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

/**
 * The value of a text or think part.
 *
 * The wire has spelled it both ways — the string itself, and an object with the
 * string in it — and a stray object handed to React throws inside a stream,
 * taking the answer around it down. One tolerant reader, at the one place the
 * value is taken.
 */
export const value = (said: string | { value?: string } | undefined): string =>
  typeof said === 'string' ? said : (said?.value ?? '')

/**
 * The turn as text — what gets copied, and what an edit starts from.
 *
 * Only the prose: reasoning and tool output are how the answer was reached, not
 * the answer, and pasting a page of JSON into a document is never what was meant
 * by "copy".
 */
export const plain = (message: Message): string => {
  const parts = message.content
  if (!parts || parts.length === 0) return message.text ?? ''
  return parts
    .map((part) => (part.type === 'text' ? value(part.text) : ''))
    .join('')
    .trim()
}
