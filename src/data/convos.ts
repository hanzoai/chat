/**
 * The SET of conversations — listing them, and the verbs a row offers.
 *
 * The list is cursor-paged and accumulates in one cache entry, so the sidebar
 * asks for more by calling `next()` and never learns what a cursor is. Every
 * verb states what it makes untrue, which is why renaming a conversation
 * refreshes the sidebar without the sidebar being told about renaming.
 *
 * A note on the wire: the mutating routes take their arguments wrapped in
 * `arg`. That is the server's shape, not a taste, and it is written out here
 * once so no caller has to know it.
 */
import { api, type ConvoQuery } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { useRead, useSend, usePages, type Page } from '~/data/query'
import type { Convo } from '~/data/types'

type Listed = { conversations?: Convo[]; nextCursor?: string | null }

/** How the sidebar asks: a filter, and pages of the answer. */
export const useConvos = (filter: ConvoQuery = {}, enabled = true) =>
  usePages<Convo>(
    keys.convoList(filter),
    async (cursor): Promise<Page<Convo>> => {
      const page = await http.get<Listed>(api.convos.list({ ...filter, cursor }))
      return { items: page.conversations ?? [], next: page.nextCursor }
    },
    { enabled },
  )

/** One conversation's own record — its title, its settings, its tags. */
export const useConvo = (id: string | null | undefined) =>
  useRead<Convo>(keys.convo(id ?? ''), () => http.get<Convo>(api.convos.one(id as string)), {
    enabled: Boolean(id),
  })


export type Rename = { conversationId: string; title?: string; isPinned?: boolean }

/** Rename a conversation, pin it, or both. */
export const useRename = () =>
  useSend<Rename, Convo>((arg) => http.post<Convo>(api.convos.update, { arg }), [keys.convos])

export type Archive = { conversationId: string; isArchived: boolean }

/** Put a conversation away, or take it back out. */
export const useArchive = () =>
  useSend<Archive, Convo>((arg) => http.post<Convo>(api.convos.archive, { arg }), [keys.convos])

/** Delete one conversation. */
export const useDelete = () =>
  useSend<string, void>(
    (conversationId) => http.drop<void>(api.convos.drop, { arg: { conversationId } }),
    [keys.convos, keys.shares],
  )

/** Delete all of them. The one verb with no undo, so it is named plainly. */
export const useDeleteAll = () =>
  useSend<void, void>(() => http.drop<void>(api.convos.dropAll), [keys.convos, keys.shares])
