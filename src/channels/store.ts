/**
 * Unified Room Store for Global Channels, Org Channels, DMs, Collaborative Notes, and Live Calls.
 */
import { useEffect, useState } from 'react'
import type { Message } from '~/data/types'
import * as store from '~/data/store'
import type { ChannelCategory, ChannelScope, ChatRoom, RoomType } from './types'

export type { ChannelCategory, ChannelScope, ChatRoom, RoomType }

export const GLOBAL_DISCOVERABLE_CHANNELS: ChatRoom[] = [
  {
    id: 'chan-hanzo-general',
    type: 'channel',
    name: 'hanzo-general',
    topic: 'Official Hanzo announcements, platform updates, and keynotes',
    members: ['user_self', 'agent_planner', 'agent_dev', 'agent_secops'],
    unreadCount: 0,
    lastActivity: '3m ago',
    isFollowing: true,
    category: 'official',
    scope: 'global',
    creator: 'Hanzo Core',
    memberCount: 1420,
    notes: `# Hanzo General Notes\n\n- Welcome to Hanzo Public Network.\n- **Roadmap**: Next.js 16, React 19, ZAP Binary Protocol, and @hanzo/ui shared substrate.\n- Hardware KMS enclaves active for tamper-proof attestation.`,
  },
  {
    id: 'chan-hanzo-live-hangout',
    type: 'channel',
    name: 'hanzo-live-hangout',
    topic: '🎙️ Live Voice & Screen Share - 24/7 Social Hangout & Pair Programming with AI Agents',
    members: ['user_self', 'agent_dev', 'agent_planner', 'agent_researcher'],
    unreadCount: 0,
    lastActivity: 'Live now',
    isFollowing: true,
    category: 'hangout',
    scope: 'global',
    creator: 'Hanzo Community',
    memberCount: 2310,
    liveCallActive: true,
    liveCallParticipants: ['user_self', 'agent_dev', 'agent_planner'],
    notes: `# Live Hangout & Note Taker\n\n*Live bidirectional call in progress.*\n\n### Discussion Topics\n- Real-time AI agent speech synthesis with ZAP.\n- Screen sharing code reviews and sandbox verification.\n- Multi-agent collaboration protocols.\n\n### Real-Time Note Taker\n- **12:20 PM**: Explored @hanzo/ui cross-platform component extraction.\n- **12:24 PM**: Connected bidirectional voice pipeline to @dev SWE Agent.`,
  },
  {
    id: 'chan-hanzo-product-talk',
    type: 'channel',
    name: 'hanzo-product-talk',
    topic: 'Product strategy, design feedback, and feature jam sessions with Hanzo agents',
    members: ['user_self', 'agent_planner', 'agent_dev'],
    unreadCount: 0,
    lastActivity: '5m ago',
    isFollowing: true,
    category: 'design',
    scope: 'global',
    creator: 'Hanzo Design',
    memberCount: 890,
    notes: `# Product Jam & RFCs\n\n- **RFC-042**: Liquid glass aesthetic and responsive multi-pane layout.\n- Unified channel explorer on far-right dock.\n- Global public community channels for all users.`,
  },
  {
    id: 'chan-hanzo-community',
    type: 'channel',
    name: 'hanzo-community',
    topic: 'Watercooler discussion, showcases, music playlists, and open community banter',
    members: ['user_self', 'agent_dev'],
    unreadCount: 0,
    lastActivity: '8m ago',
    isFollowing: true,
    category: 'community',
    scope: 'global',
    creator: 'Hanzo Community',
    memberCount: 980,
    notes: `# Community Lounge\n\n- Share what you are building with Hanzo!\n- Drop links to your microservices and luxury commerce apps.`,
  },
  {
    id: 'chan-hanzo-dev',
    type: 'channel',
    name: 'hanzo-dev',
    topic: 'Full-stack Next.js 16, React 19, and ZAP zero-allocation binary microservices',
    members: ['user_self', 'agent_planner', 'agent_dev'],
    unreadCount: 1,
    lastActivity: 'Just now',
    isFollowing: true,
    category: 'dev',
    scope: 'global',
    creator: '@dev',
    memberCount: 840,
    notes: `# Dev Swarm Architecture\n\n- Zero-allocation memory serialization.\n- MicroVM sandboxes with eBPF network hooks.\n- AST embeddings and vector search in pgvector.`,
  },
  {
    id: 'chan-hanzo-design',
    type: 'channel',
    name: 'hanzo-design',
    topic: '@hanzo/ui design system, liquid glass styling, and UI animations',
    members: ['user_self', 'agent_planner'],
    unreadCount: 0,
    lastActivity: '12m ago',
    isFollowing: false,
    category: 'design',
    scope: 'global',
    creator: '@designer',
    memberCount: 520,
    notes: `# Design System RFC\n\n- Tokens for Glassmorphism, neon glows, and dark high-contrast typography.`,
  },
  {
    id: 'chan-hanzo-infra',
    type: 'channel',
    name: 'hanzo-infra',
    topic: 'Local k3s cluster, MicroVM enclaves, eBPF tracing, and hardware KMS',
    members: ['user_self', 'agent_executor', 'agent_secops'],
    unreadCount: 0,
    lastActivity: '25m ago',
    isFollowing: false,
    category: 'infra',
    scope: 'global',
    creator: '@secops',
    memberCount: 410,
    notes: `# Cloud Infrastructure\n\n- k3s cluster orchestration\n- Hardware KMS attestation keys`,
  },

  // Per-Org Private Channels (Acme Corp)
  {
    id: 'chan-general',
    type: 'channel',
    name: 'general',
    topic: 'Acme Corp company-wide updates and internal AI co-piloting',
    members: ['user_self', 'agent_dev', 'agent_planner', 'agent_secops'],
    unreadCount: 0,
    lastActivity: '1m ago',
    isFollowing: true,
    category: 'general',
    scope: 'org',
    orgId: 'org-acme',
    orgName: 'Acme Corp',
    creator: 'Acme Corp',
    memberCount: 65,
    notes: `# Acme Corp Workspace Notes\n\n- Internal team sprint priorities.\n- Deployment target: Local k3s staging & Hanzo Cloud production.`,
  },
  {
    id: 'chan-dev-swarm',
    type: 'channel',
    name: 'dev-swarm',
    topic: 'Active engineering swarm coordination and sandbox testing',
    members: ['user_self', 'agent_planner', 'agent_dev', 'agent_secops'],
    unreadCount: 2,
    lastActivity: 'Just now',
    isFollowing: true,
    category: 'dev',
    scope: 'org',
    orgId: 'org-acme',
    orgName: 'Acme Corp',
    creator: '@planner',
    memberCount: 24,
    notes: `# Engineering Swarm Sprints\n\n- Sprint 14: Agentic coding canvas & live preview.\n- Automated test coverage > 95%.`,
  },
  {
    id: 'chan-cloud-ops',
    type: 'channel',
    name: 'cloud-ops',
    topic: 'Local k3s cluster, MicroVM enclaves, and CI/CD pipelines',
    members: ['user_self', 'agent_executor', 'agent_secops'],
    unreadCount: 0,
    lastActivity: '15m ago',
    isFollowing: true,
    category: 'infra',
    scope: 'org',
    orgId: 'org-acme',
    orgName: 'Acme Corp',
    creator: '@executor',
    memberCount: 18,
    notes: `# Cloud Operations Checklist\n\n- Enclave health: Healthy\n- Latency p99: 14ms`,
  },
]

