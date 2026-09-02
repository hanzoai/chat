/**
 * What the board is looking at.
 *
 * The cards are the server's — `todo.ts` reads them — so what is left is which
 * board, what was typed into the search box, and which card is open. None of
 * that outlives the tab, which is why none of it is persisted.
 */
import { atom, useAtom } from '~/data/store'

export type View = {
  isOpen: boolean
  /** The board's key. Empty is the org's whole board, which is a real read. */
  key: string
  search: string
  /** `"<key>#<number>"` of the open card, or `null`. */
  card: string | null
}

const view = atom<View>({ isOpen: false, key: '', search: '', card: null })

export const boardStore = {
  get: (): View => view.get(),
  open: () => view.set((was) => ({ ...was, isOpen: true })),
  close: () => view.set((was) => ({ ...was, isOpen: false, card: null })),
  toggle: () => view.set((was) => ({ ...was, isOpen: !was.isOpen })),
  pick: (key: string) => view.set((was) => ({ ...was, key, card: null })),
  find: (search: string) => view.set((was) => ({ ...was, search })),
  select: (card: string | null) => view.set((was) => ({ ...was, card })),
}

export const useBoard = (): View => useAtom(view)
