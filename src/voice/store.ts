/**
 * Store for Live Duplex Voice Call Mode with Agent Swarms.
 */
import { useEffect, useState } from 'react'

export interface VoiceCallState {
  isOpen: boolean
  isMuted: boolean
  isSpeakerMuted: boolean
  status: 'connecting' | 'listening' | 'speaking' | 'idle'
  activeAgent: string
  transcript: string
  durationSeconds: number
}

const DEFAULT_STATE: VoiceCallState = {
  isOpen: false,
  isMuted: false,
  isSpeakerMuted: false,
  status: 'listening',
  activeAgent: '@dev',
  transcript: 'Listening for instructions… Speak naturally.',
  durationSeconds: 0,
}

let state: VoiceCallState = DEFAULT_STATE
const listeners = new Set<(s: VoiceCallState) => void>()

let timerInterval: NodeJS.Timeout | null = null

const notify = () => listeners.forEach((fn) => fn(state))

export const liveVoiceStore = {
  get: (): VoiceCallState => state,

  open: (agent = '@dev') => {
    state = {
      ...state,
      isOpen: true,
      activeAgent: agent,
      status: 'listening',
      durationSeconds: 0,
      transcript: `Connected to ${agent}. Speak naturally to collaborate.`,
    }
    notify()

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      state = { ...state, durationSeconds: state.durationSeconds + 1 }
      notify()
    }, 1000)
  },

  close: () => {
    if (timerInterval) clearInterval(timerInterval)
    state = { ...state, isOpen: false }
    notify()
  },

  toggleMute: () => {
    state = { ...state, isMuted: !state.isMuted }
    notify()
  },

  toggleSpeaker: () => {
    state = { ...state, isSpeakerMuted: !state.isSpeakerMuted }
    notify()
  },

  setStatus: (status: VoiceCallState['status'], transcript?: string) => {
    state = {
      ...state,
      status,
      transcript: transcript || state.transcript,
    }
    notify()
  },
}

export const useLiveVoice = (): VoiceCallState => {
  const [current, setCurrent] = useState<VoiceCallState>(state)

  useEffect(() => {
    const handler = (next: VoiceCallState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
