/**
 * The org's MCP servers, and the catalog they can be connected from.
 *
 * Three reads make one record. `tools.mcp()` lists what the org registered,
 * `tools.list({source:'mcp'})` lists what those registrations actually
 * contributed — each row already carrying `activated`, which the registry fills
 * per org and project, so activation is not read a second time — and
 * `tools.listing(id)` supplies the publisher's prose for a server enabled from a
 * catalog entry. Joining them here is what lets a row say "silent" — registered,
 * and nothing answered — instead of showing a green dot for a server the fleet
 * cannot reach.
 *
 * Two halves, deliberately: the PANEL (open, selected, the last refusal) is
 * module state because `open()` is pressed from the rail and the palette, which
 * are not inside this subtree; the SERVERS are `useRead`, so they share the
 * app's one cache and one invalidation.
 *
 * The activation write does not go through `tools.activate()`. That method
 * sends `{enabled}` and the route reads `{activate, deactivate}`, so it would
 * answer 200 having changed nothing — a control that looks pressed and is not.
 * `http` carries the body the server actually decodes.
 */
import { useSyncExternalStore } from 'react'

import { client, ESTATE } from '../data/origin.ts'
import { keys, sign, type Key } from '../data/keys.ts'
import { invalidate, peek, useRead } from '../data/query.ts'
import { useSession } from '../data/session.tsx'
import type { McpServer } from './types.ts'

const ACTIVATION = '/v1/tools/activation'
const SERVERS = '/v1/tools/mcp/servers'

/** Where a catalog page is kept — under `keys.mcp`, so both drop together. */
const catalogKey = (q: string): Key => ['mcp', 'catalog', sign({ q })]

type Panel = {
  isOpen: boolean
  activeServerId: string | null
  /** A write is in flight. */
  busy: boolean
  /** What the last write was refused with, in the server's words. */
  problem: string | null
}

let panel: Panel = { isOpen: false, activeServerId: null, busy: false, problem: null }

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())
const set = (next: Partial<Panel>) => {
  panel = { ...panel, ...next }
  notify()
}

const said = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** Runs one write, and lets its refusal reach the screen instead of the console. */
const write = async (run: () => Promise<void>) => {
  set({ busy: true, problem: null })
  try {
    await run()
    invalidate(keys.mcp)
  } catch (err) {
    set({ problem: said(err) })
  } finally {
    set({ busy: false })
  }
}

export const mcpStore = {
  get: (): Panel => panel,

  open: (serverId?: string) =>
    set({ isOpen: true, activeServerId: serverId ?? panel.activeServerId, problem: null }),

  close: () => set({ isOpen: false }),

  toggle: () => set({ isOpen: !panel.isOpen, problem: null }),

  selectServer: (id: string) => set({ activeServerId: id }),

  /**
   * Switches every tool one server contributes on, or off, in one request.
   *
   * The whole set is named rather than a delta of one, because the server's
   * status IS its tools' activation: a row reads connected when any of them is
   * dispatchable, so turning the row off has to reach all of them.
   */
  toggleServerStatus: (id: string) =>
    void write(async () => {
      const server = (peek<McpServer[]>(keys.servers) ?? []).find((s) => s.id === id)
      if (!server?.tools.length) return
      const names = server.tools.map((t) => t.name)
      const on = server.status !== 'connected'
      await client(ESTATE).http.json({
        method: 'PUT',
        path: ACTIVATION,
        body: on ? { activate: names, deactivate: [] } : { activate: [], deactivate: names },
      })
    }),

  /**
   * Registers one MCP server for the org — a catalog `listing`, or a `name` and
   * the `url` it answers JSON-RPC on. The secret is sealed into KMS by the
   * route and is never read back, which is why nothing here holds it.
   */
  connect: (input: {
    name?: string
    url?: string
    listing?: string
    authHeader?: string
    secret?: string
  }) =>
    void write(async () => {
      const created = await client(ESTATE).http.json<{ id?: string }>({
        method: 'POST',
        path: SERVERS,
        body: input,
      })
      if (created?.id) set({ activeServerId: created.id })
    }),

  /** Deregisters one, so its tools leave the org's plane. 204, so no body. */
  disconnect: (id: string) =>
    void write(async () => {
      await client(ESTATE).http.raw({ method: 'DELETE', path: `${SERVERS}/${encodeURIComponent(id)}` })
      if (panel.activeServerId === id) set({ activeServerId: null })
    }),
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const held = () => panel

/** Every registered server, joined to the tools it contributed and their activation. */
const load = async (): Promise<McpServer[]> => {
  const [registered, tools] = await Promise.all([
    client(ESTATE).tools.mcp(),
    client(ESTATE).tools.list({ source: 'mcp' }),
  ])

  return Promise.all(
    registered.map(async (server) => {
      const mine = tools.filter((t) => t.name.startsWith(`${server.id}_`))
      // The prose is a decoration on a registration that stands without it, so a
      // listing since unpublished leaves the server listed and unlabelled rather
      // than blanking every server the org has.
      const listing = server.listing
        ? await client(ESTATE).tools.listing(server.listing).catch(() => undefined)
        : undefined
      return {
        id: server.id,
        name: server.name ?? server.id,
        url: server.url ?? '',
        hasSecret: server.hasSecret ?? false,
        ...(server.listing ? { listing: server.listing } : {}),
        ...(listing?.description ? { description: listing.description } : {}),
        ...(listing?.version ? { version: listing.version } : {}),
        status: !mine.length
          ? ('silent' as const)
          : mine.some((t) => t.activated)
            ? ('connected' as const)
            : ('disabled' as const),
        tools: mine,
        toolsCount: mine.length,
      }
    }),
  )
}

export type McpState = Panel & {
  servers: McpServer[]
  pending: boolean
  /** Why there are no servers to show, when that is the reason. */
  error: unknown
}

export const useMcp = (): McpState => {
  const { standing } = useSession()
  const shown = useSyncExternalStore(subscribe, held, held)
  const read = useRead<McpServer[]>(keys.servers, load, { enabled: standing === 'live' })
  return { ...shown, servers: read.data ?? [], pending: read.pending, error: read.error }
}

/**
 * What the org COULD connect, as the public registries publish it.
 *
 * A different question from `useMcp` and a different route: this one is
 * paginated and searched server-side, so `q` is part of the key rather than a
 * filter applied to a list already in hand.
 */
export const useCatalog = (q: string) => {
  const { standing } = useSession()
  const read = useRead(
    catalogKey(q),
    () => client(ESTATE).tools.catalog({ ...(q ? { q } : {}), limit: 24 }),
    { enabled: standing === 'live' },
  )
  return { ...read, listings: read.data?.catalog ?? [], total: read.data?.total ?? 0 }
}
