/**
 * The client for api.hanzo.ai.
 */
import { createAiClient, type AiClient } from '@hanzo/ai'
import { brand } from '~/brand'
import { iam } from '~/data/iam'

let client: AiClient | null = null

/**
 * Where the API is, when it is not where the SDK assumes.
 *
 * A named address wins: `VITE_HANZO_API` points a run at a local cloud, and
 * `VITE_HANZO_IAM` moves the bearer with it — WHERE the API is and WHO is
 * calling it are separate questions, and naming only the first answered 401 on
 * every call.
 *
 * Unnamed, a DEV run is the origin serving this document. The SDK's default is
 * absolute, and api.hanzo.ai grants CORS to the hosts a brand states and to no
 * loopback origin, so an unset variable sends every call cross-origin to a
 * preflight that fails — a shell that paints and then holds nothing, which is
 * the failure this reads as. The `/v1` proxy in `vite.config.ts` exists to
 * carry those calls and can only carry a same-origin path. A built app keeps
 * the SDK's default, which is the host that already answers for its origin.
 */
const where = (): string | undefined =>
  (import.meta.env.VITE_HANZO_API as string) ||
  (import.meta.env.DEV ? window.location.origin : undefined)

export const ai = (): AiClient =>
  (client ??= createAiClient({
    publishableKey: brand.publishableKey,
    auth: iam(),
    ...(where() ? { baseUrl: where() as string } : {}),
  }))
