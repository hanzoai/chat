/**
 * Where the visitor was, kept for the way back.
 *
 * Signing in takes the whole document to the issuer and brings it back to
 * `/auth/callback`, so whatever URL the visitor was holding is gone unless
 * something wrote it down. That matters more than it sounds: hanzo.ai's
 * composer hands its prompt over as `/?q=…&submit=true`, and the silent session
 * probe fires on arrival — so without this, a question somebody typed on
 * another surface is spent on a redirect and they land on an empty composer.
 *
 * `sessionStorage`, because the tab is the trip. Reading CONSUMES it: a landing
 * spends it, and it cannot replay onto the next one.
 */

const SLOT = 'chat.back'

/** The parameter an external surface can put the destination in directly. */
const PARAM = 'redirect_to'

/** `/login` as a whole path segment, with or without a basename in front. */
const LOGIN = /(?:^|\/)login(?:\/|$)/

/**
 * Whether a destination is somewhere this app can actually send someone.
 *
 * It must be a path on this origin — `//host` is a protocol-relative URL and
 * would hand the visitor to somebody else's site — and it must not be the login
 * route, which would bounce a completed sign-in straight back into another one.
 */
export const safe = (url: string): boolean => {
  if (!url.startsWith('/') || url.startsWith('//')) return false
  const path = url.split('?')[0].split('#')[0]
  return !LOGIN.test(path)
}

/** Write down where we are before leaving. Refuses a destination it cannot use. */
export const keep = (url: string) => {
  if (!safe(url)) return
  try {
    sessionStorage.setItem(SLOT, url)
  } catch {
    /* Storage refused (private mode). The trip still works; it lands on `/`. */
  }
}

/** Write down the URL of the page as it stands. */
export const keepHere = () => keep(window.location.pathname + window.location.search)

/**
 * Where to go now, and forget it.
 *
 * The URL wins over the stored value — an external surface that named a
 * destination on the callback address meant that one — and the stored value is
 * cleared either way, so a stale note cannot outlive the trip that made it.
 */
export const take = (search: string = window.location.search): string => {
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(SLOT)
    sessionStorage.removeItem(SLOT)
  } catch {
    /* Nothing was stored, because nothing could be. */
  }
  const named = new URLSearchParams(search).get(PARAM)
  const target = named ?? stored
  return target && safe(target) ? target : '/'
}
