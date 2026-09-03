/**
 * ONE conversation's turns.
 *
 * `/v1/agents/chat/conversations/{id}` answers a flat transcript: an id, a role
 * and a string per turn. Everything the old wire carried around a turn — parts,
 * attachments, feedback, sibling links — is not on it, so a stored turn is prose
 * and the renderer's `text` path draws it.
 *
 * Parents are assigned HERE, linearly, because the transcript has none. The
 * thread renders a tree and asks each turn who it answers; given a straight line
 * it draws a straight line, and `Siblings` never appears because nothing on this
 * wire branches. That is the truth about the data rather than a limitation of
 * the renderer.
 *
 * `null` from the SDK means "no such thread for this caller" — the route answers
 * 200 with an empty transcript for another tenant's id, so the SDK reads empty
 * as absent. An empty list is passed straight through as an empty conversation.
 */
import { client } from '~/data/origin'
import { keys } from '~/data/keys'
import { useRead } from '~/data/query'
import type { Message } from '~/data/types'

/**
 * Every turn of one conversation, oldest first.
 *
 * The whole thread in one read: a conversation is a unit, and paging it would
 * mean the thread rendering half of itself while the reader scrolls up through
 * the other half. The route agrees — it takes no cursor.
 */
export const useTurns = (convoId: string | null | undefined) =>
  useRead<Message[]>(
    keys.turns(convoId ?? ''),
    async () => {
      const thread = await client().threads.get(convoId as string)
      let parent: string | null = null
      return ((thread as any)?.messages ?? []).map((m: any) => {
        const turn: Message = {
          messageId: m.id,
          conversationId: convoId ?? null,
          parentMessageId: parent,
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.content ?? '',
          createdAt: m.createdAt,
        }
        parent = m.id
        return turn
      })
    },
    { enabled: Boolean(convoId) },
  )
