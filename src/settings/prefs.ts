import { atom, useAtom, type Atom } from '~/data/store'

/**
 * Every preference that outlives the tab, and the only code in this app that
 * writes storage.
 *
 * A preference is an atom that remembers. `atom` (in `data/store`) is already
 * the app's one way to hold a value and hear about it, so nothing is
 * re-subscribed here — this adds the two things an atom does not have: a place
 * on disk, and a second tab of the same account changing it underneath you.
 *
 * `revive` guards the way OUT of storage as well as the way in, and that is the
 * half people drop. A shape written by an older release — or by anything else
 * that can reach this origin's storage — arrives unexamined otherwise, and a
 * screen that trusts it renders whatever was left there.
 *
 * Nothing is offered here that nothing reads. A switch whose value no surface
 * acts on is worse than the absence of the switch, so the list at the bottom is
 * exactly the set of decisions some other module asks this one for.
 */

/** One namespace, so a key here cannot collide with another app on this origin. */
const HOME = 'hanzo.chat.'

/** An atom with a name it is kept under. */
export interface Pref<T> extends Atom<T> {
  readonly key: string
}

/** A validator for what comes back off disk: the value, or nothing. */
export type Revive<T> = (raw: unknown) => T | undefined

export const flag: Revive<boolean> = (raw) => (typeof raw === 'boolean' ? raw : undefined)

export const text: Revive<string> = (raw) => (typeof raw === 'string' ? raw : undefined)

/**
 * Storage is refused in a sandboxed frame and in a private window, and it
 * throws on the ACCESS rather than on the read — so the guard is around the
 * lookup itself. A refusal costs the preference, never the render.
 */
const disk = (() => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
})()

const reload = new Map<string, () => void>()
let listening = false

/** One `storage` listener for every preference: a change in another tab of
 *  this account re-reads that one name and leaves the rest alone. */
const listen = (key: string, again: () => void) => {
  reload.set(key, again)
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('storage', (e) => {
    if (e.key) reload.get(e.key)?.()
  })
}

/**
 * Declare a preference. This is the one writer of storage in the app; a new
 * preference is declared below rather than anywhere else, which is what keeps
 * the set of names something a person can read in one screen.
 */
export function pref<T>(name: string, fallback: T, revive: Revive<T>): Pref<T> {
  const key = HOME + name

  const load = (): T => {
    let raw: string | null = null
    try {
      raw = disk?.getItem(key) ?? null
    } catch {
      return fallback
    }
    if (raw == null) return fallback
    try {
      return revive(JSON.parse(raw) as unknown) ?? fallback
    } catch {
      return fallback
    }
  }

  const cell = atom<T>(load())
  listen(key, () => cell.set(load()))

  return {
    key,
    get: cell.get,
    watch: cell.watch,
    set: (next) => {
      cell.set(next)
      try {
        disk?.setItem(key, JSON.stringify(cell.get()))
      } catch {
        /* A full or refused disk still leaves this tab agreeing with itself. */
      }
    },
  }
}

/** Read a preference and get the way to change it, in the shape of `useState`. */
export const usePref = <T>(p: Pref<T>): [T, Atom<T>['set']] => [useAtom(p), p.set]

/**
 * Which model answers.
 *
 * The empty string means the deployment's first, which is what a conversation
 * with no model already resolves to — so "never chosen" and "chose the default"
 * are the same state rather than two that can disagree.
 */
export const model = pref('model', '', text)

/** A new conversation is not kept after you leave it. */
export const temporary = pref('temporary', false, flag)

/** A step arrives open, so a run reads as work rather than as a row of shut drawers. */
export const steps = pref('steps', false, flag)

/** The thread fills its column instead of holding a reading measure. */
export const full = pref('full', false, flag)

/** Turns sit closer together. */
export const compact = pref('compact', false, flag)

/**
 * The conversation list is showing.
 *
 * The rail writes this one and settings offers no switch for it: a control has
 * one home, and this one is the toggle on the rail itself. It is declared here
 * because a stored preference lives here, not because this screen owns it.
 */
export const rail = pref('rail', true, flag)
