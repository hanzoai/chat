/**
 * Global Keyboard Shortcuts Store.
 */
import { useEffect, useState } from 'react'

export interface ShortcutsState {
  isOpen: boolean
}

let state: ShortcutsState = { isOpen: false }
const listeners = new Set<(s: ShortcutsState) => void>()

const notify = () => listeners.forEach((fn) => fn(state))

export const shortcutsStore = {
  get: (): ShortcutsState => state,
  open: () => {
    state = { isOpen: true }
    notify()
  },
  close: () => {
    state = { isOpen: false }
    notify()
  },
  toggle: () => {
    state = { isOpen: !state.isOpen }
    notify()
  },
}

export const useShortcuts = (): ShortcutsState => {
  const [current, setCurrent] = useState<ShortcutsState>(state)

  useEffect(() => {
    const handler = (next: ShortcutsState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
