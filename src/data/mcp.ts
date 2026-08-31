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
import type { McpServer, McpStatus } from '~/data/types'

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
