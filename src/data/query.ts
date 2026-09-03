/**
 * Reading from the server, and remembering what came back.
 *
 * Three verbs. `useRead` for a value, `useSend` for a change, `invalidate` for
 * "that is no longer true". Everything else a data-fetching library offers —
 * retries, windows, garbage collection, suspense — is a policy this product does
 * not have, and carrying the policies it does not have is how a client ends up
 * with a cache nobody can predict.
 *
 * It said FOUR and shipped two: `usePages` was named here and never written,
 * and `useSend` was named here while thirteen stores each hand-rolled it. A verb
 * a doc promises and a file does not define is worse than a missing one, because
 * the next author writes their own rather than looking.
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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { Key } from './keys'

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

/**
 * How many settled answers to keep.
 *
 * The cache is a Map that only ever GREW: `invalidate` was the one thing that
 * removed an entry, so a session accumulated one entry, one reader CLOSURE and
 * one era counter per key it ever read — and a key can be minted per keystroke
 * (`keys.symbols(query)`), so a long search typed a leak one character at a
 * time. `readers` was the expensive third of it, because a closure retains
 * whatever it closed over.
 *
 * 256 is chosen against what a screen can hold rather than against a memory
 * budget: no view in this app reads more than a few dozen keys, so a bound this
 * far above that evicts only what nothing is looking at.
 */
const keep = 256

/**
 * Drop the least recently settled answers nobody is reading.
 *
 * Three things make an entry INELIGIBLE and all three are correctness rather
 * than policy: a live watcher means a mounted component is reading it, an
 * in-flight read means an answer is coming, and `pending` means the same thing
 * one field over. Evicting any of those would make a component that is on
 * screen re-read what it already has — or worse, drop the era a running flight
 * is about to check itself against.
 *
 * The era goes with the entry, and only for a key with no flight: `draw` reads
 * the era when it starts and compares on arrival, so removing one under a
 * running read would make a stale answer look current.
 */
const reclaim = () => {
  if (cache.size <= keep) return
  const loose: [string, number][] = []
  for (const [id, entry] of cache) {
    if (entry.pending || flights.has(id)) continue
    if (watchers.get(id)?.size) continue
    loose.push([id, entry.at])
  }
  // Oldest-settled first, and only as many as the overflow.
  loose.sort((a, b) => a[1] - b[1])
  for (const [id] of loose.slice(0, cache.size - keep)) {
    cache.delete(id)
    readers.delete(id)
    eras.delete(id)
  }
}

const tell = (id: string) => {
  const listeners = watchers.get(id)
  if (!listeners) return
  for (const fn of listeners) fn()
}

const hold = (id: string, entry: Entry) => {
  cache.set(id, entry)
  // Reclaiming here rather than on a timer keeps it deterministic and keeps the
  // bound in ONE place: the only way an entry enters the cache is through here.
  reclaim()
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
    else {
      // Nothing is watching, so nothing will read it again through this reader.
      // It held a closure; the era is what a future read would compare against
      // and a future read starts from zero anyway.
      readers.delete(id)
      eras.delete(id)
      tell(id)
    }
  }
}

/** Put an answer in the cache without asking for it — an optimistic change. */
export const write = <T,>(key: Key, data: T) =>
  hold(idOf(key), { data, pending: false, at: Date.now() })

/** What is cached under `key`, if anything. Never triggers a read. */
export const peek = <T,>(key: Key): T | undefined => cache.get(idOf(key))?.data as T | undefined

/**
 * What went wrong, as a sentence somebody can read.
 *
 * There were TWELVE copies of this, one per store, identical to the character.
 * An error reaches a screen exactly one way, so it is written down once — and
 * the one thing it must not do is print the object's own spelling of itself,
 * which is how `[object Object]` reaches a customer.
 */
export const reason = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'the call failed'

export type Send<A extends unknown[]> = {
  /** Run it. Resolves true when the call succeeded, false when it did not. */
  run: (...args: A) => Promise<boolean>
  /** In flight. */
  pending: boolean
  /** Why the last attempt failed, already a sentence. Null once one succeeds. */
  fault: string | null
}

/**
 * A change, and what it makes stale.
 *
 * The shape every store had hand-rolled: call the route, and on success say
 * which keys no longer hold. Naming the keys is the whole point — a write that
 * re-reads by calling its own reader again is a second statement of what it
 * changed, and the two drift.
 *
 * IT DOES NOT THROW. A refusal is a value here (`fault`), because the caller is
 * a click handler and a rejected promise from one is an unhandled rejection.
 * `run` answers whether it worked, so a caller that must branch still can.
 */
export const useSend = <A extends unknown[]>(
  call: (...args: A) => Promise<unknown>,
  stale: Key[] = [],
): Send<A> => {
  const [pending, setPending] = useState(false)
  const [fault, setFault] = useState<string | null>(null)

  // The call closes over props that change every render, so the latest one is
  // used — the same rule `useRead` applies to its reader.
  const latest = useRef(call)
  latest.current = call

  const keys = useRef(stale)
  keys.current = stale

  const run = useCallback(async (...args: A): Promise<boolean> => {
    setPending(true)
    setFault(null)
    try {
      await latest.current(...args)
      // Only on success: a refused write changed nothing, so nothing it names
      // has gone stale, and dropping those keys would cost a re-read for free.
      if (keys.current.length > 0) invalidate(...keys.current)
      return true
    } catch (e) {
      setFault(reason(e))
      return false
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, fault }
}

/**
 * A value that lags the one given to it.
 *
 * For a key built from typing. `keys.symbols(query)` mints a key per KEYSTROKE,
 * so a forty-character search was forty requests and forty cache entries — and
 * thirty-nine of those answers were for a question the person had already
 * finished asking.
 *
 * It is here rather than in the panel because it is a property of READING BY A
 * TYPED KEY, which is a thing the cache does, and a second copy in each search
 * box is how two of them come to wait different amounts.
 *
 * The delay is the pause that means "stopped typing", not a throttle: a person
 * who types steadily gets ONE request when they stop, and a person who pastes
 * gets one immediately after it.
 */
export const useSettled = <T,>(value: T, delay = 250): T => {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    // The first value is already settled; only a CHANGE waits.
    if (Object.is(settled, value)) return
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay, settled])
  return settled
}
