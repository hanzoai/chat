/**
 * Whether the terminal is on screen. What runs IN it lives in `./sandbox`,
 * which holds the lease both this panel and the artifact runner work through.
 *
 * There is one computer to show, and `/v1/sandbox` describes it by class,
 * runtime and status — never by load, which is why nothing here carries a CPU
 * or throughput reading.
 */
import { useEffect, useState } from 'react'

export type TerminalState = { isOpen: boolean }

let state: TerminalState = { isOpen: false }

const listeners = new Set<(next: TerminalState) => void>()

const set = (isOpen: boolean) => {
  state = { isOpen }
  for (const fn of listeners) fn(state)
}

export const terminalStore = {
  get: (): TerminalState => state,
  open: () => set(true),
  close: () => set(false),
  toggle: () => set(!state.isOpen),
}

export const useTerminal = (): TerminalState => {
  const [current, setCurrent] = useState<TerminalState>(state)
  useEffect(() => {
    const handler = (next: TerminalState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])
  return current
}
