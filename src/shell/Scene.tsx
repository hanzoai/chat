import { View } from '@hanzo/ui'

import { brand } from '../brand.ts'

/**
 * The immersive ground the whole product floats on.
 *
 * One fixed layer behind everything, painted from the brand's `scene` over the
 * theme's own `$background` — so the page is never flat black and the glass
 * chrome above it has depth to blur. It is `@hanzo/gui`, so the same layer
 * paints on the web and inside the desktop webview; `pointerEvents: none`, so it
 * is scenery the cursor passes straight through. The scene is a BRAND fact
 * (`brand.scene`) rather than a constant here, because each product owns the
 * world it sits in and a second copy is a second thing to keep in step.
 */
export const Scene = () => (
  <View
    position="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    pointerEvents="none"
    style={{ background: brand.scene }}
  />
)
