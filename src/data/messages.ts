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
import { api } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { useRead } from '~/data/query'
import type { Message, RawMessage } from '~/data/types'

/**
 * A turn, as the app holds it.
 *
 * The server has said who spoke in two different ways over the years — a
 * boolean, and lately a `role` string — so both are read, boolean first because
 * it is the one every stored message carries.
 */
const asMessage = (raw: RawMessage): Message => {
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
