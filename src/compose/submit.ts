/**
 * The turn, as the model takes it.
 *
 * Two jobs, and they are deliberately separate. `payload` says what the READER
 * put in — the text, which model answers, and where it hangs in the thread. It
 * knows nothing about the conversation above it. `history` is the other half:
 * the thread, rendered into the messages array a completion actually takes.
 *
 * The split is not tidiness. `/v1/chat/completions` is STATELESS — it holds no
 * conversation, so every turn carries the whole thread — and the composer does
 * not have the thread; the screen does. Folding both into one function is how
 * the composer ends up reaching for a store it should not know about.
 *
 * Fifteen fields left when this moved off the old wire, and each was that
 * server's own bookkeeping: `sender`, `isCreatedByUser`, `clientTimestamp`,
 * `isContinued`, `isRegenerate`, `isTemporary`, `overrideParentMessageId`,
 * `responseMessageId`, `ephemeralAgent`, `endpoint`, `agent_id`, `spec`. A
 * completion takes a model and messages.
 */
import type { ChatCompletionMessage } from '@hanzo/ai'

import type { Message } from '~/data/types'

/**
 * What the composer holds.
 *
 * Text, and only text. Files went with the upload route that never existed on
 * this wire, and the tool switches went with the `ephemeralAgent` field a
 * completion has no place for.
 */
export interface Draft {
  text: string
}

/** An empty draft. The one place the empty value is spelled. */
export const blank: Draft = { text: '' }

/**
 * Only the fields a payload reads off a conversation.
 *
 * Structural, so the store's own richer type passes without a cast and without
 * this file owning a second, drifting copy of it.
 */
export interface Conversation {
  conversationId?: string | null
  model?: string | null
}

/** The model asked when a conversation names none. */
const DEFAULT_MODEL = 'deepseek-chat'

export interface Payload {
  text: string
  /** Minted here so the turn can be drawn before the model answers. Nothing on
   *  this wire mints ids, so the local one is the only one there is. */
  messageId: string
  /** The turn this one answers. Null when it opens the thread. */
  parentMessageId: string | null
  conversationId: string | null
  model: string
}

/** The draft, addressed. */
export const payload = ({
  draft,
  conversation,
  parent,
}: {
  draft: Draft
  conversation: Conversation | null
  /** The message this turn answers — the last one in the thread. */
  parent?: string | null
}): Payload => ({
  text: draft.text.trim(),
  messageId: crypto.randomUUID(),
  parentMessageId: parent ?? null,
  conversationId: conversation?.conversationId ?? null,
  model: conversation?.model || DEFAULT_MODEL,
})

/**
 * The thread, as the completion takes it.
 *
 * Everything already said, then the turn being asked. A message with no text is
 * dropped: a reply still arriving is in the store as an empty assistant turn
 * from the moment it is drawn, and sending `{role:'assistant', content:''}` back
 * to the model asks it to continue a sentence nobody wrote.
 *
 * Refusals are dropped for the same reason and a stronger one — they are this
 * client's account of a failure, not something a model said, and feeding one
 * back teaches the next answer that it already failed once.
 */
export const history = (said: readonly Message[], asked: Payload): ChatCompletionMessage[] => {
  const before: ChatCompletionMessage[] = said
    .filter((m) => !m.error && (m.text ?? '').trim() !== '')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text ?? '' }))

  return [...before, { role: 'user', content: asked.text }]
}
