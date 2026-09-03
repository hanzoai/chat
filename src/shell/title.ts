/**
 * What the tab says, and the one place it is said.
 *
 * A browser tab is the only chrome a reader sees when the window is not
 * focused, so it names the CONVERSATION and not just the product — eleven tabs
 * all reading "Hanzo Chat" is eleven tabs you have to click through.
 *
 * The product half comes from `brand`, which is the whole point: it used to be
 * `config.appTitle` read from the server with a hard-coded 'Hanzo Chat' beside
 * every use of it, so a brand whose config route answered nothing wore Hanzo's
 * name in its own tab.
 */
import { useEffect } from 'react'

import { brand } from '../brand.ts'

export const useTitle = (subject?: string | null) => {
  useEffect(() => {
    const named = subject?.trim()
    document.title = named ? `${named} · ${brand.title}` : brand.title
  }, [subject])
}
