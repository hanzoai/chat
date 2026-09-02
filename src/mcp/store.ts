/**
 * Reactive store for MCP Servers and Skills connectors with native install capabilities.
 */
import { useEffect, useState } from 'react'
import { DEFAULT_MCP_SERVERS, type McpServer } from './types'

export interface McpState {
  servers: McpServer[]
  isOpen: boolean
  activeServerId: string | null
}

let state: McpState = {
  servers: [...DEFAULT_MCP_SERVERS],
  isOpen: false,
  activeServerId: null,
}

const listeners = new Set<(s: McpState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const mcpStore = {
  get: (): McpState => state,

  open: (serverId?: string) => {
    state = {
      ...state,
      isOpen: true,
      activeServerId: serverId || state.activeServerId || state.servers[0]?.id || null,
    }
    notify()
  },

  close: () => {
    state = { ...state, isOpen: false }
    notify()
  },

  toggle: () => {
    state = { ...state, isOpen: !state.isOpen }
    notify()
  },

  selectServer: (id: string) => {
    state = { ...state, activeServerId: id }
    notify()
  },

  toggleServerStatus: (id: string) => {
    state = {
      ...state,
      servers: state.servers.map((s) =>
        s.id === id
          ? {
              ...s,
              status: s.status === 'connected' ? 'disabled' : 'connected',
            }
          : s,
      ),
    }
    notify()
  },

  addCustomServer: (name: string, description: string, command: string, category: any = 'DevOps') => {
    const newServer: McpServer = {
      id: `mcp-${Date.now()}`,
      name,
      description,
      version: '1.0.0',
      status: 'connected',
      category,
      icon: 'terminal',
      toolsCount: 3,
      tools: [
        { name: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_exec`, description: `Execute native command: ${command}` },
        { name: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_query`, description: 'Query status and streaming events' },
        { name: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_inspect`, description: 'Inspect runtime AST and state' },
      ],
    }
    state = {
      ...state,
      servers: [newServer, ...state.servers],
      activeServerId: newServer.id,
    }
    notify()
  },
}

export const useMcp = (): McpState => {
  const [current, setCurrent] = useState<McpState>(state)

  useEffect(() => {
    const handler = (next: McpState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
