/**
 * The top-left corner of the app: the Enso ring, which IS the switcher that
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
 * The mark is the Hanzo H, at the same 20 the collapsed rail draws
 * (`NewChat.tsx`). One corner, one glyph: collapsing the sidebar moves the mark
 * between containers and changes what it DOES — switcher when the column is
 * open, "open sidebar" when it is shut — but the shape the eye tracks never
 * changes. It used to be the Enso ring here and the H there, so the corner
 * appeared to swap logos on collapse. The Enso stays where it means something:
 * beside an AI reply.
 *
 * `HanzoMark` fills with `currentColor`, and the shell's trigger button sets its
 * own muted colour inline; so the span sets the mark's resting weight ON ITSELF
 * (a class outranks an inherited inline value) and the corner lifts it to pure
 * white on hover. Monochrome in both themes — chat bakes in no hue of its own.
 */
import { HanzoAppLauncher, HanzoMark } from '@hanzogui/shell';
import { useLocalize } from '~/hooks';

export default function BrandCorner() {
  const localize = useLocalize();

  return (
    // The shared shell hard-codes its trigger box inline, so these reach it
    // through a descendant selector: clamp it to the row's 44px, give it chat's
    // own hover ground, and lift the mark to pure white while the corner is
    // hovered — without touching the glyph itself.
    //
    // The radius is `!` and the height is a `min-`, and both are that shape for
    // the same reason: an inline declaration outranks any class. `min-height`
    // wins because the shell writes `height`, a different property; the radius
    // has to be `!important` because the shell writes `border-radius: 999px` on
    // that very button. Without it the corner is a circle among 12px squircles
    // — measured on production, the one round box in a row of six.
    <div className="flex items-center [&_[data-hanzo-shell]>button:hover]:bg-surface-active-alt [&_[data-hanzo-shell]>button:hover_[data-testid=brand-mark]]:text-white [&_[data-hanzo-shell]>button]:min-h-11 [&_[data-hanzo-shell]>button]:min-w-11 [&_[data-hanzo-shell]>button]:!rounded-xl">
      {/* The launcher's global ⌘/Ctrl-K listener stays off: chat must not claim
          an app-wide shortcut just because it adopted the shared shell. */}
      <HanzoAppLauncher
        currentApp="chat"
        align="left"
        quickSwitchKey={false}
        label={localize('com_nav_hanzo_apps')}
        trigger={() => (
          <span
            className="flex items-center justify-center text-text-secondary transition-colors"
            data-testid="brand-mark"
          >
            <HanzoMark size={20} />
          </span>
        )}
      />
    </div>
  );
}
