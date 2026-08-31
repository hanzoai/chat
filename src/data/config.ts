/**
 * What may be asked, and of whom.
 *
 * One read backs both answers. `/v1/models` lists every model the caller may
 * use, each carrying `owned_by`, and that field IS the provider — so the menu's
 * grouping is derived from the catalogue rather than read from a second route
 * that could disagree with it.
 *
 * The deployment-config read is gone. `/v1/chat/config` answered this client's
 * name, its limits, its guest policy and its MCP servers, and it does not exist:
 * every one of those was a fallback in practice. The name is the brand's and
 * always was; what a guest may do is decided server-side from the absence of a
 * bearer, which is where it belongs and where it was already decided.
 */
import { ai } from '~/data/ai'
import { keys } from '~/data/keys'
import { useRead } from '~/data/query'
import type { Models } from '~/data/types'

/** Who publishes a model, when it says. The menu's fallback group. */
const OTHER = 'other'

/**
 * Which models each provider serves.
 *
 * Held for the visit: a catalogue changes when the estate is redeployed, not
 * while somebody is choosing from it.
 *
 * Signed-in only, and not by choice: `createAiClient({ auth })` resolves a token
 * before every request and THROWS `AuthError` when the browser holds no session,
 * so an unguarded read by a guest fails before it reaches the network. See the
 * `anonymous` entry in `~/data/missing`.
 */
export const useModels = (enabled = true) =>
  useRead<Models>(
    keys.models,
    async () => {
      const listed = await ai().models.list()
      const grouped: Models = {}
      for (const model of listed) {
        const owner = typeof model.owned_by === 'string' && model.owned_by ? model.owned_by : OTHER
        ;(grouped[owner] ??= []).push(model.id)
      }
      return grouped
    },
    { enabled, fresh: 300_000 },
  )
