import { Toaster, TooltipProvider } from '@hanzo/ui'
import { RouterProvider } from 'react-router/dom'

import { Session } from '~/data/session'
import { router } from '~/routes'

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
      <RouterProvider router={router} />
    </Session>
    <Toaster theme="dark" position="top-center" />
  </TooltipProvider>
)
