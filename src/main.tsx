import { Hanzo } from '@hanzo/ui'
// THE FACES. Zen is authored in `@hanzo/font`, which ships the woff2 the
// `@font-face` needs; `@hanzo/ui`'s theme.css only names the family. This is the
// estate's one way (`@hanzo/app` does the same) — import it once, here, and the
// gui `--font-sans` token resolves to a real face instead of the system fallback.
import '@hanzo/font/css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.tsx'
import { brand, wear } from './brand.ts'
import { unlock } from './data/vault.ts'

/**
 * The mount. Three lines, and the second one is the whole design system.
 *
 * `<Hanzo>` IS the root: it mounts `GuiProvider` with the gui config the
 * `$background` / `$color12` / `$borderColor` tokens resolve against, the
 * generated stylesheet, and `disableInjectCSS` — the sheet is a real file, and
 * a provider that inlines it again ships a copy of it into every document.
 * There is no theme provider to add and no config file to keep in step; the one
 * CSS import is the faces above, because a font is bytes and `@hanzo/ui` ships
 * only the token that names them. A second theme, config or face is how two
 * surfaces of the same product end up different sizes.
 *
 * The theme is the brand's, not a literal: one image serves every brand, so the
 * served document carries a placeholder name, icon and backdrop and `wear()` is
 * the moment they become this brand's. It runs before the render so nothing is
 * ever painted under another brand's name.
 */
wear()

/**
 * The session is read off the machine BEFORE anything renders, because
 * `Storage` is synchronous and a keychain is not: a store that answered null
 * while it was still loading would sign everybody out at launch. On the web
 * there is nothing to read and this settles in a microtask.
 */
void unlock().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Hanzo theme={brand.backdrop}>
        <App />
      </Hanzo>
    </StrictMode>,
  ),
)
