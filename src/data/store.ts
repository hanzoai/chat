/**
 * State two modules share, and the primitive it is made of.
 *
 * The primitive is `atom`: a value, a way to change it, and a way to hear about
 * it. React already has the hard part — `useSyncExternalStore` is what makes an
 * external value safe to read during a concurrent render — so this is the
 * twenty lines that give it a handle, not a state library. Nothing else in the
 * app subscribes to anything by hand.
 *
 * What lives HERE is only what more than one module touches, and today that is
 * exactly one thing: the conversation currently on screen while it is being
 * answered. The composer writes it, the thread reads it, and neither owns it —
 * so it goes down a level, which is this file.
 *
 * What does NOT live here: the draft (the composer's, and nobody else's), the
 * preferences (settings'), and anything the server knows (that is `query.ts`,
 * where a value can be refetched rather than remembered). A "global store" that
 * takes those in is how a product ends up with two answers to every question.
 */
import { useSyncExternalStore } from 'react'

import type { Convo, Failure, Message } from './types'

export type Atom<T> = {
  /** The value, right now. */
  get(): T
  /** The next value, or a function of the current one. */
  set(next: T | ((prev: T) => T)): void
  /** Hear about every change until the returned function is called. */
  watch(fn: () => void): () => void
}

export const atom = <T,>(initial: T): Atom<T> => {
  let value = initial
  const watchers = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      const settled = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      if (Object.is(settled, value)) return
      value = settled
      for (const fn of watchers) fn()
    },
    watch: (fn) => {
      watchers.add(fn)
      return () => {
        watchers.delete(fn)
      }
    },
  }
}

/** Read an atom. The component re-renders when, and only when, it changes. */
export const useAtom = <T,>(a: Atom<T>): T => useSyncExternalStore(a.watch, a.get, a.get)

// ---------------------------------------------------------------------------
// The live conversation
// ---------------------------------------------------------------------------

/** The conversation on screen. `null` before it has been answered even once. */
export const convo = atom<Convo | null>(null)

/** Its turns, in order. The server's, then the stream's, in the same array. */
export const turns = atom<Message[]>([])

/** Whether an answer is arriving. */
export const busy = atom(false)

/**
 * How to end the answer that is arriving, or `null` when none is.
 */
export const stop = atom<{ cancel: () => void } | null>(null)

/** The last refusal, already read into a sentence. */
export const failure = atom<Failure | null>(null)

// ---------------------------------------------------------------------------
// Writing turns
// ---------------------------------------------------------------------------

/** Add a turn, or replace the one already holding its id. */
export const put = (message: Message) =>
  turns.set((prev) => {
    const at = prev.findIndex((one) => one.messageId === message.messageId)
    if (at < 0) return [...prev, message]
    const next = prev.slice()
    next[at] = message
    return next
  })

/**
 * Start over on a different conversation.
 *
 * One call, because these five values are one fact and clearing four of them is
 * how a new conversation opens showing the previous one's error under a spinner
 * that never stops.
 */
export const reset = (next: Convo | null = null, messages: Message[] = []) => {
  convo.set(next)
  turns.set(messages)
  busy.set(false)
  stop.set(null)
  failure.set(null)
}
