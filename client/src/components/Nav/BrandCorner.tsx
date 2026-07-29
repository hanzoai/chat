/**
 * The top-left corner of the app: the Hanzo mark, and the 9-dot launcher that
 * reaches every other Hanzo surface.
 *
 * It is ONE component with two mount points, because the top-left corner is
 * not one container — it is the sidebar's first row while the sidebar is open,
 * and the chat header's first control once the sidebar is collapsed. Rendering
 * it in whichever container currently OWNS that corner is why the corner is
 * never empty and why there is never a second brand mark on screen.
 *
 * The mark is `currentColor` (from @hanzogui/shell, already a dependency), so
 * it inherits the surface's text colour and stays monochrome in both themes —
 * chat bakes in no hue of its own.
 */
import { HanzoAppLauncher, HanzoMark } from '@hanzogui/shell';
import { useLocalize } from '~/hooks';

export default function BrandCorner() {
  const localize = useLocalize();

  return (
    <div className="flex items-center gap-0.5">
      <a
        href="/"
        aria-label={localize('com_nav_home')}
        data-testid="brand-mark"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-primary hover:bg-surface-active-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        <HanzoMark size={18} />
      </a>
      {/* The launcher's global ⌘/Ctrl-K listener stays off: chat must not claim
          an app-wide shortcut just because it adopted the shared shell. */}
      <HanzoAppLauncher currentApp="chat" align="left" quickSwitchKey={false} label="Meet Hanzo" />
    </div>
  );
}
