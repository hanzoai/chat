/**
 * Theme & Glassmorphism Customizer Store.
 */
import { useEffect, useState } from 'react'

export type AccentColor = 'emerald' | 'blue' | 'gold' | 'purple' | 'rose'

export interface AccentDefinition {
  id: AccentColor
  label: string
  primary: string
  glow: string
  bg: string
}

export const ACCENT_PALETTE: AccentDefinition[] = [
  { id: 'emerald', label: 'Hanzo Emerald', primary: '#34d399', glow: 'rgba(52, 211, 153, 0.4)', bg: 'rgba(52, 211, 153, 0.15)' },
  { id: 'blue', label: 'Cyber Blue', primary: '#60a5fa', glow: 'rgba(96, 165, 250, 0.4)', bg: 'rgba(96, 165, 250, 0.15)' },
  { id: 'gold', label: 'Luxury Gold', primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(251, 191, 36, 0.15)' },
  { id: 'purple', label: 'Neon Violet', primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', bg: 'rgba(168, 85, 247, 0.15)' },
  { id: 'rose', label: 'Crimson Rose', primary: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', bg: 'rgba(244, 63, 94, 0.15)' },
]

export interface ThemeState {
  isOpen: boolean
  accent: AccentColor
  blurPx: number
  glassOpacity: number
}

const STORAGE_KEY = 'hanzo_chat2_theme_v1'

const loadPersistedTheme = (): Partial<ThemeState> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

const saved = loadPersistedTheme()

let state: ThemeState = {
  isOpen: false,
  accent: saved.accent || 'emerald',
  blurPx: saved.blurPx ?? 24,
  glassOpacity: saved.glassOpacity ?? 85,
}

const listeners = new Set<(s: ThemeState) => void>()

const persist = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accent: state.accent,
        blurPx: state.blurPx,
        glassOpacity: state.glassOpacity,
      }),
    )
  } catch {}
}

const notify = () => {
  persist()
  listeners.forEach((fn) => fn(state))
}

export const themeCustomizerStore = {
  get: (): ThemeState => state,

  open: () => {
    state = { ...state, isOpen: true }
    notify()
  },

  close: () => {
    state = { ...state, isOpen: false }
    notify()
  },

  setAccent: (accent: AccentColor) => {
    state = { ...state, accent }
    notify()
  },

  setBlur: (blurPx: number) => {
    state = { ...state, blurPx }
    notify()
  },

  setOpacity: (glassOpacity: number) => {
    state = { ...state, glassOpacity }
    notify()
  },
}

export const useThemeCustomizer = (): ThemeState => {
  const [current, setCurrent] = useState<ThemeState>(state)

  useEffect(() => {
    const handler = (next: ThemeState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
