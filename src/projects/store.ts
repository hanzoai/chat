/**
 * Which pane the projects panel is showing.
 *
 * The projects and the people are the server's — `projects.ts` reads them —
 * and the org is the principal's, so the only thing left to hold is whether
 * this panel is open and which of its two lists is in front.
 */
import { atom, useAtom } from '~/data/store'

export type Pane = 'projects' | 'people'

export type Panel = {
  isOpen: boolean
  pane: Pane
}

const panel = atom<Panel>({ isOpen: false, pane: 'projects' })

export const projectsStore = {
  get: (): Panel => panel.get(),
  open: () => panel.set((was) => ({ ...was, isOpen: true })),
  close: () => panel.set((was) => ({ ...was, isOpen: false })),
  toggle: () => panel.set((was) => ({ ...was, isOpen: !was.isOpen })),
  show: (pane: Pane) => panel.set((was) => ({ ...was, pane })),
}

export const useProjectPanel = (): Panel => useAtom(panel)
