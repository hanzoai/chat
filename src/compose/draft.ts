/**
 * The draft — what is in the box, and what happens to it when you leave.
 *
 * A half-written message is the most valuable thing on the screen and the
 * easiest to lose: it survives a reload, a jump to another conversation and a
 * jump back, and it belongs to the conversation it was written in rather than
 * to the box. Two people typing in two threads keep two drafts.
 *
 * The store is the browser's, keyed by conversation. Files are kept whole
 * rather than by id: they are already on the server by the time they are in
 * the draft, the records are small, and keeping ids meant a second query on
 * every restore just to learn the names back.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { blank, type Attached, type Draft, type Tools } from '~/compose/submit'

/**
 * What a draft with no conversation yet is filed under.
 *
 * A STORAGE name, never an identifier: a payload for the same draft sends
 * `conversationId: null`, because "there is no conversation" is not a
 * conversation called `new`, and a server told otherwise looks one up.
 */
export const NEW = 'new'

const TEXT = 'textDraft_'
const FILES = 'filesDraft_'

/** How long typing settles before it is written down. One delay: a second one
 *  for "clearing" only exists to paper over the first being too eager. */
const SETTLE = 300

const key = (id: string | null) => id ?? NEW

const store = (): Storage | null => {
  try {
    return window.localStorage
  } catch {
    // A browser with storage denied still has to run. Losing a draft on
    // reload is a smaller failure than a screen that will not render.
    return null
  }
}

/** What was left in this conversation's box. */
export const held = (id: string | null): Draft => {
  const at = store()
  if (!at) return blank
  const text = at.getItem(TEXT + key(id)) ?? ''
  let files: Attached[] = []
  try {
    const kept: unknown = JSON.parse(at.getItem(FILES + key(id)) ?? '[]')
    if (Array.isArray(kept)) files = kept as Attached[]
  } catch {
    files = []
  }
  return { text, files, tools: {} }
}

/** Put it down. An empty draft is removed rather than stored empty, so a
 *  conversation you never typed in leaves nothing behind. */
export const keep = (id: string | null, draft: Draft): void => {
  const at = store()
  if (!at) return
  const k = key(id)
  if (draft.text.trim()) at.setItem(TEXT + k, draft.text)
  else at.removeItem(TEXT + k)
  if (draft.files.length > 0) at.setItem(FILES + k, JSON.stringify(draft.files))
  else at.removeItem(FILES + k)
}

/** It went out. Nothing is owed to it any more. */
export const drop = (id: string | null): void => {
  const at = store()
  if (!at) return
  at.removeItem(TEXT + key(id))
  at.removeItem(FILES + key(id))
}

/** The tools that are simply on or off. MCP servers are a list, and have their
 *  own verb, because "which servers" is a different question from "search or
 *  not" and one verb answering both takes a union at every call site. */
export type Switch = Exclude<keyof Tools, 'mcp'>

export interface Held {
  draft: Draft
  write: (text: string) => void
  /** Add a file, or replace one already there — an upload reports its progress
   *  by putting the same record back with a higher number. */
  put: (file: Attached) => void
  /** Take one back off. */
  take: (fileId: string) => void
  /** Turn a tool on or off for this turn. */
  tool: (which: Switch) => void
  /** Turn one MCP server on or off for this turn. */
  server: (name: string) => void
  /** The turn went out. */
  clear: () => void
}

/** A draft and the conversation it belongs to, as ONE value. Two states — the
 *  text, and which thread it is the text of — is how a draft comes to be shown
 *  under the wrong conversation for a frame, or written into it for good. */
interface Box {
  id: string | null
  draft: Draft
}

/**
 * The draft this conversation is holding, and the verbs that change it.
 *
 * Switching conversations puts the outgoing draft down before picking the
 * incoming one up, in that order and in the same pass — a debounce that fires
 * after the switch writes the wrong conversation's text into the new one's
 * slot, and an effect that swaps a pass later shows it there first.
 */
export const useDraft = (conversationId: string | null): Held => {
  const [box, set] = useState<Box>(() => ({ id: conversationId, draft: held(conversationId) }))
  const live = useRef(box)
  live.current = box

  if (box.id !== conversationId) {
    keep(box.id, box.draft)
    const next: Box = { id: conversationId, draft: held(conversationId) }
    live.current = next
    set(next)
  }

  // Settle, then write. The flush on unmount is the half that matters: a tab
  // closed mid-sentence has never fired the timer.
  useEffect(() => {
    const timer = setTimeout(() => keep(live.current.id, live.current.draft), SETTLE)
    return () => clearTimeout(timer)
  }, [box])

  useEffect(() => () => keep(live.current.id, live.current.draft), [])

  const edit = useCallback(
    (change: (draft: Draft) => Draft) => set((b) => ({ ...b, draft: change(b.draft) })),
    [],
  )

  const write = useCallback((text: string) => edit((d) => ({ ...d, text })), [edit])

  const put = useCallback(
    (file: Attached) =>
      edit((d) => ({
        ...d,
        files: d.files.some((f) => f.file_id === file.file_id)
          ? d.files.map((f) => (f.file_id === file.file_id ? file : f))
          : [...d.files, file],
      })),
    [edit],
  )

  const take = useCallback(
    (fileId: string) => edit((d) => ({ ...d, files: d.files.filter((f) => f.file_id !== fileId) })),
    [edit],
  )

  const tool = useCallback(
    (which: Switch) =>
      edit((d) => ({ ...d, tools: { ...d.tools, [which]: d.tools[which] !== true } })),
    [edit],
  )

  const server = useCallback(
    (name: string) =>
      edit((d) => {
        const on = d.tools.mcp ?? []
        return {
          ...d,
          tools: {
            ...d.tools,
            mcp: on.includes(name) ? on.filter((s) => s !== name) : [...on, name],
          },
        }
      }),
    [edit],
  )

  const clear = useCallback(() => {
    drop(live.current.id)
    // The TOOLS stay. Searching the web is something this conversation is
    // doing, not something one sentence did — turning it back on after every
    // question is the kind of small tax nobody can name but everybody feels.
    // They stay visible as chips, so nothing about the next turn is hidden.
    set((b) => ({ ...b, draft: { ...blank, tools: b.draft.tools } }))
  }, [])

  return { draft: box.draft, write, put, take, tool, server, clear }
}