const DEFAULT_ROOMS: ChatRoom[] = [
  ...GLOBAL_DISCOVERABLE_CHANNELS.filter((c) => c.isFollowing),

  // Direct Messages (Default Specialized Agents)
  {
    id: 'dm-dev-agent',
    type: 'dm',
    name: '@dev (SWE Agent)',
    members: ['user_self', 'agent_dev'],
    unreadCount: 1,
    lastMessage: 'Ready to synthesize Next.js 16 and ZAP microservices.',
    lastActivity: '2m ago',
    avatar: 'https://cdn.hanzo.ai/avatars/dev.png',
  },
  {
    id: 'dm-planner',
    type: 'dm',
    name: '@planner (Architect)',
    members: ['user_self', 'agent_planner'],
    unreadCount: 0,
    lastMessage: 'Architecture DAG phases validated.',
    lastActivity: '20m ago',
    avatar: 'https://cdn.hanzo.ai/avatars/planner.png',
  },
  {
    id: 'dm-secops',
    type: 'dm',
    name: '@secops (Security & KMS)',
    members: ['user_self', 'agent_secops'],
    unreadCount: 0,
    lastMessage: 'Hardware enclave key rotation policy active.',
    lastActivity: '30m ago',
    avatar: 'https://cdn.hanzo.ai/avatars/secops.png',
  },
  {
    id: 'dm-researcher',
    type: 'dm',
    name: '@researcher (Deep Research)',
    members: ['user_self', 'agent_researcher'],
    unreadCount: 0,
    lastMessage: 'AST code embeddings indexed into pgvector.',
    lastActivity: '45m ago',
    avatar: 'https://cdn.hanzo.ai/avatars/researcher.png',
  },

  // Informal Swarm Group
  {
    id: 'group-swarm',
    type: 'group',
    members: ['user_self', 'agent_planner', 'agent_dev', 'agent_secops'],
    unreadCount: 0,
    lastMessage: 'Multi-agent swarm coordination active.',
    lastActivity: '10m ago',
  },
]

