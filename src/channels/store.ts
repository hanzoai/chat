/**
 * The org's chat transports, and what has arrived on them.
 *
 * `/v1/channels` is not a directory of rooms to join. It answers the transports
 * this deployment supports — discord, slack, teams, telegram, whatsapp — each
 * carrying whether THIS org has connected it, the account behind the
 * connection, what the transport can render, the DM and group policies, and how
 * many pairing requests are waiting. `/v1/channels/inbox` is the whole message
 * surface: a cursor feed of what people sent the org's bots, oldest first.
 *
 * A room is not a record on that wire. It is the messages sharing a
 * (channel, roomId), which `rooms()` computes over a page already held — so the
 * list of rooms is exactly as complete as the page, and a room nobody has
 * written in is not a room. Both facts are the SDK's, not this file's.
 *
 * What used to be here was 621 lines of invented rooms with invented member
 * counts, categories, follow state, unread counts, collaborative notes and live
 * calls. The served contract has no route for any of them, so none of them is
 * here. The only state left is which room is on screen and whether the reader
 * has the directory open — facts about this browser, not answers from a server.
 */
import { APIError, rooms as group, type Channel, type Room } from '@hanzo/ai'

import { client, ESTATE } from '~/data/origin'
import type { Key } from '~/data/keys'
import { peek, useRead, type Read } from '~/data/query'
import { useSession } from '~/data/session'
import { atom, useAtom } from '~/data/store'
import { explain } from '~/data/types'

/** Two cache keys under one prefix, so both drop together. */
const TRANSPORTS: Key = ['channels', 'transports']
const INBOX: Key = ['channels', 'inbox']

/**
 * Every transport, connected or not.
 *
 * The route answers all of them deliberately: an empty list would leave a
 * reader unable to tell "this org has no Slack" from "Slack is down", so
 * `connected` rides each entry instead.
 */
export const useTransports = (enabled = true): Read<Channel[]> =>
  useRead<Channel[]>(TRANSPORTS, () => client(ESTATE).channels.list(), { enabled })

/**
 * The rooms messages have arrived in, newest first.
 *
 * One page. `inbox()` is a cursor feed and `since` walks it, but nothing here
 * asks for a second page yet — paging a feed nobody has scrolled would be
 * spending a request on a promise.
 */
export const useRooms = (enabled = true): Read<Room[]> =>
  useRead<Room[]>(INBOX, async () => group((await client(ESTATE).channels.inbox()).messages), { enabled })

/** The room on screen, by `Room.key` — the SDK's `"<channel> <roomId>"`. */
const chosen = atom<string | null>(null)

/** Whether the directory is open. */
const showing = atom(false)

export const channelsStore = {
  /**
   * The selected room, out of the page already read.
   *
   * `peek` rather than a read: the one caller outside React needs an answer
   * now, and a request fired from there would be a fetch nothing is waiting on.
   */
  room: (): Room | undefined => {
    const key = chosen.get()
    return key ? peek<Room[]>(INBOX)?.find((room) => room.key === key) : undefined
  },

  select: (key: string | null) => chosen.set(key),
  open: () => showing.set(true),
  close: () => showing.set(false),
}

/** The rooms, and which one is open. */
export const useChannels = () => {
  const { standing } = useSession()
  const list = useRooms(standing === 'live')
  return {
    rooms: list.data ?? [],
    pending: list.pending,
    error: list.error,
    reload: list.reload,
    signedIn: standing === 'live',
    selected: useAtom(chosen),
    browsing: useAtom(showing),
  }
}

/**
 * Who spoke, as far as anything here knows.
 *
 * `sender` is the transport's id for a person; `senderUser` is the Hanzo
 * account it resolves to, and it is best-effort and usually absent. So the
 * handle is rendered as itself rather than as a name nobody sent.
 */
export const speaker = (message: { sender: string; senderUser?: string }) =>
  message.senderUser || message.sender

/** When something arrived. Unix SECONDS in, because that is what the wire carries. */
export const when = (seconds: number) => {
  const ago = Math.max(0, Date.now() / 1000 - seconds)
  if (ago < 60) return 'just now'
  if (ago < 3600) return `${Math.floor(ago / 60)}m ago`
  if (ago < 86_400) return `${Math.floor(ago / 3600)}h ago`
  return `${Math.floor(ago / 86_400)}d ago`
}

/** A refused read, in the app's own words rather than the server's. */
export const refusal = (error: unknown) =>
  explain(error instanceof APIError ? error.body : error).text
