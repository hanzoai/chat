/**
 * Which run the queue is looking at.
 *
 * Nothing about a run lives here. The runs are the server's — `runs.ts` reads
 * them — and what is left is the panel itself: whether it is open, and which
 * row is selected. Those are this browser's and nobody else's, so they are an
 * atom rather than a cache entry.
 */
import { atom, useAtom } from '~/data/store'

export type Queue = {
  isOpen: boolean
  /** The selected run's id, or `null` for whichever the list answers first. */
  selected: string | null
}

const queue = atom<Queue>({ isOpen: false, selected: null })

export const taskQueueStore = {
  get: (): Queue => queue.get(),
  open: (id?: string) => queue.set((was) => ({ isOpen: true, selected: id ?? was.selected })),
  close: () => queue.set((was) => ({ ...was, isOpen: false })),
  toggle: () => queue.set((was) => ({ ...was, isOpen: !was.isOpen })),
  select: (id: string) => queue.set((was) => ({ ...was, selected: id })),
}

export const useTaskQueue = (): Queue => useAtom(queue)
