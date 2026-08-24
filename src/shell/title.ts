/**
 * What the tab says, and the one place it is said.
 *
 * A browser tab is the only piece of chrome a reader sees when the window is
 * not focused, so it has to name the CONVERSATION and not just the product —
 * eleven tabs all reading "Hanzo Chat" is eleven tabs you have to click through.
 *
 * The product half is a parameter rather than a literal because the brand is a
 * runtime fact: one image serves hanzo.chat, lux.chat and zoo.chat, and the
 * deployment says which it is (`config.appTitle`). Until that read lands, the
 * document's own title stands in — the served HTML already carries a name, and
 * blanking the tab while a fetch is in flight is worse than a moment of the
 * generic one.
 */
import { useEffect } from 'react'

/**
 * The title the document arrived with. Read at module scope, which is the only
 * moment it is still the served one — the first `useTitle` overwrites it.
 */
const SERVED = typeof document === 'undefined' ? '' : document.title

export const useTitle = (subject?: string | null, product?: string) => {
  useEffect(() => {
    const name = product?.trim() || SERVED
    const named = subject?.trim()
    document.title = named ? `${named} · ${name}` : name
  }, [subject, product])
}
