/**
 * The plugins this deployment mounted.
 *
 * `GET /v1/tools/plugins?all=true` reports what the composition root declared —
 * a name, whether it is switched on, and the URL prefixes it answers. That is
 * the whole record, and it is a report rather than a marketplace: nothing here
 * has an author, a rating, a download count or a version, because the route
 * answers none of those, and nothing installs or uninstalls, because the route
 * is GET and the switch is the deployment's, not the reader's.
 *
 * The `plugins` name is shared with a second, unrelated plane — the TypeScript
 * an org authors and builds under `/v1/tools/plugins/authored`. That is
 * authoring, not mounting, and it is not this surface.
 */
import { useSyncExternalStore } from 'react'
import type { PluginMount } from '@hanzo/ai'

import { client, ESTATE } from '~/data/origin'
import type { Key } from '~/data/keys'
import { useRead } from '~/data/query'
import { useSession } from '~/data/session'

const key: Key = ['plugins']

let open = false
const listeners = new Set<() => void>()
const set = (next: boolean) => {
  open = next
  listeners.forEach((fn) => fn())
}

export const pluginsStore = {
  get: () => open,
  open: () => set(true),
  close: () => set(false),
  toggle: () => set(!open),
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const held = () => open

export type PluginsState = {
  isOpen: boolean
  plugins: PluginMount[]
  pending: boolean
  /** Why there is nothing to show, when that is the reason. */
  error: unknown
}

export const usePlugins = (): PluginsState => {
  const { standing } = useSession()
  const isOpen = useSyncExternalStore(subscribe, held, held)
  const read = useRead<PluginMount[]>(key, () => client(ESTATE).tools.plugins({ all: true }), {
    enabled: standing === 'live',
  })
  return { isOpen, plugins: read.data ?? [], pending: read.pending, error: read.error }
}
