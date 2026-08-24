/**
 * ONE conversation's turns.
 *
 * This is also the single crossing between the server's word for who spoke and
 * the app's. The wire says `isCreatedByUser: boolean`; every component asks
 * `role`, because @hanzo/ui/chat's `Message` decides its entire presentation
 * from it — a contained bubble for a person, full-bleed prose for a model. The
 * translation happens HERE, on the way in, and `asMessage` is exported so the
 * stream can put its frames through the same door rather than inventing a
 * second one.
 */
import { api, type MessageQuery } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { peek, useRead, useSend, usePages, write, type Page } from '~/data/query'
import type { Feedback, Message, RawMessage } from '~/data/types'

/**
 * A turn, as the app holds it.
 *
 * The server has said who spoke in two different ways over the years — a
 * boolean, and lately a `role` string — so both are read, boolean first because
 * it is the one every stored message carries.
 */
export const asMessage = (raw: RawMessage): Message => {
  const { isCreatedByUser, role, ...rest } = raw
  const spoke = isCreatedByUser === true || (isCreatedByUser == null && role === 'user')
  return { ...rest, role: spoke ? 'user' : 'assistant', text: raw.text ?? '' }
}

export const asMessages = (raw: RawMessage[] | null | undefined): Message[] =>
  (raw ?? []).map(asMessage)

/**
 * Every turn of one conversation, oldest first.
 *
 * The whole thread in one read: a conversation is a unit — it is forked, shared
 * and deleted whole — and paging it would mean the thread rendering half of
 * itself while the reader scrolls up through the other half.
 */
export const useTurns = (convoId: string | null | undefined) =>
  useRead<Message[]>(
    keys.turns(convoId ?? ''),
    async () => asMessages(await http.get<RawMessage[]>(api.messages.of(convoId as string))),
    { enabled: Boolean(convoId) },
  )

/**
 * Turns from every conversation, matching a search.
 *
 * A different question from the one above, so a different key: these are
 * results, not a thread, and they must not be invalidated by something changing
 * in one conversation.
 */
export const useFound = (filter: MessageQuery, enabled = true) =>
  usePages<Message>(
    keys.found(filter),
    async (cursor): Promise<Page<Message>> => {
      const page = await http.get<{ messages?: RawMessage[]; nextCursor?: string | null }>(
        api.messages.list({ ...filter, cursor }),
      )
      return { items: asMessages(page.messages), next: page.nextCursor }
    },
    { enabled: enabled && Boolean(filter.search) },
  )

export type Edit = {
  conversationId: string
  messageId: string
  text: string
  /** Which content part is being edited. Absent means the message's own text. */
  index?: number
  model?: string
}

/** Change what a turn says. */
export const useEdit = () =>
  useSend<Edit, Message>(async ({ conversationId, messageId, ...body }) => {
    const saved = await http.put<RawMessage>(api.messages.one(conversationId, messageId), body)
    return asMessage(saved)
  }, [])

export type Rate = {
  conversationId: string
  messageId: string
  /** `null` takes the rating back off. */
  feedback: Feedback | null
}

/**
 * Rate an answer.
 *
 * The answer is written straight into the thread rather than re-read: the
 * server has just told us the new rating, and a re-read would drop and refetch
 * every turn of the conversation to learn one field of one of them — visibly,
 * while the reader is looking at it.
 */
export const useRate = () =>
  useSend<Rate, Feedback | null>(async ({ conversationId, messageId, feedback }) => {
    const saved = await http.put<{ feedback: Feedback | null }>(
      api.messages.feedback(conversationId, messageId),
      { feedback },
    )
    const key = keys.turns(conversationId)
    const held = peek<Message[]>(key)
    if (held) {
      write(
        key,
        held.map((turn) =>
          turn.messageId === messageId ? { ...turn, feedback: saved.feedback ?? undefined } : turn,
        ),
      )
    }
    return saved.feedback
  }, [])

/** Remove one turn. */
export const useDrop = () =>
  useSend<{ conversationId: string; messageId: string }, void>(
    ({ conversationId, messageId }) =>
      http.drop<void>(api.messages.one(conversationId, messageId)),
    [],
  )

/**
 * Split one agent's contribution out of a parallel answer into a turn of its
 * own. Only an answer has anything to split.
 */
export const useBranch = () =>
  useSend<{ messageId: string; agentId: string }, Message>(
    async (body) => asMessage(await http.post<RawMessage>(api.messages.branch, body)),
    [],
  )
