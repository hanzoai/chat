/**
 * Scheduled Tasks & Automations Types.
 */
export type AutomationTrigger = 'cron' | 'git_push' | 'webhook' | 'agent_event'
export type AutomationStatus = 'active' | 'paused' | 'running'

export interface AutomationJob {
  id: string
  name: string
  description: string
  trigger: AutomationTrigger
  schedule?: string
  assignedAgent: string
  runtimeTarget: 'local-k3s' | 'hanzo-cloud' | 'gvisor-enclave'
  status: AutomationStatus
  lastRun?: string
  nextRun?: string
  runCount: number
}
