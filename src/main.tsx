import { Hanzo } from '@hanzo/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '~/app'
import { brand, wear } from '~/brand'

/**
 * The mount. Three lines, and the second one is the whole design system.
 *
 * `<Hanzo>` IS the root: it mounts `GuiProvider` with the gui config the
 * `$background` / `$color12` / `$borderColor` tokens resolve against, the
 * generated stylesheet, and `disableInjectCSS` — the sheet is a real file, and
 * a provider that inlines it again ships a copy of it into every document.
 * There is no theme provider to add, no CSS to import, no config file to keep
 * in step; a second one of any of those is how two surfaces of the same product
 * end up different sizes.
 *
 * The theme is the brand's, not a literal: one image serves every brand, so the
 * served document carries a placeholder name, icon and backdrop and `wear()` is
 * the moment they become this brand's. It runs before the render so nothing is
 * ever painted under another brand's name.
 */
wear()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hanzo theme={brand.backdrop}>
      <App />
    </Hanzo>
  </StrictMode>,
)
