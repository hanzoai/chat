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

import { blank, type Draft } from '~/compose/submit'

/**
 * What a draft with no conversation yet is filed under.
 *
 * A STORAGE name, never an identifier: a payload for the same draft sends
 * `conversationId: null`, because "there is no conversation" is not a
 * conversation called `new`, and a server told otherwise looks one up.
 */
export const NEW = 'new'

const TEXT = 'textDraft_'

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
  return { text: at.getItem(TEXT + key(id)) ?? '' }
}

/** Put it down. An empty draft is removed rather than stored empty, so a
 *  conversation you never typed in leaves nothing behind. */
export const keep = (id: string | null, draft: Draft): void => {
  const at = store()
  if (!at) return
  const k = key(id)
  if (draft.text.trim()) at.setItem(TEXT + k, draft.text)
  else at.removeItem(TEXT + k)
}

/** It went out. Nothing is owed to it any more. */
export const drop = (id: string | null): void => {
  const at = store()
  if (!at) return
  at.removeItem(TEXT + key(id))
}

export interface Held {
  draft: Draft
  write: (text: string) => void
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


  const clear = useCallback(() => {
    drop(live.current.id)
    set((b) => ({ ...b, draft: blank }))
  }, [])

  return { draft: box.draft, write, clear }
}
