/**
 * Who this browser is, decided once, in one place.
 *
 * Three outcomes, in order, and the order is the whole machine:
 *
 *   1. ADOPT a token. `getValidAccessToken` answers from what this browser
 *      already holds and spends the refresh token when the access token has
 *      aged out — so a reload and an expiry are the same question with the same
 *      answer. Nothing is asked of the chat server: it issues no credential, and
 *      the token IAM returns is the one it verifies.
 *   2. PROBE the issuer, once per visit (`probe.ts`). Somebody signed in at
 *      hanzo.id, console.hanzo.ai or hanzo.app IS signed in, and this was the
 *      one surface that never looked — so it offered them "Log in" and a
 *      two-message trial while their credit sat unspent.
 *   3. Become a GUEST. Anonymous is not a failure state, it is the product's
 *      front door. What a guest may DO is decided server-side, from the absence
 *      of a bearer; nothing here pre-decides it, which is what the tree this
 *      replaces spent two effects and a race trying to do.
 *
 * This is the only module in the app that imports @hanzo/iam. Everything else
 * asks `useSession` who the visitor is, or asks `http` to carry the session —
 * so there is exactly one place a credential is obtained, refreshed or thrown
 * away, and a second one cannot appear without moving this import.
 */
import { IAM } from '@hanzo/iam'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { brand, clientId } from '~/brand'
import { api, callbackPath, loginPath } from '~/data/api'
import { keepHere, take } from '~/data/back'
import { guest } from '~/data/guest'
import { http, Refused, setBearer, setRenew } from '~/data/http'
import { keys } from '~/data/keys'
import { exchanging, noSession, probe } from '~/data/probe'
import { invalidate, useRead } from '~/data/query'
import type { Standing, User } from '~/data/types'

let engine: IAM | null = null

/**
 * What a session asks for.
 *
 * `offline_access` is what makes a session outlive its access token. IAM issues
 * a refresh token only when asked, and without one the only way past an expiry
 * is a full redirect to the issuer — a page navigation in the middle of
 * whatever someone was typing.
 */
const scope = 'openid profile email offline_access'

/** The one IAM client. Built on first use, because it reads `window`. */
const iam = (): IAM =>
  (engine ??= new IAM({
    serverUrl: brand.issuer,
    clientId,
    organization: brand.org,
    redirectUri: `${window.location.origin}${callbackPath}`,
    /**
     * Where the issuer returns the browser once the session has ended.
     *
     * `?redirect=false` is what makes this a landing rather than a bounce: the
     * login route starts a fresh authorize on mount, so a bare `/login` would
     * send somebody who just signed out straight back to the issuer. Built from
     * the current origin for the same reason the callback is — each brand
     * returns to its OWN host, and each host registers this exact address.
     */
    postLogoutRedirectUri: `${window.location.origin}${loginPath}?redirect=false`,
    scope,
  }))

export type Session = {
  /** `unknown` while it is being decided, then `guest` or `live`. */
  standing: Standing
  /** The visitor. The anonymous value while a guest, `null` while unknown. */
  user: User | null
  /** Hand the browser to the issuer to sign in. */
  signIn: () => void
  /** The same trip, starting at the account-creation screen. */
  signUp: () => void
  /** End the session where it lives — at the issuer. */
  signOut: () => void
  /** Complete a sign-in on the callback route; answers where to go next. */
  land: () => Promise<string>
}

const Held = createContext<Session | null>(null)

export const useSession = (): Session => {
  const held = useContext(Held)
  if (!held) throw new Error('useSession outside <Session>')
  return held
}

