/**
 * The one client for api.hanzo.ai.
 *
 * Everything this app asks the estate goes through here: the models it may use,
 * the threads it has, and the turn it is streaming. There is no second HTTP
 * client for any of it — `createAiClient` owns the base URL, the bearer, the
 * retry on a stale token and the SSE decode, so none of those is decided again
 * in this repo.
 *
 * The token source is the SAME `@hanzo/iam` instance the session signs in with,
 * handed over structurally as the SDK's `IamAuth`. That is the whole integration:
 * the SDK takes a fresh token per request and calls `invalidate()` when one is
 * refused, so a token that ages out mid-visit is re-minted without this app
 * owning a renewal, a single-flight, or a replay.
 *
 * `baseUrl` is deliberately unset. The SDK already defaults to
 * https://api.hanzo.ai, and naming it here would be a second copy of that fact
 * that can drift from it — and would pin one image to one estate.
 */
import { createAiClient, type AiClient } from '@hanzo/ai'

import { iam } from '~/data/iam'

let client: AiClient | null = null

/**
 * Built on first use, for the same reason the IAM instance is: it closes over
 * one, and that one reads `window`.
 *
 * A guest gets a client too. `getValidAccessToken` answers `null` for a browser
 * with no session, the SDK sends no bearer, and the server decides what an
 * anonymous caller may do — which is the one place that decision belongs. The
 * alternative, a client built only once somebody signs in, means every read on
 * the way to the sign-in has to ask whether it exists yet.
 */
export const ai = (): AiClient => (client ??= createAiClient({ auth: iam() }))
