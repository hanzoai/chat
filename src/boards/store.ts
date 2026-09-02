/**
 * Board & Sprint Issue Planning Store with Local Persistence & Full CRUD.
 */
import { useEffect, useState } from 'react'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface BoardCard {
  id: string
  title: string
  description: string
  column: 'backlog' | 'in_progress' | 'review' | 'done'
  assignedAgent: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  branch?: string
  tags?: string[]
  checklists?: ChecklistItem[]
  createdAt?: number
  updatedAt?: number
}

export interface BoardState {
  isOpen: boolean
  cards: BoardCard[]
  filterSearch: string
  filterAgent: string
  filterPriority: string
  selectedCardId: string | null
}

const STORAGE_KEY = 'hanzo:chat2:board:state:v2'

const DEFAULT_CARDS: BoardCard[] = [
  {
    id: 'card-1',
    title: 'Synthesize Zero-Allocation ZAP Protocol Streaming Service',
    description: 'Implement high-throughput binary protocol handlers over NATS and WebSockets with zero heap allocations in inner loops.',
    column: 'done',
    assignedAgent: '@dev',
    priority: 'P0',
    branch: 'feat/zap-protocol',
    tags: ['performance', 'networking', 'wasm'],
    checklists: [
      { id: 'c1-1', text: 'Define binary wire protocol schema', done: true },
      { id: 'c1-2', text: 'Implement zero-copy memory ring buffer', done: true },
      { id: 'c1-3', text: 'Benchmark 100k msgs/sec throughput', done: true },
    ],
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'card-2',
    title: 'KMS Enclave AES-256-GCM Envelope Encryption Audit',
    description: 'Verify zero-trust hardware key wrapping, gVisor container sandbox boundary, and ephemeral session secret rotation.',
    column: 'review',
    assignedAgent: '@secops',
    priority: 'P0',
    branch: 'security/kms-audit',
    tags: ['security', 'kms', 'fips-140-3'],
    checklists: [
      { id: 'c2-1', text: 'Verify hardware enclave attestation', done: true },
      { id: 'c2-2', text: 'Audit key derivation function (HKDF-SHA256)', done: true },
      { id: 'c2-3', text: 'Automated fuzz testing of secret payloads', done: false },
    ],
    createdAt: Date.now() - 3600000 * 18,
    updatedAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'card-3',
    title: 'Scaffold Autonomous Luxury Commerce Next.js 16 Storefront',
    description: 'Production storefront with sub-second hybrid vector search, pgvector index, and decentralized checkout gateways.',
    column: 'in_progress',
    assignedAgent: '@planner',
    priority: 'P1',
    branch: 'feat/luxury-store',
    tags: ['frontend', 'nextjs', 'ecommerce'],
    checklists: [
      { id: 'c3-1', text: 'Prerender dynamic catalog routes with SSG', done: true },
      { id: 'c3-2', text: 'Integrate hybrid vector search ranking', done: false },
      { id: 'c3-3', text: 'Connect Stripe & crypto payment rails', done: false },
    ],
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'card-4',
    title: 'Setup Local k3s Multi-Container MicroVM Sandboxes',
    description: 'Configure CoreDNS, Traefik v3, and isolated worker pod namespaces for sovereign agentic code execution.',
    column: 'backlog',
    assignedAgent: '@executor',
    priority: 'P2',
    branch: 'infra/k3s-sandbox',
    tags: ['infra', 'kubernetes', 'sandboxing'],
    checklists: [
      { id: 'c4-1', text: 'Spin up local k3s server cluster', done: true },
      { id: 'c4-2', text: 'Configure network policy isolates', done: false },
      { id: 'c4-3', text: 'Expose local dashboard via Traefik ingress', done: false },
    ],
    createdAt: Date.now() - 3600000 * 6,
    updatedAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'card-5',
    title: 'Automated Swarm Agent Code Reviewer & Static Analysis Gate',
    description: 'Run automated Playwright E2E suites and AST security scanning before submitting pull requests.',
    column: 'backlog',
    assignedAgent: '@algo',
    priority: 'P2',
    tags: ['ai', 'swarm', 'ci-cd'],
    checklists: [
      { id: 'c5-1', text: 'Hook into Git pre-push lifecycle', done: false },
      { id: 'c5-2', text: 'Evaluate Playwright gate metrics', done: false },
    ],
    createdAt: Date.now() - 3600000 * 3,
    updatedAt: Date.now() - 3600000 * 3,
  },
]

