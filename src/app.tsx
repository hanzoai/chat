import { Toaster, TooltipProvider } from '@hanzo/ui'
import { RouterProvider } from 'react-router/dom'

import { Session } from '~/data/session'
import { shell } from '~/data/shell'
import { router } from '~/routes'
import { consent, usePref } from '~/settings/prefs'
import { Welcome } from '~/shell/Welcome'

/** How long a hint waits before it appears, everywhere. ONE provider, so the
 *  product cannot have two hover speeds depending on which subtree the pointer
 *  happens to be in. */
const HINT = 200

/**
 * The providers, and there are only two.
 *
 * `<Hanzo>` (main.tsx) is above this and is the third: it mounts `GuiProvider`
 * with the gui config, the dark theme and `disableInjectCSS`, so every `$` token
 * under here resolves before anything renders. Then:
 *
 *   TooltipProvider   one hover delay for the whole product
 *   Session           who this browser is, read by the gate, the rail, the send
 *   RouterProvider    which screen
 *
 * There is no cache provider and no store provider, and that is a decision
 * rather than an omission. `data/query.ts` and `data/store.ts` are built on
 * `useSyncExternalStore` directly — one subscription mechanism for both, no
 * context to mount, and a module-scope cache that `invalidate()` can reach from
 * the callback route without a hook. A `QueryClientProvider` here would be a
 * provider with no consumers, and a `jotai` provider would be a second store
 * beside the one the app actually uses.
 *
 * `Toaster` is not a provider and wraps nothing — it is the viewport `toast()`
 * paints into, mounted once, here, because a second one renders every message
 * twice. Its theme is FORCED rather than `system`: the product is dark, and
 * `system` paints a light toast over a dark page for anyone whose OS disagrees.
 */
export const App = () => (
  <TooltipProvider delay={HINT}>
    <Session>
      <Entry />
    </Session>
    <Toaster theme="dark" position="top-center" />
  </TooltipProvider>
)

/**
 * The way in, and there are two of them for two kinds of visitor.
 *
 * An installed app asks for consent once and then is the app. A page has
 * already agreed by the terms of the site serving it, so the web build has no
 * screen here at all — a consent gate on hanzo.chat would be a wall in front of
 * a product a browser is already reading.
 *
 * It sits under `<Session>` because Welcome offers to sign in, and inside the
 * providers because it is a screen like any other.
 */
const Entry = () => {
  const [agreed] = usePref(consent)
  return shell() && !agreed ? <Welcome /> : <RouterProvider router={router} />
}
