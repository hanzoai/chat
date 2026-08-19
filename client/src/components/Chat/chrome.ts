/**
 * The ONE chrome spec for hanzo.chat — the header cluster, the companions menu,
 * the bottom bar's strip and the seam between them. Every chrome file imports
 * from here and nothing hard-codes a second copy of these numbers.
 *
 * It is chat's expression of `hanzo-desktop`'s `src/hanzo/theme.ts`. Classes do
 * not transfer between the two surfaces — desktop is gui-native and loads no
 * Tailwind — but the DECISIONS do, and they are the same decisions:
 *
 *   - one square for the whole cluster, at the pointer-target floor
 *   - one focus indicator for the whole chrome
 *   - one radius for chrome squares and the menu rows they open
 *   - the strip's height is a budget, so its buttons are BLED into it
 *
 * Held by `e2e/specs/chrome/window-chrome.spec.ts`, in a real Chromium, against
 * the built client. A green build proves none of it: an unrecognised utility is
 * dropped as silently as a gui prop that does not exist.
 */

/**
 * The chrome's ONE square: 44px (Apple HIG 44pt, WCAG 2.5.5).
 *
 * A chrome control is hit by a pointer travelling from anywhere on screen, so
 * it gets the pointer-target floor rather than the roomier-form treatment a
 * control inside a panel can afford. A row of three buttons where one is 40
 * reads as a mistake, and is one.
 */
export const CHROME_CONTROL = 'size-11';

/**
 * Corner rounding for chrome squares AND the menu rows they open — one radius,
 * because the row is the square's continuation into the panel. 10px has no
 * Tailwind token here (`lg` is 8, `xl` is 12), so it is written once.
 */
export const CHROME_RADIUS = 'rounded-[10px]';

/**
 * ONE focus indicator for the whole chrome — the cluster, the menu rows, the
 * strip's buttons, a tab and its close, the seam.
 *
 * Spread into every one of them, because a control that hand-rolls its own box
 * does not LOSE its focus ring: it falls back to the user agent's, which looks
 * nothing like ours. That is how one row of buttons ends up painting two
 * different indicators — measured here at THREE before this constant existed
 * (a 40%-alpha box-shadow ring on the cluster, the UA's solid-white outline on
 * every control in the strip, and nothing at all on the resize handle).
 *
 * An OUTLINE rather than Tailwind's `ring-*`, which is a box-shadow: a
 * box-shadow is clipped by any ancestor that scrolls, and the strip and the
 * header both sit inside one. `ring-0`/`ring-offset-0` stand the inherited ring
 * down so a control cannot wear both — `cn()` is tailwind-merge, so these win
 * over a `Button` base that already asked for `ring-2`.
 */
export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ring focus-visible:ring-0 focus-visible:ring-offset-0';

/** A chrome square's fill: transparent until hovered, painted while its panel is open. */
export const CHROME_SURFACE =
  'bg-presentation duration-0 hover:bg-surface-active-alt aria-expanded:bg-surface-active-alt';

/**
 * A companions-menu row.
 *
 * The chrome square's height (not a minimum — a row that grows with its label
 * is a row that disagrees with the button that opened it) and the chrome
 * square's radius. `px-2.5`/`gap-2.5` is the 10px rhythm desktop's ChromeMenu
 * spends; the base row's `px-3 md:px-2.5` is replaced rather than added to, so
 * the row measures the same at every width.
 */
export const MENU_ROW = `h-11 gap-2.5 px-2.5 ${CHROME_RADIUS} ${FOCUS_RING}`;

/**
 * The strip's `+` and `×`.
 *
 * The strip's height is a BUDGET — 32px of content + 4px padding either side +
 * the 1px rule = 41 — and the composer sits directly above it, so every pixel
 * the strip grows is a pixel the conversation loses. `-my-1` is a BLEED, not
 * spacing: the box grows to 40 so the pointer has something to hit while the
 * margin box stays the 32 the strip budgeted. It cannot reach 44 without
 * overhanging the resize handle above and stealing its grab.
 */
export const STRIP_BUTTON = `size-10 -my-1 ${CHROME_RADIUS} ${FOCUS_RING}`;

/**
 * A tab's close button: 24px, the floor a control may not go under (WCAG
 * 2.5.8), bled by 2 so the tab measures what it did at 20. Its own radius,
 * because a 10px corner on a 24px box is a circle.
 */
export const TAB_CLOSE = `size-6 -mx-0.5 rounded-md ${FOCUS_RING}`;
