import type { ModelCatalogEntry } from '@hanzo/ui/models'

import type { Endpoints, Models, Spec } from '~/data/types'

/**
 * What the deployment serves, as ONE list a picker can read.
 *
 * Three answers arrive from the server and they are three views of one thing:
 * `/v1/chat/endpoints` says what is offered and how it is named,
 * `/v1/chat/models` says which models each of those serves, and `modelSpecs`
 * (from `/v1/chat/config`) is a deployment's own curated list, which WINS when
 * it is present — that is the whole point of curating one.
 *
 * Pure, and deliberately so: no fetch, no cache, no hook. `src/data` owns the
 * three requests and the vocabulary they arrive in; this owns the one shape
 * they collapse into, so the mapping can be read and changed without a network
 * in the way.
 */

/** Everything the three requests brought back. */
export interface Served {
  endpoints?: Endpoints | null
  models?: Models | null
  specs?: Spec[] | null
}

/**
 * An agent and an assistant are not models. They answer a different question
 * and belong in a different control, so they never reach this list.
 */
const APART = new Set(['agents', 'assistants'])

/**
 * A pick's id is its ADDRESS — the endpoint that answers and the model it runs
 * — because a model name alone does not say who serves it, and two endpoints
 * can offer the same name.
 */
export const address = (endpoint: string, model: string) => `${endpoint}/${model}`

/** The address, read back. The endpoint is the first segment; a model id may
 *  carry slashes of its own (`openai/gpt-4`), so only the first one is a cut. */
export const pick = (id: string): { endpoint: string; model: string } => {
  const cut = id.indexOf('/')
  return cut < 0
    ? { endpoint: '', model: id }
    : { endpoint: id.slice(0, cut), model: id.slice(cut + 1) }
}

const byOrder = (a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0)

/**
 * The catalog the picker reads.
 *
 * `family` is stated rather than derived. `@hanzo/ui/models` will guess one
 * from an owner or an id prefix when nothing says, and a guess made from an id
 * that is already an address (`Hanzo/zen5-flash`) groups by the wrong half.
 * The deployment named its endpoints; that name is the group.
 */
export function catalog({ endpoints, models, specs }: Served): ModelCatalogEntry[] {
  const named = (endpoint: string) => {
    const at = endpoints?.[endpoint]
    return at?.modelDisplayLabel ?? at?.name ?? endpoint
  }

  if (specs && specs.length > 0) {
    return [...specs].sort(byOrder).map((spec) => {
      const endpoint = spec.preset.endpoint ?? ''
      return {
        id: address(endpoint, spec.preset.model ?? ''),
        label: spec.label || spec.name,
        family: spec.group ?? named(endpoint),
        description: spec.description,
        context_window: spec.preset.maxContextTokens,
      }
    })
  }

  return Object.entries(endpoints ?? {})
    .filter(([name, at]) => at != null && at.userProvide !== true && !APART.has(name))
    .sort(([, a], [, b]) => byOrder(a ?? {}, b ?? {}))
    .flatMap(([endpoint]) =>
      (models?.[endpoint] ?? []).map((model) => ({
        id: address(endpoint, model),
        label: model,
        family: named(endpoint),
        owned_by: endpoint,
      })),
    )
}
