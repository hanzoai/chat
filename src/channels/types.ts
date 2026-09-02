/**
 * Unified Room Types: Channels, DMs, and Informal Groups with Global Following.
 */
export type RoomType = 'channel' | 'dm' | 'group'

export type ChannelCategory = 'official' | 'community' | 'dev' | 'infra' | 'design' | 'general' | 'hangout'
export type ChannelScope = 'global' | 'org'

export interface ChatRoom {
  id: string
  type: RoomType
  name?: string
  topic?: string
  members: string[] // User IDs and Agent IDs
  isPrivate?: boolean
  unreadCount?: number
  lastMessage?: string
  lastActivity?: string
  avatar?: string
  isFollowing?: boolean
  category?: ChannelCategory
  scope?: ChannelScope
  orgId?: string
  orgName?: string
  creator?: string
  memberCount?: number
  notes?: string
  liveCallActive?: boolean
  liveCallParticipants?: string[]
}
