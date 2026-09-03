import type { ModelCatalogEntry } from '@hanzo/ui/models'

import type { Origin } from '~/data/origin'
import type { Served } from '~/data/types'

/**
 * What can be asked, as ONE list a picker can read.
 *
 * `/v1/models` is the whole input, asked once per origin. It is the only route
 * that answers this question, so there is nothing to reconcile and no curated
 * second list that could win over it.
 *
 * Pure, and deliberately so: no fetch, no cache, no hook, and no import that
 * reaches one. `src/data` owns the requests and the vocabulary they arrive in;
 * this owns the one shape they collapse into, so the mapping can be read,
 * changed and tested without a network in the way — which is why the origins
 * are an argument rather than something this file goes and asks for.
 */

/**
 * A pick's id is its ADDRESS — where the model runs and which model it is —
 * because a model name alone does not say where, and the estate and this
 * machine can serve the same name.
 */
export const address = (origin: string, model: string) => `${origin}/${model}`

/** The address, read back. The origin is the first segment; a model id carries
 *  slashes of its own (`zenlm/zen-eco-4b`), so only the first one is a cut. */
export const pick = (id: string): { origin: string; model: string } => {
  const cut = id.indexOf('/')
  return cut < 0 ? { origin: '', model: id } : { origin: id.slice(0, cut), model: id.slice(cut + 1) }
}

/**
 * The catalog the picker reads.
 *
 * `family` is stated rather than derived. `@hanzo/ui/models` will guess one
 * from an owner or an id prefix when nothing says, and a guess made from an id
 * that is already an address groups by the wrong half. The origin says which
 * axis is the useful one — its own name, or the publisher.
 */
export function catalog(
  served: Served | null | undefined,
  where: readonly Origin[],
): ModelCatalogEntry[] {
  return where.flatMap(({ id, group }) =>
    Object.entries(served?.[id] ?? {}).flatMap(([owner, models]) =>
      models.map((model) => ({
        id: address(id, model),
        label: model,
        family: group ?? owner,
        owned_by: owner,
      })),
    ),
  )
}
