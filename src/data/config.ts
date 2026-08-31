/**
 * What this deployment is.
 *
 * One file because it is one question — "what may happen here" — asked of the
 * server in a few small ways. Splitting them per route would give a file with
 * one hook each and no reason to prefer one over another; splitting them per
 * SCREEN would put the same answer in two places and let the two disagree.
 *
 * Nothing here decides anything. `settings` decides which model answers,
 * `shell` decides what a refusal looks like; this only reads.
 */
import { api } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { invalidate, useRead, useSend } from '~/data/query'
import type { Config, Endpoints, Models } from '~/data/types'

/**
 * The deployment's own description: its limits, and what a guest is served.
 * Long-lived by nature — it changes when the server is redeployed, not while
 * somebody is reading — so it is held for the visit rather than re-read.
 *
 * It does NOT answer the product's name. That is the brand's, and the brand is
 * known from the host before the first request goes out; asking a server for it
 * left every deployment nameless until the read landed, and permanently nameless
 * wherever the route does not exist.
 */
export const useConfig = () =>
  useRead<Config>(keys.config, () => http.get<Config>(api.config), { fresh: Infinity })

/** Which providers answer here, and what each of them can do. */
export const useEndpoints = () =>
  useRead<Endpoints>(keys.endpoints, () => http.get<Endpoints>(api.endpoints), { fresh: 300_000 })

/** Which models each provider will serve. */
export const useModels = () =>
  useRead<Models>(keys.models, () => http.get<Models>(api.models), { fresh: 300_000 })

/**
 * Close the account. Answers, and then the session it belonged to is over — the
 * caller signs out, because a client holding a token for a deleted account is
 * the one state neither side can make sense of.
 */
export const useCloseAccount = () => useSend<void, void>(() => http.drop<void>(api.user.close), [])

/** Read the world again — after signing in, or after an import lands. */
export const refresh = () => invalidate()