export const Session = ({ children }: { children: ReactNode }) => {
  const [standing, setStanding] = useState<Standing>('unknown')

  /**
   * Adopt a real session.
   *
   * `invalidate()` is not housekeeping. Every bootstrap read that fired before
   * this browser knew who it was was read as somebody else — and a read that
   * failed for want of an identity has settled into an error nothing else
   * re-runs, so the pane would simply stay empty. Adopting a principal re-reads
   * the world.
   */
  const live = useCallback((token: string) => {
    setBearer(token)
    setStanding('live')
    invalidate()
  }, [])

  const anonymous = useCallback(() => {
    setBearer(undefined)
    setStanding('guest')
    invalidate()
  }, [])

  /**
   * How this page gets a fresh bearer when the one it holds is refused.
   *
   * Installed before anything is read, so the very first bootstrap call can
   * survive an expiry. `http` owns the single-flight and the one replay; this
   * owns the credential. Renewal happens at IAM — the chat server is not asked,
   * which is why there is no endpoint here that could itself answer 401 and
   * deadlock the queue behind it.
   */
  useEffect(() => {
    setRenew(async () => {
      const fresh = await iam()
        .getValidAccessToken()
        .catch(() => null)
      if (fresh) setStanding('live')
      return fresh
    })
    return () => setRenew(null)
  }, [])

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true

    void (async () => {
      /**
       * The callback route renders inside this provider, so the ordinary
       * signed-out path runs on top of a code that is being redeemed. Stand
       * down: probing from here navigates away from that code, and a guest
       * minted here is spent on somebody one round trip from being signed in.
       * `land` owns that outcome.
       */
      if (exchanging()) return

      const token = await iam()
        .getValidAccessToken()
        .catch(() => null)
      if (token) {
        live(token)
        return
      }

      // The document may be leaving for the issuer. If it is, adopt nothing:
      // a guest minted on the way out is spent on a page that is already gone,
      // and the session about to land supersedes it anyway.
      if (await probe(() => iam().signinRedirect({ additionalParams: { prompt: 'none' } }))) return

      anonymous()
    })()
  }, [live, anonymous])

  /** The account behind a real session. A guest has none to read. */
  const record = useRead<User>(keys.user, () => http.get<User>(api.user.self), {
    enabled: standing === 'live',
  })

  /**
   * A token this server will not accept is not a session.
   *
   * Rather than stranding the visitor on a page that cannot load, fall back to
   * the anonymous product — which is what they effectively are. The gate opens
   * when they try to send, because that is the moment a refusal actually costs
   * them something.
   */
  useEffect(() => {
    if (record.error instanceof Refused && record.error.status === 401) anonymous()
  }, [record.error, anonymous])

  const nobody = useMemo(guest, [])

  const signIn = useCallback(() => {
    keepHere()
    void iam().signinRedirect()
  }, [])

  /**
   * Registration is a way IN, so it ends where signing in ends.
   *
   * The issuer's sign-up screen accepts the same `redirect_uri`, `state` and
   * PKCE challenge the authorize endpoint does, and answers a completed
   * registration by returning the browser here with a code — so the account is
   * signed in the moment it exists. Addressed with a bare URL instead, the new
   * account is left at the issuer and the visitor has to find their own way
   * back, by which time this visit has spent its probe.
   */
  const signUp = useCallback(() => {
    keepHere()
    void (async () => {
      const authorize = new URL(await iam().getSigninUrl())
      const signup = new URL(api.iam.signup)
      signup.search = authorize.search
      window.location.href = signup.toString()
    })()
  }, [])

  /**
   * Sign out where the session actually lives.
   *
   * The issuer holds it — its own cookie, plus the refresh token this browser
   * stores — so ending it means handing the whole browser back: the SDK revokes
   * both tokens and then navigates. The navigation is the point, because the
   * session cookie is `SameSite=Lax` and rides a document navigation while
   * being withheld from a cross-site fetch. Clearing only the local copy leaves
   * the issuer still recognising this browser, and the next sign-in is silent.
   */
  const signOut = useCallback(() => {
    void iam().logout()
  }, [])

  const land = useCallback(async () => {
    const where = take()

    /**
     * "Nobody is signed in" is an ANSWER, not a failure. The silent probe asks
     * `prompt=none` and the issuer replies here with `error=login_required`
     * when this browser has no session — the expected reply for exactly the
     * visitor the anonymous product exists to serve. It goes back to the
     * product, quietly.
     */
    if (noSession(new URLSearchParams(window.location.search).get('error'))) {
      anonymous()
      return where
    }

    const token = await iam().handleCallback()
    if (!token.accessToken) throw new Error('IAM returned no access token')
    live(token.accessToken)
    return where
  }, [live, anonymous])

  const value = useMemo<Session>(
    () => ({
      standing,
      user: standing === 'guest' ? nobody : (record.data ?? null),
      signIn,
      signUp,
      signOut,
      land,
    }),
    [standing, nobody, record.data, signIn, signUp, signOut, land],
  )

  return <Held.Provider value={value}>{children}</Held.Provider>
}
