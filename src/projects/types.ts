/**
 * Projects, Organizations, and Multi-User Identity Types.
 */
export interface Organization {
  id: string
  name: string
  slug: string
  tier: 'free' | 'pro' | 'enterprise'
  avatar?: string
  membersCount: number
}

export interface UserIdentity {
  id: string
  name: string
  email: string
  role: 'admin' | 'engineer' | 'designer' | 'guest'
  avatar?: string
}

export interface Project {
  id: string
  name: string
  description: string
  orgId: string
  runtimeTarget: 'local-k3s' | 'hanzo-cloud' | 'gvisor-enclave'
  assignedAgents: string[]
  collaboratorsCount: number
  updatedAt: string
  tags: string[]
}
