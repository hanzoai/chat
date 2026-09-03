/**
 * Ask the issuer, once per visit, whether this browser is already signed in.
 */
import { keepHere } from './back'

const SLOT = 'chat.probed'

/**
 * `sessionStorage`, because the tab is the visit.
 */
const slot = (): Storage | null => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Whether the URL in the bar is the callback from the issuer. */
export const exchanging = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/auth/callback')
}

/** Routes that own an authorize round trip of their own; the probe stays out. */
const busy = (pathname: string) => exchanging() || pathname.startsWith('/login')

/**
 * The OIDC §3.1.2.6 answers that all mean the same thing here: nobody is signed
 * in at the issuer, so carry on as a guest.
 */
const NOBODY = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
])

/** Whether an `error` on the callback means "no session", not "login broke". */
export const noSession = (error: string | null | undefined): boolean =>
  error != null && NOBODY.has(error)

/**
 * Spend the probe.
 */
export const probe = async (go: () => Promise<void>): Promise<boolean> => {
  if (typeof window === 'undefined') return false

  // On localhost, skip the silent redirect probe to prevent OAuth origin mismatch errors.
  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (isLocal) return false

  const storage = slot()
  if (!storage || storage.getItem(SLOT) === '1') return false
  if (busy(window.location.pathname)) return false

  try {
    storage.setItem(SLOT, '1')
    keepHere()
    await go()
    return true
  } catch {
    return false
  }
}
