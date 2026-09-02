/**
 * The draft — what is in the box, and what happens to it when you leave.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { blank, type Draft } from '~/compose/submit'
import type { Attachment } from '~/data/types'

export const NEW = 'new'

const TEXT = 'textDraft_'
const FILES = 'filesDraft_'
const SETTLE = 300

const key = (id: string | null) => id ?? NEW

const store = (): Storage | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** What was left in this conversation's box. */
export const held = (id: string | null): Draft => {
  const at = store()
  if (!at) return blank
  const text = at.getItem(TEXT + key(id)) ?? ''
  let files: Attachment[] = []
  try {
    const raw = at.getItem(FILES + key(id))
    if (raw) files = JSON.parse(raw)
  } catch {
    // fallback
  }
  return { text, files }
}

/** Put it down. */
export const keep = (id: string | null, draft: Draft): void => {
  const at = store()
  if (!at) return
  const k = key(id)
  if (draft.text.trim()) at.setItem(TEXT + k, draft.text)
  else at.removeItem(TEXT + k)

  if (draft.files && draft.files.length > 0) {
    at.setItem(FILES + k, JSON.stringify(draft.files))
  } else {
    at.removeItem(FILES + k)
  }
}

/** It went out. Nothing is owed to it any more. */
export const drop = (id: string | null): void => {
  const at = store()
  if (!at) return
  at.removeItem(TEXT + key(id))
  at.removeItem(FILES + key(id))
}

export interface Held {
  draft: Draft
  write: (text: string) => void
  addFiles: (newFiles: Attachment[]) => void
  removeFile: (fileId: string) => void
  clear: () => void
}

interface Box {
  id: string | null
  draft: Draft
}

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

  const write = useCallback((text: string) => {
    set((prev) => {
      const next = { ...prev, draft: { ...prev.draft, text } }
      live.current = next
      return next
    })
  }, [])

  const addFiles = useCallback((incoming: Attachment[]) => {
    set((prev) => {
      const existing = prev.draft.files ?? []
      const next = {
        ...prev,
        draft: { ...prev.draft, files: [...existing, ...incoming] },
      }
      live.current = next
      return next
    })
  }, [])

  const removeFile = useCallback((fileId: string) => {
    set((prev) => {
      const existing = prev.draft.files ?? []
      const next = {
        ...prev,
        draft: { ...prev.draft, files: existing.filter((f) => f.file_id !== fileId) },
      }
      live.current = next
      return next
    })
  }, [])

  const clear = useCallback(() => {
    drop(box.id)
    const next: Box = { id: box.id, draft: blank }
    live.current = next
    set(next)
  }, [box.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      keep(live.current.id, live.current.draft)
    }, SETTLE)
    return () => clearTimeout(timer)
  }, [box.draft])

  return { draft: box.draft, write, addFiles, removeFile, clear }
}
