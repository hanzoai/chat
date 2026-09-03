/**
 * Which automation the panel is looking at.
 *
 * The flows and their runs are the server's — `auto.ts` reads them — so the
 * panel holds only whether it is open and which row is expanded.
 */
import { atom, useAtom } from '../data/store'

export type Panel = {
  isOpen: boolean
  /** The flow whose run history is showing, or `null`. */
  selected: string | null
}

const panel = atom<Panel>({ isOpen: false, selected: null })

export const automationsStore = {
  get: (): Panel => panel.get(),
  open: () => panel.set((was) => ({ ...was, isOpen: true })),
  close: () => panel.set((was) => ({ ...was, isOpen: false, selected: null })),
  toggle: () => panel.set((was) => ({ ...was, isOpen: !was.isOpen })),
  select: (id: string | null) => panel.set((was) => ({ ...was, selected: id })),
}

export const useAutomations = (): Panel => useAtom(panel)
