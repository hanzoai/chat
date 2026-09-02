/**
 * Store for Hanzo Workspace Suite (tasks, todo, notes, meet, tunnel).
 */
import { useEffect, useState } from 'react'
import type {
  MeetingSession,
  NoteDocument,
  TodoItem,
  WorkspaceAppId,
  ZeroTrustTunnel,
} from './types'

export interface WorkspaceAppsState {
  isOpen: boolean
  activeApp: WorkspaceAppId
  notes: NoteDocument[]
  activeNoteId: string | null
  todos: TodoItem[]
  meeting: MeetingSession
  tunnel: ZeroTrustTunnel
}

const DEFAULT_NOTES: NoteDocument[] = [
  {
    id: 'note-arch-spec',
    title: 'Hanzo Zero-Allocation ZAP Architecture Spec',
    content: `# ZAP Protocol & Microservices Architecture
- Zero-allocation binary encoding for telemetry & chat completions.
- Sub-millisecond p99 latency over NATS JetStream and eBPF kernel tracing.
- Hardware KMS envelope encryption (AES-256-GCM) on all microVM nodes.`,
    updatedAt: '3m ago',
    collaborators: ['user_self', 'agent_planner'],
    tags: ['Architecture', 'ZAP', 'Security'],
  },
  {
    id: 'note-sprint-goals',
    title: 'Q3 Swarm & Edge Cloud Roadmap',
    content: `# Q3 Objectives
1. Converge all desktop and mobile capabilities into Chat2.
2. Ship zero-trust Cloudflare & WireGuard tunnel sharing for local dev.
3. Integrate meet.hanzo.ai live transcription sidecar agents.`,
    updatedAt: '12m ago',
    collaborators: ['user_self', 'user_alex', 'agent_dev'],
    tags: ['Roadmap', 'Swarm'],
  },
]

const DEFAULT_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    text: 'Audit KMS hardware enclave key wrapping in gVisor sandboxes',
    completed: true,
    assignedAgent: '@secops',
    priority: 'P0',
  },
  {
    id: 'todo-2',
    text: 'Implement zero-trust Cloudflare tunnel ephemeral pairing',
    completed: false,
    assignedAgent: '@executor',
    priority: 'P0',
    dueDate: 'Today',
  },
  {
    id: 'todo-3',
    text: 'Wire real-time WebRTC audio room with @notetaker AI transcription',
    completed: false,
    assignedAgent: '@dev',
    priority: 'P1',
    dueDate: 'Tomorrow',
  },
  {
    id: 'todo-4',
    text: 'Benchmark ZAP binary protocol streaming vs standard SSE',
    completed: false,
    assignedAgent: '@planner',
    priority: 'P1',
  },
]

const DEFAULT_MEETING: MeetingSession = {
  id: 'meet-hanzo-daily',
  roomName: 'dev-swarm-standup',
  isLive: true,
  activeParticipants: [
    { id: 'user_self', name: 'You (Host)', isMuted: false, isCameraOn: true },
    { id: 'user_alex', name: 'Alex Vance', isMuted: false, isCameraOn: false },
    { id: 'agent_dev', name: '@dev (AI Assistant)', isMuted: false, isCameraOn: true, isAgent: true },
    { id: 'agent_planner', name: '@notetaker (AI)', isMuted: true, isCameraOn: false, isAgent: true },
  ],
  transcript: [
    { speaker: 'Alex Vance', text: 'Local k3s cluster is configured with Traefik v3 ingress.', timestamp: '10:42 AM' },
    { speaker: '@dev', text: 'All Next.js 16 routes and ZAP streams verified with 22/22 unit tests passing.', timestamp: '10:43 AM' },
    { speaker: 'You', text: 'Let us spin up the Zero-Trust tunnel so the design team can test the preview.', timestamp: '10:44 AM' },
    { speaker: '@notetaker', text: '✓ Action item logged: Ephemeral ZT tunnel exposed to team.', timestamp: '10:44 AM' },
  ],
  aiSummary: 'Team confirmed local k3s cluster readiness and Next.js 16 build stability. Next step is enabling Zero-Trust tunnel sharing for team co-piloting.',
}

const DEFAULT_TUNNEL: ZeroTrustTunnel = {
  status: 'active',
  tunnelUrl: 'https://dev-z-machine.zt.hanzo.ai',
  localPort: 5173,
  connectedClients: 3,
  enclaveKey: 'kms-gvisor-ec25519-7f39a0',
}

const APPS_STORAGE_KEY = 'hanzo:chat2:workspace_apps:v2'

