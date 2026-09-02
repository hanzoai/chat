/**
 * Reactive store for active agents, swarm orchestration, and Agents & Apps Hub.
 */
import { useEffect, useState } from 'react'
import { AGENT_ROSTER, type AgentDefinition } from './types'

export interface SwarmState {
  activeAgentIds: string[]
  swarmMode: boolean
  isExecuting: boolean
  activePhase: string | null
  isHubOpen: boolean
}

const DEFAULT_STATE: SwarmState = {
  activeAgentIds: ['dev'],
  swarmMode: false,
  isExecuting: false,
  activePhase: null,
  isHubOpen: false,
}

let state: SwarmState = { ...DEFAULT_STATE }
const listeners = new Set<(s: SwarmState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const swarmStore = {
  get: (): SwarmState => state,

  openHub: () => {
    state = { ...state, isHubOpen: true }
    notify()
  },

  closeHub: () => {
    state = { ...state, isHubOpen: false }
    notify()
  },

  toggleHub: () => {
    state = { ...state, isHubOpen: !state.isHubOpen }
    notify()
  },

  toggleAgent: (id: string) => {
    const exists = state.activeAgentIds.includes(id)
    if (exists) {
      if (state.activeAgentIds.length > 1) {
        state = {
          ...state,
          activeAgentIds: state.activeAgentIds.filter((a) => a !== id),
        }
      }
    } else {
      state = {
        ...state,
        activeAgentIds: [...state.activeAgentIds, id],
      }
    }
    notify()
  },

  setSwarmMode: (swarmMode: boolean) => {
    state = {
      ...state,
      swarmMode,
      // If entering swarm mode, activate Planner + Dev + SecOps + Executor
      activeAgentIds: swarmMode ? ['planner', 'dev', 'secops', 'executor'] : ['dev'],
    }
    notify()
  },

  getActiveAgents: (): AgentDefinition[] => {
    return AGENT_ROSTER.filter((a) => state.activeAgentIds.includes(a.id))
  },

  setExecutingPhase: (phase: string | null) => {
    state = {
      ...state,
      isExecuting: phase !== null,
      activePhase: phase,
    }
    notify()
  },
}

export const useSwarm = (): SwarmState => {
  const [current, setCurrent] = useState<SwarmState>(state)

  useEffect(() => {
    const handler = (next: SwarmState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
