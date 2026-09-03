/**
 * The SET of conversations.
 *
 * `/v1/agents/chat/conversations` answers every thread in the caller's org,
 * newest first, in ONE read. That is the whole surface: no filter, no cursor, no
 * sort — so the sidebar's paging is gone rather than faked, and `useConvos`
 * answers a list that is already complete.
 *
 * The verbs are gone too, and this is the honest part. Renaming, archiving,
 * pinning and deleting were six routes on a server that does not exist; the one
 * that does is GET-only, on both `/conversations` and `/conversations/{id}`.
 * There is no route to write to and no SDK method to call, so nothing here
 * pretends otherwise — `~/data/missing` is what the rail's controls report.
 */
import { client, ESTATE } from './origin.ts'
import { keys } from './keys.ts'
import { useRead } from './query.ts'
import type { Convo } from './types.ts'

/**
 * Every conversation, newest first.
 *
 * The SDK's `Thread` carries an id, a derived title and when it was last
 * appended to. `Convo` is the app's richer record, and the extra fields simply
 * are not answered here — a thread has no endpoint, model or tags on this wire.
 */
export const useConvos = (enabled = true) =>
  useRead<Convo[]>(
    keys.convos,
    async () => {
      const threads = await client(ESTATE).threads.list()
      return (threads as any[]).map((t: any) => ({
        conversationId: t.id,
        title: t.title ?? '',
        updatedAt: t.updatedAt,
      }))
    },
    { enabled },
  )

/**
 * One conversation's record.
 *
 * Read out of the list rather than from a route of its own: `/conversations/{id}`
 * answers the TRANSCRIPT, not the record, and the list is where a title lives.
 * So this shares the list's cache entry and costs no second request.
 */
export const useConvo = (id: string | null | undefined) => {
  const list = useConvos(Boolean(id))
  const found = id ? list.data?.find((c) => c.conversationId === id) : undefined
  return { ...list, data: found }
}
