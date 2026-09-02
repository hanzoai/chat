/**
 * Multiplayer presence and collaboration state store.
 */
import { useEffect, useState } from 'react'
import type { Participant } from './types'

export interface MultiplayerState {
  isInviteOpen: boolean
  participants: Participant[]
}

const DEFAULT_PARTICIPANTS: Participant[] = [
  {
    id: 'user_self',
    name: 'You (Owner)',
    email: 'z@hanzo.ai',
    role: 'admin',
    status: 'online',
    color: '#34d399',
  },
]

let state: MultiplayerState = {
  isInviteOpen: false,
  participants: DEFAULT_PARTICIPANTS,
}

const listeners = new Set<(s: MultiplayerState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(state))
}

export const multiplayerStore = {
  get: (): MultiplayerState => state,

  openInvite: () => {
    state = { ...state, isInviteOpen: true }
    notify()
  },

  closeInvite: () => {
    state = { ...state, isInviteOpen: false }
    notify()
  },

  inviteMember: (email: string, role: 'editor' | 'viewer') => {
    const name = email.split('@')[0]
    const newParticipant: Participant = {
      id: `p_${Date.now()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      role,
      status: 'online',
      color: '#60a5fa',
    }
    state = {
      ...state,
      participants: [...state.participants, newParticipant],
    }
    notify()
  },

  removeMember: (id: string) => {
    state = {
      ...state,
      participants: state.participants.filter((p) => p.id !== id),
    }
    notify()
  },
}

export const useMultiplayer = (): MultiplayerState => {
  const [current, setCurrent] = useState<MultiplayerState>(state)

  useEffect(() => {
    const handler = (next: MultiplayerState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
