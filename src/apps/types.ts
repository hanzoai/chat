/**
 * Integrated Hanzo Workspace Suite:
 * - tasks.hanzo.ai (Durable workflows & DAGs)
 * - todo.hanzo.ai & notes.hanzo.ai (Real-time collaborative markdown & todos)
 * - meet.hanzo.ai (Multiplayer WebRTC live meeting & AI transcriber)
 * - zt.hanzo.ai (Zero-Trust Cloudflare local machine tunnel sharing)
 */

export type WorkspaceAppId = 'tasks' | 'todo' | 'notes' | 'meet' | 'tabs' | 'tunnel'

export interface NoteDocument {
  id: string
  title: string
  content: string
  updatedAt: string
  collaborators: string[]
  tags: string[]
}

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  assignedAgent?: string
  priority: 'P0' | 'P1' | 'P2'
  dueDate?: string
}

export interface MeetingSession {
  id: string
  roomName: string
  activeParticipants: {
    id: string
    name: string
    avatar?: string
    isMuted: boolean
    isCameraOn: boolean
    isAgent?: boolean
  }[]
  isLive: boolean
  transcript: {
    speaker: string
    text: string
    timestamp: string
  }[]
  aiSummary?: string
}

export interface ZeroTrustTunnel {
  status: 'offline' | 'connecting' | 'active'
  tunnelUrl?: string
  localPort: number
  connectedClients: number
  enclaveKey: string
}
