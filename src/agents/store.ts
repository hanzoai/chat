/**
 * The org's agents, and which of them this browser is addressing.
 *
 * `/v1/agents` is the whole store: list, define, run, remove. An agent is a
 * model, a system prompt and a set of tool names; running one records a run
 * against it. Everything drawn from here was said by the server, so an agent
 * this org has not defined is absent rather than imagined — the roster of five
 * invented specialists that used to live in `types.ts` is gone with the file.
 *
 * Selection is the one thing HELD rather than read. Which agents the composer
 * addresses is this browser's choice and no route records it, so it starts
 * empty and only ever holds names somebody picked.
 */
import { APIError, type Agent, type AgentCreateParams, type AgentDetail, type AgentRun } from '@hanzo/ai'
import { useEffect, useState } from 'react'

import { ai } from '~/data/ai'
import type { Key } from '~/data/keys'
import { invalidate, useRead } from '~/data/query'
import { useSession } from '~/data/session'

/**
 * What a reader is told when the server answers nothing, or does not answer.
 *
 * Two facts, kept apart: an org that has defined no agents is EMPTY, and a read
 * that failed is UNREAD. Collapsing them would report an outage as a tidy inbox.
 */
export const none = 'No agents are defined in this org yet.'
export const unread = 'The agents could not be read.'

/** One agent nests under the set, so defining or removing one drops both. */
const set: Key = ['agents']
const one = (ref: string): Key => ['agents', 'one', ref]

/** Every agent the org has defined, each with its recorded run count. */
export const useAgents = () => {
  const { standing } = useSession()
  return useRead<Agent[]>(set, () => ai().agents.list(), { enabled: standing === 'live' })
}

/** One agent with its system prompt and its most recent runs. */
export const useAgent = (ref: string | null) => {
  const { standing } = useSession()
  return useRead<AgentDetail>(one(ref ?? ''), () => ai().agents.get(ref as string), {
    enabled: standing === 'live' && Boolean(ref),
  })
}

/** The tool names an agent may be granted. The same catalogue a run resolves. */
export const useTools = (enabled = true) => {
  const { standing } = useSession()
  return useRead(['tools'] as Key, () => ai().tools.list(), {
    enabled: enabled && standing === 'live',
    fresh: 300_000,
  })
}

/** Defines an agent in the caller's org. */
export const create = async (params: AgentCreateParams): Promise<Agent> => {
  const agent = await ai().agents.create(params)
  invalidate(set)
  return agent
}

/** Removes an agent and every run recorded against it. */
export const remove = async (ref: string): Promise<void> => {
  await ai().agents.delete(ref)
  swarmStore.deselect(ref)
  invalidate(set)
}

/**
 * Runs an agent and answers the run that was recorded.
 *
 * A failed run is a 502 whose body IS the run — the execution happened and its
 * `error` is the product — so the envelope is unwrapped rather than reported as
 * an opaque failure, which would throw away the only account of what went wrong.
 */
export const run = async (ref: string, input: string): Promise<AgentRun> => {
  try {
    return await ai().agents.run(ref, input)
  } catch (failure) {
    const recorded = failure instanceof APIError ? (failure.body as AgentRun | undefined) : undefined
    if (recorded?.status) return recorded
    throw failure
  } finally {
    invalidate(set, one(ref))
  }
}

export interface SwarmState {
  /** Agent NAMES, as `/v1/agents` answers them. */
  activeAgentIds: string[]
  swarmMode: boolean
  isHubOpen: boolean
}

let state: SwarmState = { activeAgentIds: [], swarmMode: false, isHubOpen: false }
const listeners = new Set<(s: SwarmState) => void>()

const put = (next: Partial<SwarmState>) => {
  state = { ...state, ...next }
  for (const fn of listeners) fn(state)
}

export const swarmStore = {
  get: (): SwarmState => state,
  openHub: () => put({ isHubOpen: true }),
  closeHub: () => put({ isHubOpen: false }),
  toggleHub: () => put({ isHubOpen: !state.isHubOpen }),
  setSwarmMode: (swarmMode: boolean) => put({ swarmMode }),

  toggleAgent: (name: string) =>
    put({
      activeAgentIds: state.activeAgentIds.includes(name)
        ? state.activeAgentIds.filter((a) => a !== name)
        : [...state.activeAgentIds, name],
    }),

  /** An agent that no longer exists cannot stay selected. */
  deselect: (name: string) =>
    put({ activeAgentIds: state.activeAgentIds.filter((a) => a !== name) }),
}

export const useSwarm = (): SwarmState => {
  const [current, setCurrent] = useState<SwarmState>(state)
  useEffect(() => {
    listeners.add(setCurrent)
    return () => {
      listeners.delete(setCurrent)
    }
  }, [])
  return current
}