const INITIAL_ROOM_MESSAGES: Record<string, Message[]> = {
  'chan-hanzo-general': [
    {
      messageId: 'msg-hgen-1',
      conversationId: 'chan-hanzo-general',
      parentMessageId: null,
      role: 'assistant',
      text: 'Welcome to **#hanzo-general**! This channel broadcasts official announcements, release highlights, and core updates across the Hanzo ecosystem.',
    },
  ],
  'chan-hanzo-live-hangout': [
    {
      messageId: 'msg-hhang-1',
      conversationId: 'chan-hanzo-live-hangout',
      parentMessageId: null,
      role: 'assistant',
      text: '🎙️ **Live Hangout & Social Room**: Welcome! Jump into the ongoing live voice & screen share call to pair program, socialize, ask questions, or review architecture with **@dev** and **@planner**.',
    },
  ],
  'chan-hanzo-product-talk': [
    {
      messageId: 'msg-hprod-1',
      conversationId: 'chan-hanzo-product-talk',
      parentMessageId: null,
      role: 'assistant',
      text: 'Welcome to **#hanzo-product-talk**! Discuss user experience, UI components in `@hanzo/ui`, and future roadmap items with our design & product team.',
    },
  ],
  'chan-hanzo-community': [
    {
      messageId: 'msg-hrand-1',
      conversationId: 'chan-hanzo-community',
      parentMessageId: null,
      role: 'assistant',
      text: 'Welcome to **#hanzo-community**! Share project showcases, cool design ideas, music playlists, and informal thoughts here.',
    },
  ],
  'chan-hanzo-dev': [
    {
      messageId: 'msg-hdev-1',
      conversationId: 'chan-hanzo-dev',
      parentMessageId: null,
      role: 'assistant',
      text: 'Welcome to **#hanzo-dev**! Engineering discussions around Next.js 16, React 19, zero-allocation ZAP protocols, and distributed AI agents.',
    },
  ],
  'chan-general': [
    {
      messageId: 'msg-gen-1',
      conversationId: 'chan-general',
      parentMessageId: null,
      role: 'assistant',
      text: 'Welcome to the **#general** organization channel. Discuss company updates, sprint roadmaps, and cross-team initiatives with Hanzo Swarm agents.',
    },
  ],
  'chan-dev-swarm': [
    {
      messageId: 'msg-dev-1',
      conversationId: 'chan-dev-swarm',
      parentMessageId: null,
      role: 'assistant',
      text: 'Engineering Swarm workspace initialized. Ready for code generation, pull request reviews, and k3s sandbox validations.',
    },
  ],
  'chan-cloud-ops': [
    {
      messageId: 'msg-cloud-1',
      conversationId: 'chan-cloud-ops',
      parentMessageId: null,
      role: 'assistant',
      text: 'Cloud & Sandbox operations channel active. Local k3s nodes and gVisor isolation enclaves ready.',
    },
  ],
  'dm-dev-agent': [
    {
      messageId: 'msg-dev-dm-1',
      conversationId: 'dm-dev-agent',
      parentMessageId: null,
      role: 'assistant',
      text: "Hello! I'm **@dev**, your dedicated SWE agent. What code or microservice should we build today?",
    },
  ],
  'dm-planner': [
    {
      messageId: 'msg-planner-1',
      conversationId: 'dm-planner',
      parentMessageId: null,
      role: 'assistant',
      text: "Architect online. I can help decompose your system architecture into execution DAGs, database schemas, and microservice topologies.",
    },
  ],
  'dm-secops': [
    {
      messageId: 'msg-secops-1',
      conversationId: 'dm-secops',
      parentMessageId: null,
      role: 'assistant',
      text: "SecOps guardrails active. I audit cryptographic hardware enclaves, KMS envelope encryption keys, and gVisor isolation barriers.",
    },
  ],
  'dm-researcher': [
    {
      messageId: 'msg-researcher-1',
      conversationId: 'dm-researcher',
      parentMessageId: null,
      role: 'assistant',
      text: "Deep Research agent online. I scrape live technical documentation, index AST symbols into PostgreSQL pgvector, and extract verified citations.",
    },
  ],
  'group-swarm': [
    {
      messageId: 'msg-group-1',
      conversationId: 'group-swarm',
      parentMessageId: null,
      role: 'assistant',
      text: "Multi-agent swarm coordination room active. Participating agents: **@planner**, **@dev**, and **@secops**.",
    },
  ],
}

