/**
 * Reading from the server, and remembering what came back.
 *
 * Four verbs. `useRead` for a value, `usePages` for a cursor-paged list,
 * `useSend` for a change, `invalidate` for "that is no longer true". Everything
 * else a data-fetching library offers — retries, windows, garbage collection,
 * suspense — is a policy this product does not have, and carrying the policies
 * it does not have is how a client ends up with a cache nobody can predict.
 *
 * It is built on `atom`'s primitive rather than beside it: one subscription
 * mechanism for the whole app, so a component that reads a conversation from
 * the server and one that reads the live thread behave identically under a
 * concurrent render.
 *
 * The freshness rule is deliberately blunt. An entry younger than `fresh` is not
 * re-read, and that INCLUDES an entry that failed — a bootstrap that was refused
 * because the visitor had no identity yet must not spin against the server while
 * the identity is being decided. What re-reads it is `invalidate()`, which is
 * exactly what adopting an identity does.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import type { Key } from '~/data/keys'

/** A separator no key part contains, so a prefix match is a real prefix. */
const SEP = ''

const idOf = (key: Key) => key.join(SEP)

type Entry = {
  data?: unknown
  error?: unknown
  pending: boolean
  /** When this entry settled. `0` means never. */
  at: number
}

const nothing: Entry = { pending: false, at: 0 }

const cache = new Map<string, Entry>()
const watchers = new Map<string, Set<() => void>>()
const flights = new Map<string, Promise<void>>()
const readers = new Map<string, () => Promise<unknown>>()

/**
 * How many times each key has been invalidated.
 *
 * A read that is in flight when its key is invalidated was asked under
 * conditions that no longer hold — most sharply, it was asked as a guest and is
 * answering to somebody signed in. Its answer is dropped rather than cached,
 * because a guest's capped catalogue landing on a real session is the exact
 * shape of bug that made a signed-in customer see the anonymous product.
 *
 * Per key, not global: a rename invalidates conversations and must not throw
 * away an unrelated read of the model list, whose caller would then wait for an
 * answer that was quietly discarded.
 */
const eras = new Map<string, number>()

const tell = (id: string) => {
  const listeners = watchers.get(id)
  if (!listeners) return
  for (const fn of listeners) fn()
}

const hold = (id: string, entry: Entry) => {
  cache.set(id, entry)
  tell(id)
}

const listen = (id: string, fn: () => void) => {
  let listeners = watchers.get(id)
  if (!listeners) {
    listeners = new Set()
    watchers.set(id, listeners)
  }
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
    if (!listeners.size) watchers.delete(id)
  }
}

/**
 * One read per key at a time; a second caller joins the first one's flight.
 *
 * `again` is what gets remembered for the next invalidation, and it is not
 * always `read`: a list asking for its second page reads "page two onto what I
 * hold", which is the wrong thing to repeat from an empty cache. What it
 * remembers instead is "the list, from the top".
 */
const draw = (
  id: string,
  read: () => Promise<unknown>,
  again: () => Promise<unknown> = read,
): Promise<void> => {
  readers.set(id, again)
  const already = flights.get(id)
  if (already) return already

  const era = eras.get(id) ?? 0
  hold(id, { ...(cache.get(id) ?? nothing), pending: true })

  const settle = (entry: Entry) => {
    if (flights.get(id) === flight) flights.delete(id)
    if ((eras.get(id) ?? 0) !== era) return
    hold(id, entry)
  }

  const flight = read().then(
    (data) => settle({ data, pending: false, at: Date.now() }),
    (error: unknown) =>
      settle({ ...(cache.get(id) ?? nothing), error, pending: false, at: Date.now() }),
  )
  flights.set(id, flight)
  return flight
}

export type Read<T> = {
  data: T | undefined
  error: unknown
  pending: boolean
  /** Read it again now, whatever its age. */
  reload: () => void
}

export type Options = {
  /** Do not read at all — the answer depends on something not settled yet. */
  enabled?: boolean
  /** How long an answer stays good. Default half a minute. */
  fresh?: number
}

/** A value from the server, kept under `key`. */
export const useRead = <T,>(key: Key, read: () => Promise<T>, options: Options = {}): Read<T> => {
  const id = idOf(key)
  const enabled = options.enabled ?? true
  const fresh = options.fresh ?? 30_000

  // The reader closes over props that change every render; the identity of the
  // read is the KEY, not the function, so the latest one is simply used.
  const latest = useRef(read)
  latest.current = read

  const entry = useSyncExternalStore(
    useCallback((fn: () => void) => listen(id, fn), [id]),
    () => cache.get(id) ?? nothing,
    () => cache.get(id) ?? nothing,
  )

  const reload = useCallback(() => {
    void draw(id, () => latest.current())
  }, [id])

  useEffect(() => {
    if (!enabled) return
    const held = cache.get(id)
    if (held && Date.now() - held.at < fresh) return
    void draw(id, () => latest.current())
  }, [id, enabled, fresh])

  return { data: entry.data as T | undefined, error: entry.error, pending: entry.pending, reload }
}

/**
 * Say that something is no longer true.
 *
 * A key invalidates itself and everything beneath it, so `keys.convo(id)` takes
 * that conversation's turns with it. With NO arguments it invalidates
 * everything, which is what adopting an identity does: every answer read before
 * this browser knew who it was was read as somebody else.
 */
export const invalidate = (...prefixes: Key[]) => {
  const ids = prefixes.map(idOf)
  const all = prefixes.length === 0

  const named = new Set([...cache.keys(), ...flights.keys()])

  for (const id of named) {
    if (!all && !ids.some((prefix) => id === prefix || id.startsWith(prefix + SEP))) continue

    // Whatever is in flight for this key was asked under conditions that no
    // longer hold. Retire it — `draw` drops an answer from a spent era — and
    // free the key so a fresh read can start immediately rather than joining it.
    eras.set(id, (eras.get(id) ?? 0) + 1)
    flights.delete(id)
    cache.delete(id)

    const reader = readers.get(id)
    if (watchers.get(id)?.size && reader) void draw(id, reader)
    else tell(id)
  }
}

/** Put an answer in the cache without asking for it — an optimistic change. */
export const write = <T,>(key: Key, data: T) =>
  hold(idOf(key), { data, pending: false, at: Date.now() })

/** What is cached under `key`, if anything. Never triggers a read. */
export const peek = <T,>(key: Key): T | undefined => cache.get(idOf(key))?.data as T | undefined
