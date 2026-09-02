/**
 * Multi-Agent Swarm definitions and roles.
 */
export interface AgentDefinition {
  id: string
  handle: string
  name: string
  role: string
  avatar: string
  badgeColor: string
  systemPrompt: string
  capabilities: readonly string[]
  iconName: 'brain' | 'code' | 'shield' | 'search' | 'zap'
}

export const AGENT_ROSTER: readonly AgentDefinition[] = [
  {
    id: 'planner',
    handle: '@planner',
    name: 'Architect & Planner',
    role: 'Decomposes complex requests into DAG execution phases.',
    avatar: 'https://cdn.hanzo.ai/avatars/planner.png',
    badgeColor: '#818cf8',
    systemPrompt: 'You are Hanzo Planner, an elite systems architect and project planner.',
    capabilities: ['Architecture DAG', 'Milestone Planning', 'Risk Analysis'],
    iconName: 'brain',
  },
  {
    id: 'dev',
    handle: '@dev',
    name: 'Full-Stack SWE',
    role: 'Synthesizes clean Next.js 16, React 19, and ZAP microservices.',
    avatar: 'https://cdn.hanzo.ai/avatars/dev.png',
    badgeColor: '#34d399',
    systemPrompt: 'You are Hanzo Dev, a staff software engineer specializing in TypeScript, Next.js 16, and ZAP protocol.',
    capabilities: ['Code Synthesis', 'Refactoring', 'Bug Fixing', 'Test Generation'],
    iconName: 'code',
  },
  {
    id: 'secops',
    handle: '@secops',
    name: 'SecOps & Guardrails',
    role: 'Audits KMS enclaves, gVisor microVMs, and zero-trust IAM policies.',
    avatar: 'https://cdn.hanzo.ai/avatars/secops.png',
    badgeColor: '#f87171',
    systemPrompt: 'You are Hanzo SecOps, a zero-trust cloud security and cryptographic enclave specialist.',
    capabilities: ['KMS Envelope Audit', 'gVisor Isolation', 'IAM Policy Verification', 'Vulnerability Scan'],
    iconName: 'shield',
  },
  {
    id: 'researcher',
    handle: '@researcher',
    name: 'Deep Research & RAG',
    role: 'Scrapes live docs, reads GitHub repositories, and extracts verified citations.',
    avatar: 'https://cdn.hanzo.ai/avatars/researcher.png',
    badgeColor: '#fbbf24',
    systemPrompt: 'You are Hanzo Researcher, a literature and deep technical documentation researcher.',
    capabilities: ['Web Search', 'Paper Extraction', 'Citation Verification', 'GitHub Search'],
    iconName: 'search',
  },
  {
    id: 'executor',
    handle: '@executor',
    name: 'Sandbox & Infra Runner',
    role: 'Runs builds, executes tests, and manages local k3s containers and Cloud MicroVMs.',
    avatar: 'https://cdn.hanzo.ai/avatars/executor.png',
    badgeColor: '#60a5fa',
    systemPrompt: 'You are Hanzo Executor, an autonomous DevOps and cloud container orchestrator.',
    capabilities: ['k3s Container Execution', 'eBPF Tracing', 'Cloud MicroVM Deploy', 'Playwright E2E'],
    iconName: 'zap',
  },
]
