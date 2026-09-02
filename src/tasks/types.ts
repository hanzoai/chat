/**
 * Durable Task Queue & CI/CD Pipeline types.
 */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying'
export type TaskTrigger = 'manual' | 'ci_cd' | 'agent_swarm' | 'cron'

export interface DurableTask {
  id: string
  title: string
  assignedAgent: string // e.g. '@dev', '@secops', '@executor'
  status: TaskStatus
  progress: number // 0-100
  currentStep: string
  retries: number
  maxRetries: number
  trigger: TaskTrigger
  startedAt: string
  duration?: string
  logs: string[]
  artifacts?: string[]
}