const STORAGE_KEY = 'hanzo_chat2_rooms_v4'

const loadPersisted = (): Partial<ChannelsState> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        rooms: parsed.rooms?.length ? parsed.rooms : DEFAULT_ROOMS,
        activeRoomId: parsed.activeRoomId || 'chan-hanzo-live-hangout',
        messagesByRoom: parsed.messagesByRoom || INITIAL_ROOM_MESSAGES,
        discoverableChannels: parsed.discoverableChannels || GLOBAL_DISCOVERABLE_CHANNELS,
        activeScope: parsed.activeScope || 'all',
      }
    }
  } catch {}
  return {}
}

const saved = loadPersisted()

export interface ChannelsState {
  rooms: ChatRoom[]
  discoverableChannels: ChatRoom[]
  activeRoomId: string | null
  activeScope: 'all' | 'global' | 'org'
  isCreateOpen: boolean
  isBrowseOpen: boolean
  isNotesOpen: boolean
  isMembersOpen: boolean
  createType: RoomType
  messagesByRoom: Record<string, Message[]>
}

let state: ChannelsState = {
  rooms: saved.rooms || DEFAULT_ROOMS,
  discoverableChannels: saved.discoverableChannels || GLOBAL_DISCOVERABLE_CHANNELS,
  activeRoomId: saved.activeRoomId || 'chan-hanzo-live-hangout',
  activeScope: saved.activeScope || 'all',
  isCreateOpen: false,
  isBrowseOpen: false,
  isNotesOpen: false,
  isMembersOpen: false,
  createType: 'channel',
  messagesByRoom: saved.messagesByRoom || INITIAL_ROOM_MESSAGES,
}

const listeners = new Set<(s: ChannelsState) => void>()

const persist = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rooms: state.rooms,
        discoverableChannels: state.discoverableChannels,
        activeRoomId: state.activeRoomId,
        messagesByRoom: state.messagesByRoom,
        activeScope: state.activeScope,
      }),
    )
  } catch {}
}

const notify = () => {
  persist()
  listeners.forEach((fn) => fn(state))
}

