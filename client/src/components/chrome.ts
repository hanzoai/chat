/**
 * The box every control in the app's top row wears.
 *
 * That row is one row to the eye and several files to the code — the sidebar
 * head (`Nav/NewChat`, `Nav/BrandCorner`) at the left, `Chat/Header`'s action
 * group at the right, and the window controls after it. Each had grown its own
 * answer to the same question, and the row showed it. Measured on production at
 * 1440×900, signed out:
 *
 *   mark 44 · close-sidebar 44 · new-chat 44 · TEMPORARY 40 · maximize 44 ·
 *   companions 44 · controls 44
 *
 * with glyphs of 24 and 18 mixed through it, and the grounds split down the
 * middle: the four at the right end painted `bg-presentation`, an opaque patch
 * of the canvas colour, while the three at the left were transparent. Over the
 * backdrop video that reads as four dark slabs floating beside three bare
 * glyphs — one row, two kinds of button, no rule saying which control got
 * which. The mark was rounder than all of them.
 *
 * So: 44 square, one radius, a 20px glyph, and no ground until you point at it.
 * 44 is the pointer floor and what the majority already measured; 20 is what
 * the composer's own row settled on, so the chrome speaks one size throughout;
 * transparent-at-rest is what the three left-hand controls already did, and
 * they proved the glyphs stay legible with no plate under them.
 *
 * `[&_svg]:size-5` is why the glyph size lives here rather than at each call
 * site: those call sites wrote `icon-lg`, `icon-md`, a bare 24×24 `<svg>` and
 * `size={20}`, which is four ways to say one thing and is exactly how 24 and 18
 * ended up side by side. A descendant selector is (0,1,1) and beats every one
 * of them, so the row cannot disagree with itself again.
 *
 * `rounded-full` below md because the phone bar is round; `md:rounded-xl` from
 * there, matching every other 12px corner in the chrome.
 *
 * `HanzoAppLauncher` (shell) writes its trigger's box INLINE, so `BrandCorner`
 * cannot use this at all — it reaches that button through a descendant selector
 * and has to raise the radius to `!important`, because a class alone loses to
 * an inline declaration.
 */
export const CONTROL =
  'inline-flex size-11 flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent text-text-primary duration-0 hover:bg-surface-active-alt focus-visible:ring-inset focus-visible:ring-black focus-visible:ring-offset-0 dark:focus-visible:ring-white md:rounded-xl [&_svg]:size-5';

/**
 * The ground a MENU trigger wears while its menu is open, applied from the
 * boolean each menu already holds.
 *
 * Not `aria-expanded:` in `CONTROL`, though every one of these triggers does
 * set that attribute. So do the sidebar toggles — correctly, the sidebar is a
 * thing they expand — and keying the shared class on it lit `Close sidebar`
 * for as long as the sidebar stayed open: one permanent plate in a row of
 * none, which is the defect this file exists to remove. The attribute is right
 * for both; the GROUND is only right for one. A menu trigger lights so the eye
 * can trace a floating popup back to what opened it. A panel toggle has its
 * panel attached to it — there is nothing to trace, and the light is just a
 * plate.
 */
export const CONTROL_OPEN = 'bg-surface-active-alt';

/**
 * The box every row in the sidebar column wears.
 *
 * The column ran five shapes at once, measured at 1440×900:
 *
 *   conversation list  h-12 md:h-9   rounded-lg
 *   Projects/Sites/…   36            rounded-lg
 *   search             h-10          rounded-lg
 *   Plans/Settings/…   min-h-11      rounded-XL
 *   account block      min-h-11      rounded-XL
 *
 * — so the four rows at the foot had more air and a rounder corner than the
 * four at the head, in one 244px column, for no reason either group states.
 *
 * The conversation list already held the right answer and had the most rows to
 * hold it with: `h-12 md:h-9` is 48 where a finger points and 36 where a
 * pointer does, which is the pointer floor on touch without spending 44px per
 * row on a desktop list that may be a hundred rows long. This states the same
 * thing as a floor (`min-h-`) so a row with two lines of text can still grow.
 * `rounded-lg` because three of the five already agreed on it.
 *
 * The icon is 16 for the same reason the row is: that is what the list and the
 * nav rows draw, and `icon-md` (18) at the foot was the odd one.
 *
 * Search keeps its own height — it is a field, not a row — and already rounds
 * the same way. Sign up / Log in keep 44 at every width: they are the offer,
 * not a row in a list.
 */
export const ROW =
  'hz-row flex min-h-12 w-full items-center gap-2 rounded-lg px-2 text-sm text-text-primary transition-colors hover:bg-surface-active-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy [&_svg]:size-4';
