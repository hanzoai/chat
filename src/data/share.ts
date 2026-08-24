/**
 * A conversation somebody published.
 *
 * Two audiences, and they are not the same request. `useShared` is the reader
 * with a link and no account — the ONE read in the app that takes no session,
 * which is why the `/share/:shareId` route is public and why nothing here
 * assumes a bearer. Everything else belongs to the author: which of their
 * conversations are published, and the verbs that publish, refresh and withdraw
 * one.
 *
 * The pairing of `useShareOf` with `useShare` matters. The header's button has
 * to know, before it is pressed, whether this conversation is already published
 * — otherwise pressing it a second time silently mints a second link, and the
 * first one keeps working with the older half of the conversation on it.
 */
import { api, type ShareQuery } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { invalidate, useRead, useSend, usePages, type Page } from '~/data/query'
import { asMessages } from '~/data/messages'
import type { Message, RawMessage, Share } from '~/data/types'

type Listed = { links?: Share[]; nextCursor?: string | null }

/** The author's own list of published conversations. */
export const useShares = (filter: ShareQuery = {}, enabled = true) =>
  usePages<Share>(
    keys.shareList(filter),
    async (cursor): Promise<Page<Share>> => {
      const page = await http.get<Listed>(api.share.list({ ...filter, cursor }))
      return { items: page.links ?? [], next: page.nextCursor }
    },
    { enabled },
  )

/** A published conversation, read by whoever holds the link. */
export type Shared = {
  shareId: string
  title?: string
  isPublic?: boolean
  conversationId?: string
  turns: Message[]
  createdAt?: string
}

export const useShared = (shareId: string | null | undefined) =>
  useRead<Shared>(
    keys.share(shareId ?? ''),
    async () => {
      const raw = await http.get<{
        shareId?: string
        title?: string
        isPublic?: boolean
        conversationId?: string
        messages?: RawMessage[]
        createdAt?: string
      }>(api.share.one(shareId as string))
      return {
        shareId: raw.shareId ?? (shareId as string),
        title: raw.title,
        isPublic: raw.isPublic,
        conversationId: raw.conversationId,
        turns: asMessages(raw.messages),
        createdAt: raw.createdAt,
      }
    },
    { enabled: Boolean(shareId) },
  )

/** Whether this conversation is already published, and under which id. */
export const useShareOf = (convoId: string | null | undefined) =>
  useRead<{ success: boolean; shareId?: string }>(
    keys.shareOf(convoId ?? ''),
    () =>
      http.get<{ success: boolean; shareId?: string }>(api.share.of(convoId as string)),
    { enabled: Boolean(convoId) },
  )

/**
 * Publish a conversation, up to and including one of its turns.
 *
 * `targetMessageId` is what makes a share a snapshot rather than a live window:
 * naming the last turn publishes the conversation as it stands, and whatever is
 * said afterwards stays private until it is published again.
 */
export const useShare = () =>
  useSend<{ conversationId: string; targetMessageId?: string }, Share>(
    async ({ conversationId, targetMessageId }) => {
      const made = await http.post<Share>(api.share.create(conversationId), { targetMessageId })
      invalidate(keys.shareOf(conversationId))
      return made
    },
    [keys.shares],
  )

/** Bring a published conversation up to date with the private one. */
export const useRefresh = () =>
  useSend<string, Share>((shareId) => http.patch<Share>(api.share.update(shareId)), [keys.shares])

/** Withdraw a published conversation. The link stops working. */
export const useUnshare = () =>
  useSend<string, void>((shareId) => http.drop<void>(api.share.drop(shareId)), [keys.shares])