export const channelsStore = {
  get: (): ChannelsState => state,

  getActiveRoom: (): ChatRoom | undefined => {
    return state.rooms.find((r) => r.id === state.activeRoomId)
  },

  setActiveRoom: (id: string | null) => {
    state = {
      ...state,
      activeRoomId: id,
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, unreadCount: 0 } : r)),
    }
    notify()

    if (id && state.messagesByRoom[id]) {
      const room = state.rooms.find((r) => r.id === id)
      store.reset(
        room ? { conversationId: room.id, title: room.name || 'Chat Room' } : null,
        state.messagesByRoom[id],
      )
    } else if (id === null) {
      store.reset(null, [])
    }
  },

  setActiveScope: (scope: 'all' | 'global' | 'org') => {
    state = { ...state, activeScope: scope }
    notify()
  },

  updateNotes: (roomId: string, notes: string) => {
    state = {
      ...state,
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, notes } : r)),
      discoverableChannels: state.discoverableChannels.map((r) => (r.id === roomId ? { ...r, notes } : r)),
    }
    notify()
  },

  addNoteBullet: (roomId: string, bullet: string) => {
    const room = state.rooms.find((r) => r.id === roomId)
    if (!room) return
    const currentNotes = room.notes || `# ${room.name} Notes\n\n`
    const updated = `${currentNotes}\n- ${bullet}`
    channelsStore.updateNotes(roomId, updated)
  },

  toggleLiveCall: (roomId: string) => {
    state = {
      ...state,
      rooms: state.rooms.map((r) => {
        if (r.id !== roomId) return r
        const active = !r.liveCallActive
        return {
          ...r,
          liveCallActive: active,
          liveCallParticipants: active ? ['user_self', 'agent_dev', 'agent_planner'] : [],
        }
      }),
    }
    notify()
  },

  addMessageToRoom: (roomId: string, message: Message) => {
    const existing = state.messagesByRoom[roomId] || []
    const updated = [...existing, message]
    state = {
      ...state,
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: updated,
      },
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              lastActivity: 'Just now',
              lastMessage: message.text.slice(0, 60),
            }
          : r,
      ),
    }
    notify()
  },

  toggleFollowChannel: (channelId: string) => {
    const isCurrentlyFollowing = state.rooms.some((r) => r.id === channelId)

    if (isCurrentlyFollowing) {
      state = {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== channelId),
        discoverableChannels: state.discoverableChannels.map((c) =>
          c.id === channelId ? { ...c, isFollowing: false } : c,
        ),
      }
      if (state.activeRoomId === channelId) {
        state.activeRoomId = state.rooms[0]?.id || null
      }
    } else {
      const target = state.discoverableChannels.find((c) => c.id === channelId)
      if (target) {
        const followed = { ...target, isFollowing: true }
        state = {
          ...state,
          rooms: [...state.rooms, followed],
          discoverableChannels: state.discoverableChannels.map((c) =>
            c.id === channelId ? { ...c, isFollowing: true } : c,
          ),
          activeRoomId: channelId,
        }
      }
    }
    notify()
  },

  openCreate: (type: RoomType = 'channel') => {
    state = { ...state, isCreateOpen: true, createType: type }
    notify()
  },

  closeCreate: () => {
    state = { ...state, isCreateOpen: false }
    notify()
  },

  openBrowse: () => {
    state = { ...state, isBrowseOpen: true }
    notify()
  },

  closeBrowse: () => {
    state = { ...state, isBrowseOpen: false }
    notify()
  },

  toggleNotes: () => {
    state = { ...state, isNotesOpen: !state.isNotesOpen }
    notify()
  },

  toggleMembers: () => {
    state = { ...state, isMembersOpen: !state.isMembersOpen }
    notify()
  },

  createRoom: (type: RoomType, members: string[], name?: string, topic?: string, scope: ChannelScope = 'org') => {
    const id = `${type === 'channel' ? 'chan' : type === 'dm' ? 'dm' : 'group'}-${Date.now()}`
    const newRoom: ChatRoom = {
      id,
      type,
      name: name || (type === 'dm' ? members.join(', ') : 'untitled'),
      topic,
      members,
      unreadCount: 0,
      lastActivity: 'Just now',
      isFollowing: true,
      scope,
      creator: 'You',
      memberCount: members.length,
      notes: `# ${name || 'Channel'} Notes\n\nInitial collaborative notes created by @user.`,
    }

    state = {
      ...state,
      rooms: [newRoom, ...state.rooms],
      activeRoomId: id,
      isCreateOpen: false,
      messagesByRoom: {
        ...state.messagesByRoom,
        [id]: [
          {
            messageId: `msg-${Date.now()}`,
            conversationId: id,
            parentMessageId: null,
            role: 'assistant',
            text: `Room created! What would you like to build or discuss?`,
          },
        ],
      },
    }
    notify()
    channelsStore.setActiveRoom(id)
    return newRoom
  },
}

export const useChannels = (): ChannelsState => {
  const [current, setCurrent] = useState<ChannelsState>(state)

  useEffect(() => {
    const handler = (next: ChannelsState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
