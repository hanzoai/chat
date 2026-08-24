/**
 * What this deployment is, and the handful of facts kept against the person
 * using it.
 *
 * One file because they are one question — "what may happen here" — asked of
 * the server in eight small ways. Splitting them per route would give eight
 * files with one hook each and no reason to prefer one over another; splitting
 * them per SCREEN would put the same answer in two places and let the two
 * disagree.
 *
 * Nothing here decides anything. `settings` decides which model answers,
 * `shell` decides what a refusal looks like; this only reads.
 */
import { api } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { invalidate, useRead, useSend, write } from '~/data/query'
import type {
  Balance,
  Banner,
  Config,
  Endpoints,
  Favorite,
  Models,
  Role,
  Terms,
  Usage,
} from '~/data/types'

/**
 * The deployment's own description: its name, its limits, what a guest is
 * served. Long-lived by nature — it changes when the server is redeployed, not
 * while somebody is reading — so it is held for the visit rather than re-read.
 */
export const useConfig = () =>
  useRead<Config>(keys.config, () => http.get<Config>(api.config), { fresh: Infinity })

/** Which providers answer here, and what each of them can do. */
export const useEndpoints = () =>
  useRead<Endpoints>(keys.endpoints, () => http.get<Endpoints>(api.endpoints), { fresh: 300_000 })

/** Which models each provider will serve. */
export const useModels = () =>
  useRead<Models>(keys.models, () => http.get<Models>(api.models), { fresh: 300_000 })

/** The notice across the top, when there is one. */
export const useBanner = () => useRead<Banner>(keys.banner, () => http.get<Banner>(api.banner))

/**
 * Whether conversations can be searched here. The route answers a bare boolean
 * — it is one fact and it is shaped like one.
 */
export const useSearch = () =>
  useRead<boolean>(keys.search, () => http.get<boolean>(api.searchEnabled), { fresh: 300_000 })

/** What is left to spend. */
export const useBalance = () => useRead<Balance>(keys.balance, () => http.get<Balance>(api.balance))

/** What has been spent. */
export const useUsage = () => useRead<Usage>(keys.usage, () => http.get<Usage>(api.usage))

/**
 * What a role may do. Permissions are the server's, always — this reads them so
 * the interface can decline to offer what would be refused anyway, which is a
 * courtesy, not a control.
 */
export const useRole = (name: string, enabled = true) =>
  useRead<Role>(keys.role(name), () => http.get<Role>(api.role(name)), {
    enabled: enabled && Boolean(name),
    fresh: 300_000,
  })

/** Whether the visitor has set a key of their own for an endpoint. */
export const useEndpointKey = (endpoint: string, enabled = true) =>
  useRead<{ expiresAt?: string | null }>(
    keys.key(endpoint),
    () => http.get<{ expiresAt?: string | null }>(api.key(endpoint)),
    { enabled: enabled && Boolean(endpoint) },
  )

// ---------------------------------------------------------------------------
// The person
// ---------------------------------------------------------------------------

/** Whether the terms have been accepted, and the call that accepts them. */
export const useTerms = (enabled = true) =>
  useRead<Terms>(keys.terms, () => http.get<Terms>(api.user.terms), { enabled })

export const useAcceptTerms = () =>
  useSend<void, void>(() => http.post<void>(api.user.accept), [keys.terms])

/**
 * Say the tour has been seen. Fire and forget — a note that failed to save is
 * worth nothing to show anybody, so it does not invalidate and does not report.
 */
export const seenTour = () => {
  void http.post(api.user.tour).catch(() => undefined)
}

/** Which organization the visitor is acting as. */
export const useActiveOrg = () =>
  useSend<string, void>((org) => http.post<void>(api.user.org, { orgId: org }), [])

/**
 * Close the account. Answers, and then the session it belonged to is over — the
 * caller signs out, because a client holding a token for a deleted account is
 * the one state neither side can make sense of.
 */
export const useCloseAccount = () => useSend<void, void>(() => http.drop<void>(api.user.close), [])

/** The pinned ways to ask, as the model menu shows them. */
export const useFavorites = (enabled = true) =>
  useRead<Favorite[]>(keys.favorites, () => http.get<Favorite[]>(api.user.favorites), { enabled })

/**
 * Replace the whole list.
 *
 * The route takes the list, not a change to it, so the client sends what it
 * wants to be true. The answer is written straight into the cache: the server
 * has just told us the new list, and re-reading it would be asking a question
 * we hold the answer to.
 */
export const useSaveFavorites = () =>
  useSend<Favorite[], Favorite[]>(async (favorites) => {
    const saved = await http.post<Favorite[]>(api.user.favorites, { favorites })
    write(keys.favorites, saved)
    return saved
  }, [])

/** Read the world again — after signing in, or after an import lands. */
export const refresh = () => invalidate()