function loadSavedCards(): BoardCard[] {
  if (typeof window === 'undefined') return DEFAULT_CARDS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CARDS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return DEFAULT_CARDS
  } catch {
    return DEFAULT_CARDS
  }
}

function persistCards(cards: BoardCard[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch {}
}

let state: BoardState = {
  isOpen: false,
  cards: loadSavedCards(),
  filterSearch: '',
  filterAgent: 'all',
  filterPriority: 'all',
  selectedCardId: null,
}

const listeners = new Set<(s: BoardState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const boardStore = {
  get: (): BoardState => state,

  open: (cardId?: string) => {
    state = { ...state, isOpen: true, selectedCardId: cardId ?? state.selectedCardId }
    notify()
  },

  close: () => {
    state = { ...state, isOpen: false, selectedCardId: null }
    notify()
  },

  toggle: () => {
    state = { ...state, isOpen: !state.isOpen }
    notify()
  },

  selectCard: (id: string | null) => {
    state = { ...state, selectedCardId: id }
    notify()
  },

  setFilterSearch: (search: string) => {
    state = { ...state, filterSearch: search }
    notify()
  },

  setFilterAgent: (agent: string) => {
    state = { ...state, filterAgent: agent }
    notify()
  },

  setFilterPriority: (priority: string) => {
    state = { ...state, filterPriority: priority }
    notify()
  },

  moveCard: (id: string, column: BoardCard['column']) => {
    const cards = state.cards.map((c) =>
      c.id === id ? { ...c, column, updatedAt: Date.now() } : c,
    )
    state = { ...state, cards }
    persistCards(cards)
    notify()
  },

  addCard: (cardData: {
    title: string
    description?: string
    column?: BoardCard['column']
    assignedAgent: string
    priority: BoardCard['priority']
    branch?: string
    tags?: string[]
  }) => {
    const newCard: BoardCard = {
      id: `card-${Date.now()}`,
      title: cardData.title,
      description: cardData.description || 'Agentic task generated from sprint planning.',
      column: cardData.column || 'backlog',
      assignedAgent: cardData.assignedAgent,
      priority: cardData.priority,
      branch: cardData.branch,
      tags: cardData.tags || [],
      checklists: [
        { id: `chk-${Date.now()}-1`, text: 'Initial planning & implementation', done: false },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const cards = [newCard, ...state.cards]
    state = { ...state, cards }
    persistCards(cards)
    notify()
    return newCard
  },

  updateCard: (id: string, updates: Partial<BoardCard>) => {
    const cards = state.cards.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
    )
    state = { ...state, cards }
    persistCards(cards)
    notify()
  },

  deleteCard: (id: string) => {
    const cards = state.cards.filter((c) => c.id !== id)
    state = {
      ...state,
      cards,
      selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
    }
    persistCards(cards)
    notify()
  },

  toggleChecklist: (cardId: string, checklistId: string) => {
    const cards = state.cards.map((c) => {
      if (c.id !== cardId || !c.checklists) return c
      return {
        ...c,
        checklists: c.checklists.map((chk) =>
          chk.id === checklistId ? { ...chk, done: !chk.done } : chk,
        ),
        updatedAt: Date.now(),
      }
    })
    state = { ...state, cards }
    persistCards(cards)
    notify()
  },

  addChecklist: (cardId: string, text: string) => {
    if (!text.trim()) return
    const cards = state.cards.map((c) => {
      if (c.id !== cardId) return c
      const newItem: ChecklistItem = {
        id: `chk-${Date.now()}`,
        text: text.trim(),
        done: false,
      }
      return {
        ...c,
        checklists: [...(c.checklists || []), newItem],
        updatedAt: Date.now(),
      }
    })
    state = { ...state, cards }
    persistCards(cards)
    notify()
  },

  removeChecklist: (cardId: string, checklistId: string) => {
    const cards = state.cards.map((c) => {
      if (c.id !== cardId || !c.checklists) return c
      return {
        ...c,
        checklists: c.checklists.filter((chk) => chk.id !== checklistId),
        updatedAt: Date.now(),
      }
    })
    state = { ...state, cards }
    persistCards(cards)
    notify()
  },

  resetToDefaults: () => {
    state = { ...state, cards: DEFAULT_CARDS }
    persistCards(DEFAULT_CARDS)
    notify()
  },
}

export const useBoard = (): BoardState => {
  const [current, setCurrent] = useState<BoardState>(state)

  useEffect(() => {
    const handler = (next: BoardState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}

