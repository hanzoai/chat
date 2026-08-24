/**
 * The tools a conversation can reach, and whether they are actually connected.
 *
 * Three routes answer three shapes of the same fact, and each answers a
 * dictionary keyed by server name. Dictionaries are turned into arrays HERE,
 * because the interface renders a list and `Object.entries` at four call sites
 * is four chances to sort it differently.
 *
 * The per-server status route spells the state `connectionStatus` while the
 * all-servers route spells it `connectionState`. One of those names is going to
 * lose; it loses here, once, instead of in whichever component happened to call
 * the other route.
 */
import { api } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { invalidate, useRead, useSend } from '~/data/query'
import type { McpEntry, McpServer, McpStatus } from '~/data/types'

type ServerConfigs = Record<string, Omit<McpServer, 'serverName'> & { serverName?: string }>

/** Every configured server. */
export const useServers = (enabled = true) =>
  useRead<McpServer[]>(
    keys.servers,
    async () => {
      const configs = await http.get<ServerConfigs>(api.mcp.servers)
      return Object.entries(configs ?? {}).map(([serverName, config]) => ({
        ...config,
        serverName,
      }))
    },
    { enabled },
  )

/** Every server with its tools, as the tool menu lists them. */
export const useTools = (enabled = true) =>
  useRead<McpEntry[]>(
    keys.tools,
    async () => {
      const { servers } = await http.get<{ servers?: Record<string, McpEntry> }>(api.mcp.tools)
      return Object.values(servers ?? {})
    },
    { enabled },
  )

/** Which servers are connected, keyed by name. */
export const useConnections = (enabled = true) =>
  useRead<Record<string, McpStatus>>(
    keys.status,
    async () => {
      const { connectionStatus } = await http.get<{
        connectionStatus?: Record<string, McpStatus>
      }>(api.mcp.status)
      return connectionStatus ?? {}
    },
    { enabled },
  )

/**
 * One server's connection, asked for directly.
 *
 * Worth its own read only while something is watching a single server come up —
 * a reconnect, an OAuth round trip — which is why it takes a poll interval
 * rather than sharing the list's freshness.
 */
export const useConnection = (server: string | null | undefined, enabled = true) =>
  useRead<McpStatus>(
    keys.statusOf(server ?? ''),
    async () => {
      const answer = await http.get<{
        connectionStatus?: string
        requiresOAuth?: boolean
      }>(api.mcp.statusOf(server as string))
      return {
        connectionState: answer.connectionStatus ?? 'disconnected',
        requiresOAuth: answer.requiresOAuth,
      }
    },
    { enabled: enabled && Boolean(server), fresh: 0 },
  )

/**
 * Begin an OAuth connection to a server.
 *
 * The server answers by setting the one-shot cookie that binds the round trip
 * to this browser; the visitor is then sent to the provider. Nothing here holds
 * a credential — this only starts the trip.
 */
export const useBind = () =>
  useSend<string, { success: boolean }>(
    (server) => http.post<{ success: boolean }>(api.mcp.bind(server)),
    [keys.status],
  )

/** Abandon an OAuth connection that was started and not finished. */
export const useCancel = () =>
  useSend<string, void>((server) => http.post<void>(api.mcp.cancel(server)), [keys.status])

/**
 * Reconnect a server.
 *
 * Its tools are read afresh as well as its state: reinitializing is what
 * somebody does when a server's tool list is wrong, so leaving the old list
 * cached would answer the complaint with the thing complained about.
 */
export const useRestart = () =>
  useSend<string, void>(async (server) => {
    await http.post<void>(api.mcp.restart(server))
    invalidate(keys.mcp)
  }, [])
