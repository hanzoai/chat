/**
 * Export & Fork Conversation Store.
 */
import { useEffect, useState } from 'react'

export interface ExportState {
  isOpen: boolean
}

let state: ExportState = { isOpen: false }
const listeners = new Set<(s: ExportState) => void>()

const notify = () => listeners.forEach((fn) => fn(state))

export const exportStore = {
  get: (): ExportState => state,
  open: () => {
    state = { isOpen: true }
    notify()
  },
  close: () => {
    state = { isOpen: false }
    notify()
  },
}

export const useExport = (): ExportState => {
  const [current, setCurrent] = useState<ExportState>(state)

  useEffect(() => {
    const handler = (next: ExportState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
