/**
 * Scheduled Tasks and Automations Store.
 */
import { useEffect, useState } from 'react'
import type { AutomationJob } from './types'

export interface AutomationsState {
  isOpen: boolean
  jobs: AutomationJob[]
}

const DEFAULT_JOBS: AutomationJob[] = [
  {
    id: 'job-secops-audit',
    name: 'Hourly KMS & SecOps Vulnerability Sweep',
    description: 'Inspect dependencies, hardware enclave key expiration, and gVisor isolation barriers.',
    trigger: 'cron',
    schedule: '0 * * * * (Hourly)',
    assignedAgent: '@secops',
    runtimeTarget: 'gvisor-enclave',
    status: 'active',
    lastRun: '18m ago',
    nextRun: 'in 42m',
    runCount: 142,
  },
  {
    id: 'job-model-benchmark',
    name: 'Daily DeepSeek & ZAP Latency Benchmark',
    description: 'Execute automated p99 token streaming speed benchmarks and vector retrieval scoring.',
    trigger: 'cron',
    schedule: '0 0 * * * (Daily @ 00:00 UTC)',
    assignedAgent: '@researcher',
    runtimeTarget: 'hanzo-cloud',
    status: 'active',
    lastRun: '8h ago',
    nextRun: 'in 16h',
    runCount: 28,
  },
  {
    id: 'job-git-deploy',
    name: 'On Git Push -> Auto-Deploy Local k3s Pod',
    description: 'Listen on local git hooks, recompile Next.js 16 components, and deploy Traefik ingress.',
    trigger: 'git_push',
    schedule: 'On push to main',
    assignedAgent: '@dev',
    runtimeTarget: 'local-k3s',
    status: 'active',
    lastRun: '2m ago',
    nextRun: 'Waiting for event',
    runCount: 89,
  },
  {
    id: 'job-vector-reindex',
    name: 'Continuous AST Vector Memory Sync',
    description: 'Sync modified TypeScript AST symbols into PostgreSQL pgvector table on file change.',
    trigger: 'agent_event',
    schedule: 'Every 15 minutes',
    assignedAgent: '@planner',
    runtimeTarget: 'local-k3s',
    status: 'active',
    lastRun: '6m ago',
    nextRun: 'in 9m',
    runCount: 310,
  },
]

let state: AutomationsState = {
  isOpen: false,
  jobs: DEFAULT_JOBS,
}

const listeners = new Set<(state: AutomationsState) => void>()
const notify = () => listeners.forEach((fn) => fn(state))

export const automationsStore = {
  get: () => state,
  open: () => {
    state = { ...state, isOpen: true }
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
  toggleStatus: (jobId: string) => {
    state = {
      ...state,
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, status: j.status === 'active' ? 'paused' : 'active' }
          : j,
      ),
    }
    notify()
  },
  runNow: (jobId: string) => {
    state = {
      ...state,
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, status: 'running', lastRun: 'Just now', runCount: j.runCount + 1 }
          : j,
      ),
    }
    notify()

    setTimeout(() => {
      state = {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === jobId ? { ...j, status: 'active' } : j,
        ),
      }
      notify()
    }, 2000)
  },
  createJob: (name: string, description: string, agent: string = '@dev') => {
    const newJob: AutomationJob = {
      id: `job_${Date.now()}`,
      name,
      description,
      trigger: 'cron',
      schedule: '0 * * * * (Hourly)',
      assignedAgent: agent,
      runtimeTarget: 'local-k3s',
      status: 'active',
      lastRun: 'Never',
      nextRun: 'in 60m',
      runCount: 0,
    }
    state = {
      ...state,
      jobs: [newJob, ...state.jobs],
    }
    notify()
  },
}

export const useAutomations = () => {
  const [val, setVal] = useState<AutomationsState>(state)
  useEffect(() => {
    listeners.add(setVal)
    return () => {
      listeners.delete(setVal)
    }
  }, [])
  return val
}