function loadSavedAppsState(): { notes: NoteDocument[]; todos: TodoItem[]; tunnel: ZeroTrustTunnel } {
  if (typeof window === 'undefined') {
    return { notes: DEFAULT_NOTES, todos: DEFAULT_TODOS, tunnel: DEFAULT_TUNNEL }
  }
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY)
    if (!raw) return { notes: DEFAULT_NOTES, todos: DEFAULT_TODOS, tunnel: DEFAULT_TUNNEL }
    const parsed = JSON.parse(raw)
    return {
      notes: Array.isArray(parsed.notes) && parsed.notes.length > 0 ? parsed.notes : DEFAULT_NOTES,
      todos: Array.isArray(parsed.todos) && parsed.todos.length > 0 ? parsed.todos : DEFAULT_TODOS,
      tunnel: parsed.tunnel || DEFAULT_TUNNEL,
    }
  } catch {
    return { notes: DEFAULT_NOTES, todos: DEFAULT_TODOS, tunnel: DEFAULT_TUNNEL }
  }
}

function persistAppsState(notes: NoteDocument[], todos: TodoItem[], tunnel: ZeroTrustTunnel) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify({ notes, todos, tunnel }))
  } catch {}
}

const saved = loadSavedAppsState()

let state: WorkspaceAppsState = {
  isOpen: false,
  activeApp: 'tasks',
  notes: saved.notes,
  activeNoteId: saved.notes[0]?.id || 'note-arch-spec',
  todos: saved.todos,
  meeting: DEFAULT_MEETING,
  tunnel: saved.tunnel,
}

const listeners = new Set<(s: WorkspaceAppsState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const workspaceAppsStore = {
  get: (): WorkspaceAppsState => state,

  open: (app: WorkspaceAppId = 'tasks') => {
    state = { ...state, isOpen: true, activeApp: app }
    notify()
  },

  close: () => {
    state = { ...state, isOpen: false }
    notify()
  },

  toggle: (app: WorkspaceAppId = 'tasks') => {
    if (state.isOpen && state.activeApp === app) {
      state = { ...state, isOpen: false }
    } else {
      state = { ...state, isOpen: true, activeApp: app }
    }
    notify()
  },

  setActiveApp: (activeApp: WorkspaceAppId) => {
    state = { ...state, activeApp }
    notify()
  },

  // Note actions
  selectNote: (id: string) => {
    state = { ...state, activeNoteId: id }
    notify()
  },

  updateNoteContent: (id: string, content: string) => {
    const notes = state.notes.map((n) => (n.id === id ? { ...n, content, updatedAt: 'Just now' } : n))
    state = { ...state, notes }
    persistAppsState(notes, state.todos, state.tunnel)
    notify()
  },

  addNote: (title = 'Untitled Note') => {
    const newNote: NoteDocument = {
      id: `note-${Date.now()}`,
      title,
      content: `# ${title}\n\nStart writing markdown or ask @dev to brainstorm...`,
      updatedAt: 'Just now',
      collaborators: ['user_self'],
      tags: ['Draft'],
    }
    const notes = [newNote, ...state.notes]
    state = {
      ...state,
      notes,
      activeNoteId: newNote.id,
    }
    persistAppsState(notes, state.todos, state.tunnel)
    notify()
  },

  deleteNote: (id: string) => {
    const notes = state.notes.filter((n) => n.id !== id)
    state = {
      ...state,
      notes,
      activeNoteId: state.activeNoteId === id ? notes[0]?.id || null : state.activeNoteId,
    }
    persistAppsState(notes, state.todos, state.tunnel)
    notify()
  },

  // Todo actions
  toggleTodo: (id: string) => {
    const todos = state.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    state = { ...state, todos }
    persistAppsState(state.notes, todos, state.tunnel)
    notify()
  },

  addTodo: (text: string, assignedAgent?: string, priority: TodoItem['priority'] = 'P1') => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
      assignedAgent,
      priority,
    }
    const todos = [newTodo, ...state.todos]
    state = { ...state, todos }
    persistAppsState(state.notes, todos, state.tunnel)
    notify()
  },

  deleteTodo: (id: string) => {
    const todos = state.todos.filter((t) => t.id !== id)
    state = { ...state, todos }
    persistAppsState(state.notes, todos, state.tunnel)
    notify()
  },

  // Tunnel actions
  toggleTunnel: () => {
    const tunnel = {
      ...state.tunnel,
      status: state.tunnel.status === 'active' ? ('offline' as const) : ('active' as const),
    }
    state = { ...state, tunnel }
    persistAppsState(state.notes, state.todos, tunnel)
    notify()
  },
}

export const useWorkspaceApps = (): WorkspaceAppsState => {
  const [current, setCurrent] = useState<WorkspaceAppsState>(state)

  useEffect(() => {
    const handler = (next: WorkspaceAppsState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
