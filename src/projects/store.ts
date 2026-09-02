/**
 * Projects, Organizations, and Multi-User Store.
 */
import { useEffect, useState } from 'react'
import type { Organization, Project, UserIdentity } from './types'

export interface ProjectsState {
  isOpen: boolean
  activeOrgId: string
  activeUserId: string
  activeProjectId: string
  organizations: Organization[]
  users: UserIdentity[]
  projects: Project[]
}

const DEFAULT_ORGS: Organization[] = [
  { id: 'org_hanzo', name: 'Hanzo AI', slug: 'hanzo', tier: 'enterprise', membersCount: 14 },
  { id: 'org_acme', name: 'Acme AI Labs', slug: 'acme', tier: 'pro', membersCount: 6 },
  { id: 'org_lux', name: 'Lux Commerce Studio', slug: 'lux', tier: 'pro', membersCount: 4 },
  { id: 'org_personal', name: 'Personal Workspace', slug: 'personal', tier: 'free', membersCount: 1 },
]

const DEFAULT_USERS: UserIdentity[] = [
  { id: 'usr_z', name: 'z (You)', email: 'z@hanzo.ai', role: 'admin' },
  { id: 'usr_guest', name: 'Guest Developer', email: 'guest@hanzo.ai', role: 'guest' },
]

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj_storefront',
    name: 'Next.js 16 Luxury Storefront',
    description: 'Autonomous commerce application with @hanzo/ui and pgvector search.',
    orgId: 'org_hanzo',
    runtimeTarget: 'local-k3s',
    assignedAgents: ['@dev', '@planner'],
    collaboratorsCount: 1,
    updatedAt: '2m ago',
    tags: ['Next.js 16', 'React 19', 'Commerce'],
  },
  {
    id: 'proj_zap',
    name: 'ZAP High-Throughput Binary Stream',
    description: 'Sub-millisecond microservice bus with zero-allocation memory pooling.',
    orgId: 'org_hanzo',
    runtimeTarget: 'gvisor-enclave',
    assignedAgents: ['@secops', '@executor'],
    collaboratorsCount: 1,
    updatedAt: '15m ago',
    tags: ['ZAP', 'eBPF', 'NATS'],
  },
  {
    id: 'proj_metaverse',
    name: 'Spatial 3D Metaverse Engine',
    description: 'WebGPU shaders and real-time physical product customizer.',
    orgId: 'org_lux',
    runtimeTarget: 'hanzo-cloud',
    assignedAgents: ['@dev', '@researcher'],
    collaboratorsCount: 1,
    updatedAt: '1h ago',
    tags: ['Three.js', 'WebGPU', 'GLSL'],
  },
]

let state: ProjectsState = {
  isOpen: false,
  activeOrgId: 'org_hanzo',
  activeUserId: 'usr_z',
  activeProjectId: 'proj_storefront',
  organizations: DEFAULT_ORGS,
  users: DEFAULT_USERS,
  projects: DEFAULT_PROJECTS,
}

const listeners = new Set<(state: ProjectsState) => void>()
const notify = () => listeners.forEach((fn) => fn(state))

export const projectsStore = {
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
  setActiveOrg: (orgId: string) => {
    state = { ...state, activeOrgId: orgId }
    notify()
  },
  setActiveUser: (userId: string) => {
    state = { ...state, activeUserId: userId }
    notify()
  },
  setActiveProject: (projectId: string) => {
    state = { ...state, activeProjectId: projectId }
    notify()
  },
  createOrg: (name: string, slug: string) => {
    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      tier: 'pro',
      membersCount: 1,
    }
    state = {
      ...state,
      organizations: [...state.organizations, newOrg],
      activeOrgId: newOrg.id,
    }
    notify()
  },
  createProject: (name: string, description: string, tags: string[] = ['Next.js 16']) => {
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      orgId: state.activeOrgId,
      runtimeTarget: 'local-k3s',
      assignedAgents: ['@dev', '@planner'],
      collaboratorsCount: 1,
      updatedAt: 'Just now',
      tags,
    }
    state = {
      ...state,
      projects: [newProj, ...state.projects],
      activeProjectId: newProj.id,
    }
    notify()
  },
}

export const useProjects = () => {
  const [val, setVal] = useState<ProjectsState>(state)
  useEffect(() => {
    listeners.add(setVal)
    return () => {
      listeners.delete(setVal)
    }
  }, [])
  return val
}
