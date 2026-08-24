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
import { invalidate, useRead, useSend, usePages, type Page } from '~/data/query'
import type { Convo, Tag } from '~/data/types'

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

/**
 * The title the server writes after the first exchange.
 *
 * The route waits for it — the model is still being asked as the request
 * arrives — so this is one call that legitimately takes seconds, and a 404 means
 * this endpoint does not name conversations at all. Either way it is a nicety:
 * the conversation is perfectly usable called nothing.
 */
export const title = async (id: string): Promise<string | null> => {
  try {
    const { title: named } = await http.get<{ title?: string }>(api.convos.title(id))
    if (named) invalidate(keys.convos)
    return named ?? null
  } catch {
    return null
  }
}

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

export type Fork = {
  conversationId: string
  messageId: string
  /** How much of the thread comes along — the server's words for the choices. */
  option?: string
  splitAtTarget?: boolean
  latestMessageId?: string
}

/** Branch a conversation from one of its turns into a new conversation. */
export const useFork = () =>
  useSend<Fork, { conversation: Convo }>(
    (body) => http.post<{ conversation: Convo }>(api.convos.fork, body),
    [keys.convos],
  )

/** Copy a conversation whole. */
export const useCopy = () =>
  useSend<{ conversationId: string; title?: string }, { conversation: Convo }>(
    (body) => http.post<{ conversation: Convo }>(api.convos.copy, body),
    [keys.convos],
  )

/**
 * Read conversations out of an exported file.
 *
 * Multipart, because the file IS the request. The answer says only that it
 * worked — what arrived is discovered by re-reading the list, which is the
 * honest thing to do when an import can create any number of conversations.
 */
export const useImport = () =>
  useSend<globalThis.File, { message: string }>((file) => {
    const form = new FormData()
    form.append('file', file)
    return http.form<{ message: string }>(api.convos.import, form)
  }, [keys.convos])

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Every label in use, with how many conversations carry it. */
export const useTags = (enabled = true) =>
  useRead<Tag[]>(keys.tags, () => http.get<Tag[]>(api.tags.list), { enabled })

/** Replace the labels on one conversation. */
export const useTag = () =>
  useSend<{ conversationId: string; tags: string[] }, Tag[]>(
    ({ conversationId, tags }) => http.put<Tag[]>(api.tags.of(conversationId), { tags }),
    [keys.tags, keys.convos],
  )
