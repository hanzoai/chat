/**
 * Multiplayer room collaboration types.
 */
export type MemberRole = 'admin' | 'editor' | 'viewer'
export type PresenceStatus = 'online' | 'typing' | 'idle'

export interface Participant {
  id: string
  name: string
  email: string
  avatar?: string
  role: MemberRole
  status: PresenceStatus
  color: string
}

export interface RoomInvite {
  code: string
  url: string
  expiresAt: string
}
