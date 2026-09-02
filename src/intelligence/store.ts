/**
 * Contextual Memory & Code Intelligence store.
 */
import { useEffect, useState } from 'react'

export interface MemoryItem {
  id: string
  category: 'Project Rule' | 'User Preference' | 'Architecture Decision' | 'Enclave KMS Key'
  content: string
  updatedAt: string
  confidence: number
}

export interface SymbolIndexItem {
  name: string
  kind: 'function' | 'interface' | 'class' | 'type' | 'const'
  file: string
  line: number
}

export interface IntelligenceState {
  isOpen: boolean
  memories: MemoryItem[]
  symbols: SymbolIndexItem[]
  activeTab: 'memory' | 'symbols'
}

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'Architecture Decision',
    content: 'Always use ZAP Zero-Allocation Binary Protocol for high-throughput microservices instead of legacy gRPC.',
    updatedAt: '12m ago',
    confidence: 0.99,
  },
  {
    id: 'mem-2',
    category: 'Project Rule',
    content: '100% @hanzo/ui on @hanzo/gui. Strict ban on shadcn, radix, or tailwindcss dependencies.',
    updatedAt: '1h ago',
    confidence: 1.0,
  },
  {
    id: 'mem-3',
    category: 'Enclave KMS Key',
    content: 'Hardware envelope encryption AES-256-GCM backed by Hanzo Cloud gVisor KMS enclaves.',
    updatedAt: '2h ago',
    confidence: 0.98,
  },
]

const DEFAULT_SYMBOLS: SymbolIndexItem[] = [
  { name: 'swarmStore', kind: 'const', file: 'src/agents/store.ts', line: 26 },
  { name: 'terminalStore', kind: 'const', file: 'src/terminal/store.ts', line: 55 },
  { name: 'artifactStore', kind: 'const', file: 'src/artifact/store.ts', line: 42 },
  { name: 'mcpStore', kind: 'const', file: 'src/mcp/store.ts', line: 25 },
  { name: 'channelsStore', kind: 'const', file: 'src/channels/store.ts', line: 36 },
  { name: 'useSession', kind: 'function', file: 'src/data/session.tsx', line: 65 },
]

let state: IntelligenceState = {
  isOpen: false,
  memories: DEFAULT_MEMORIES,
  symbols: DEFAULT_SYMBOLS,
  activeTab: 'memory',
}

const listeners = new Set<(s: IntelligenceState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const intelligenceStore = {
  get: (): IntelligenceState => state,

  open: (tab: 'memory' | 'symbols' = 'memory') => {
    state = { ...state, isOpen: true, activeTab: tab }
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

  setTab: (activeTab: 'memory' | 'symbols') => {
    state = { ...state, activeTab }
    notify()
  },

  addMemory: (category: MemoryItem['category'], content: string) => {
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      category,
      content,
      updatedAt: 'Just now',
      confidence: 1.0,
    }
    state = {
      ...state,
      memories: [newMem, ...state.memories],
    }
    notify()
  },

  deleteMemory: (id: string) => {
    state = {
      ...state,
      memories: state.memories.filter((m) => m.id !== id),
    }
    notify()
  },
}

export const useIntelligence = (): IntelligenceState => {
  const [current, setCurrent] = useState<IntelligenceState>(state)

  useEffect(() => {
    const handler = (next: IntelligenceState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
