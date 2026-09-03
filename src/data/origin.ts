/**
 * Where a model runs.
 *
 * Two places answer the same wire — `/v1/models` and `/v1/chat/completions` —
 * so there is one client shape for both: the estate at api.hanzo.ai under the
 * visitor's IAM token, and the engine on this machine under the key it was
 * started with.
 *
 * A model's address is `origin/model`, so choosing a model chooses where it
 * runs. Nothing downstream of the picker knows there is more than one place.
 *
 * The engine's key is not decoration. Started without one it serves any caller
 * that can reach the port, and that port is bound on every interface — so the
 * shell mints a key, starts the engine with it, and holds it here. The estate
 * and the machine are then the same shape: an address, and a credential.
 */
import { createAiClient, type AiClient } from '@hanzo/ai'

import { brand } from '~/brand'
import { iam } from '~/data/iam'
import { shell } from '~/data/shell'
import { key } from '~/settings/prefs'

/** The estate. Its base URL is the SDK's default and is not restated. */
export const ESTATE = 'hanzo'

/** This machine. */
export const MACHINE = 'local'

/** Where the engine listens when the shell starts it. */
export const ENGINE = 'http://127.0.0.1:36900'

export interface Origin {
  id: string
  label: string
  /**
   * The one group every model here belongs to, when a publisher is not the
   * useful axis. The estate serves a hundred models from a dozen publishers and
   * `owned_by` is how a person finds one; the engine serves what it has loaded
   * and calls the publisher `local`, which tells a reader nothing they did not
   * already know from the group.
   */
  group?: string
}

/**
 * Every place this build can reach, in the order a picker lists them.
 *
 * The machine is only declared in the desktop: the web build has no engine to
 * ask, and asking anyway costs a failed request and a console error on every
 * load. `shell()` is settled before the first script runs, so an origin list
 * never has to wait to know.
 */
export const origins = (): Origin[] => [
  { id: ESTATE, label: brand.name },
  ...(shell() ? [{ id: MACHINE, label: 'On this machine', group: 'On this machine' }] : []),
]

const held = new Map<string, AiClient>()

/**
 * The client for one origin, built once.
 *
 * Built on first use rather than at module scope, for the same reason the IAM
 * instance is: it closes over one, and that one reads `window`.
 */
/**
 * Where the estate is, when it is not where the SDK assumes.
 *
 * A named address wins: `VITE_HANZO_API` points a run at a local cloud, and
 * `VITE_HANZO_IAM` moves the bearer with it — WHERE the estate is and WHO is
 * calling it are separate questions, and naming only the first answered 401 on
 * every call.
 *
 * Unnamed, a DEV run is the origin serving this document. The SDK's default is
 * absolute, and api.hanzo.ai grants CORS to the hosts a brand states and to no
 * loopback origin, so an unset variable sends every estate call cross-origin to
 * a preflight that fails. That is what makes a browser run read as signed out
 * when it is signed in — every read refused, for a reason that is neither the
 * server's nor this org's. The `/v1` proxy in `vite.config.ts` is what the
 * header above it says it is, and it can only carry a same-origin path. A built
 * app keeps the SDK's default. The machine is unaffected: it names its own.
 */
const estate = (): string | undefined =>
  (import.meta.env.VITE_HANZO_API as string) ||
  (import.meta.env.DEV ? window.location.origin : undefined)

export const client = (origin: string = ESTATE): AiClient => {
  const there = held.get(origin)
  if (there) return there
  const made =
    origin === MACHINE
      ? createAiClient({ baseUrl: ENGINE, token: key.get() })
      : createAiClient({
          publishableKey: brand.publishableKey,
          auth: iam(),
          ...(estate() ? { baseUrl: estate() as string } : {}),
        })
  held.set(origin, made)
  return made
}

/** Drop the machine's client so the next call carries a newly-set key. */
export const forget = () => held.delete(MACHINE)
