/**
 * A question that arrived in the address bar.
 *
 * `hanzo.ai` has a composer on its front page; a shared link carries the thing
 * somebody wanted asked. Both hand off the same way — `?q=…`, and `&submit=true`
 * when the sender meant it to go straight out — and this is the one place that
 * is read.
 *
 * READ ONCE, THEN GONE. The parameters are struck from the address bar as soon
 * as they are taken, because a `?q=` that survives is re-sent by every reload
 * and by the back button, and a reader who edits the question in the box still
 * has the original sitting in the URL beside it.
 *
 * Only the three that are about the QUESTION are taken. A `?model=` in the same
 * link is somebody else's to read, and striking it here would delete a setting
 * before its owner ever saw it.
 */
import { useEffect, useRef, useState } from 'react'

/** `prompt` and `q` mean the same thing; `prompt` wins where a link carries
 *  both, because it is the older spelling and the explicit one. */
const ASKED = ['prompt', 'q'] as const
const NOW = 'submit'

export interface Handoff {
  text: string
  /** The sender meant it to go out on arrival, not to sit in the box. */
  send: boolean
}

/** What the link is asking, if it is asking anything. */
export const handoff = (search: string): Handoff | null => {
  const params = new URLSearchParams(search)
  const text = ASKED.map((name) => params.get(name)).find((v) => v != null && v !== '')
  if (!text) return null
  return { text, send: params.get(NOW)?.toLowerCase() === 'true' }
}

/** The same address with the question struck out — what the bar should keep. */
export const without = (search: string): string => {
  const params = new URLSearchParams(search)
  for (const name of [...ASKED, NOW]) params.delete(name)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/**
 * The question this page was opened with.
 *
 * Held for the life of the screen so the composer can seed itself whenever it
 * mounts, while the address bar is cleaned immediately — the value and its
 * place in the URL are two different lifetimes, and conflating them is what
 * makes a handoff either re-fire or arrive too late to catch.
 *
 * `strip` is the caller's, because the address bar belongs to the router.
 */
export const useHandoff = (search: string, strip: (next: string) => void): Handoff | null => {
  const [asked, hold] = useState<Handoff | null>(() => handoff(search))
  const taken = useRef(false)

  useEffect(() => {
    if (taken.current) return
    const found = handoff(search)
    if (!found) return
    taken.current = true
    hold(found)
    strip(without(search))
  }, [search, strip])

  return asked
}
