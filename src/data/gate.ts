/**
 * The refusal channel.
 *
 * A refused request carries no answer, only a reason to sign in — so every path
 * that hits one asks for the gate instead of rendering the server's words as if
 * they were a reply. That is the difference between "You have used the free
 * preview, sign in to keep going" and a message bubble reading `Unauthorized`,
 * which is what the tree this replaces actually shipped.
 *
 * # Why a reason is held, and not only announced
 *
 * Identity settles BEFORE the shell paints: a refused guest answers in
 * milliseconds while the app is still mounting, so an event dispatched then
 * reaches nobody and the visitor gets a page with no composer and no
 * explanation. The last reason is therefore KEPT, and `takePending` picks
 * it up on mount. Taking it consumes it, so dismissing the gate is not undone
 * by the next remount.
 */
import { Refused } from '~/data/http'

/**
 * Why the gate opened.
 *
 *   `limit`       the free preview is spent — a 402 naming `GUEST_LIMIT`.
 *   `anonymous`   the request needed an identity this visitor does not have.
 *   `unavailable` the anonymous preview itself could not start, so there is no
 *                 signed-out product to fall back to.
 */
export type Reason = 'limit' | 'anonymous' | 'unavailable'

const EVENT = 'login'

let pending: Reason | null = null

/** The reason a gate that had not mounted yet still has to show. Reading consumes it. */
export const takePending = (): Reason | null => {
  const reason = pending
  pending = null
  return reason
}

/** Ask for the sign-in gate. */
export const requireLogin = (reason: Reason) => {
  if (typeof window === 'undefined') return
  pending = reason
  window.dispatchEvent(new CustomEvent<Reason>(EVENT, { detail: reason }))
}

/** Hear every request for the gate until the returned function is called. */
export const watchLogin = (fn: (reason: Reason) => void): (() => void) => {
  const handle = (event: Event) => fn((event as CustomEvent<Reason>).detail)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}

/**
 * Whether a failure means "sign in", and if so, open the gate.
 *
 * The two shapes are the two ways a visitor runs out of room: a 402 whose body
 * names `GUEST_LIMIT` is the free preview ending, and a 401 is a request that
 * needed an identity. Everything else is a real error and belongs in the
 * thread, so this answers `false` and leaves it alone.
 */
export const refuse = (error: unknown): boolean => {
  if (!(error instanceof Refused)) return false

  if (error.status === 402) {
    const body = error.body as { type?: string } | null
    if (body?.type !== 'GUEST_LIMIT') return false
    requireLogin('limit')
    return true
  }

  if (error.status === 401) {
    requireLogin('anonymous')
    return true
  }

  return false
}
