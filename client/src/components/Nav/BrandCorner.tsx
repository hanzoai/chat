/**
 * The top-left corner of the app: the Hanzo mark, which IS the switcher that
 * reaches every other Hanzo surface.
 *
 * It is ONE component with two mount points, because the top-left corner is
 * not one container — it is the sidebar's first row while the sidebar is open,
 * and the chat header's first control once the sidebar is collapsed. Rendering
 * it in whichever container currently OWNS that corner is why the corner is
 * never empty and why there is never a second brand mark on screen.
 *
 * And it is ONE control. The mark used to be a link home sitting beside a 9-dot
 * grid button, which is two affordances in the corner for one idea — the second
 * of them a glyph nobody had to learn, next to a logo everybody already reads as
 * "take me to the top level". `HanzoAppLauncher` takes a `trigger`, so the mark
 * opens the switcher itself and the grid goes.
 *
 * The mark is `currentColor` (from @hanzogui/shell, already a dependency), so it
 * inherits the surface's text colour and stays monochrome in both themes — chat
 * bakes in no hue of its own. The shell's trigger button sets its own muted
 * colour inline, which an inline style means a class cannot outrank; the span
 * inside re-establishes the foreground for the mark's subtree instead.
 */
import { HanzoAppLauncher, HanzoMark } from '@hanzogui/shell';
import { useLocalize } from '~/hooks';

export default function BrandCorner() {
  const localize = useLocalize();

  return (
    // The shared shell hard-codes its trigger box inline; these clamp it to the
    // 44px pointer floor and give it chat's own hover ground, without touching
    // the glyph or needing !important.
    <div className="flex items-center [&_[data-hanzo-shell]>button:hover]:bg-surface-active-alt [&_[data-hanzo-shell]>button]:min-h-11 [&_[data-hanzo-shell]>button]:min-w-11 [&_[data-hanzo-shell]>button]:rounded-xl">
      {/* The launcher's global ⌘/Ctrl-K listener stays off: chat must not claim
          an app-wide shortcut just because it adopted the shared shell. */}
      <HanzoAppLauncher
        currentApp="chat"
        align="left"
        quickSwitchKey={false}
        label={localize('com_nav_hanzo_apps')}
        trigger={() => (
          <span className="flex items-center justify-center text-text-primary" data-testid="brand-mark">
            <HanzoMark size={18} />
          </span>
        )}
      />
    </div>
  );
}
