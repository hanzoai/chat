import { defaultConfig } from '@hanzogui/config/v5'
import { createGui } from '@hanzo/gui'

// One GUI config for the whole app (DRY). Spread the canonical @hanzo/gui v5
// default config and hand it to createGui — same pattern as the Hanzo console
// (hanzoai/console/gui.config.ts). No font override here; the default system
// stack renders correctly inside the mobile webview.
export const config = createGui({
  ...defaultConfig,
})

export default config

export type Conf = typeof config

declare module '@hanzo/gui' {
  interface TypeOverride {
    conf: Conf
  }
}
