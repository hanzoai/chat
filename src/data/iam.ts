/**
 * WHICH identity this deployment serves.
 *
 * One image serves every brand — hanzo.chat, lux.chat, zoo.chat are the same
 * bytes — so the answer cannot be compiled in. A build-time variable pins the
 * login client to whichever brand happened to build the image, and a second
 * brand then sends its visitors to the FIRST brand's issuer with a
 * `redirect_uri` that issuer has never heard of. The issuer cannot redirect
 * somewhere it does not trust, so it renders an error page and the product is
 * unreachable while the server stays perfectly healthy. That has happened; it is
 * why nothing here reads `import.meta.env`.
 *
 * The host answers instead. `chat.hanzo.ai` and `hanzo.chat` both name `hanzo`,
 * `lux.chat` names `lux`, and the rest follows the estate's own rules rather
 * than a table that can drift from them: the issuer is `<org>.id` and the OAuth
 * client is `<org>-<app>`. A deployment that needs to say otherwise says so at
 * runtime through `window.__iam`, which the static plane can inject into the
 * document — the same escape hatch, one level of indirection shorter.
 *
 * This file holds NO credential logic and imports no SDK. It is the addresses
 * and the brand; `session.tsx` is the only place a token is asked for.
 */

/** What a deployment may state for itself, if the host is not enough. */
export type Identity = {
  /** Brand IAM origin, e.g. `https://hanzo.id`. */
  issuer: string
  /** OAuth client, `<org>-<app>`. */
  clientId: string
  /** IAM organization — the brand, lowercase. */
  org: string
}

declare global {
  interface Window {
    __iam?: Partial<Identity>
  }
}

/**
 * The brand, from the host: the label immediately left of the public suffix.
 *
 * `hanzo.chat` → `hanzo`. `chat.hanzo.ai` → `hanzo`. `lux.chat` → `lux`. A
 * single-label host (`localhost`, an IP) names nothing, and development is
 * Hanzo's.
 */
const brandOf = (host: string): string => {
  const labels = host.split('.').filter(Boolean)
  return labels.length > 1 ? labels[labels.length - 2] : 'hanzo'
}

const stated = (typeof window !== 'undefined' && window.__iam) || {}
const org = stated.org ?? brandOf(typeof window !== 'undefined' ? window.location.hostname : '')

export const identity: Identity = {
  issuer: stated.issuer ?? `https://${org}.id`,
  clientId: stated.clientId ?? `${org}-chat`,
  org,
}

/**
 * The issuer's name, for the one screen whose whole job is to say where it is
 * sending you. Derived from the SAME organization the session is signed in
 * against, so the sentence and the destination cannot disagree — written out as
 * a literal it once told a customer on lux.chat "Redirecting to Hanzo…" while
 * handing them to lux.id.
 */
export const brand = org.charAt(0).toUpperCase() + org.slice(1)

/**
 * The scopes a session asks for.
 *
 * `offline_access` is what makes a session outlive its access token. IAM issues
 * a refresh token only when asked, and without one the only way past an expiry
 * is a full redirect to the issuer — a page navigation in the middle of whatever
 * someone was typing.
 */
export const scope = 'openid profile email offline_access'
