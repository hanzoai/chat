/**
 * The one fact about the page that two modules have to agree on.
 *
 * Everything else is a theme token — `$3`, `$background`, `$borderColor` — and
 * belongs at the call site; every WIDTH belongs to whoever owns that column.
 * The rail states its own three (`rail/Rail.tsx`), the composer and the thread
 * share their measure by the composer reading the thread's, and `Aside` states
 * its own. So exactly one number is left over, and it is not even a number.
 */
import { useMedia } from '@hanzo/gui'

/**
 * Whether the window is too narrow for a column beside the thread.
 *
 * ONE breakpoint decides two things — the rail becomes a drawer over the page,
 * and the details column is not offered at all — and they have to be the same
 * boolean, or a phone gets a 320px panel eating half the conversation. `Rail`
 * draws the drawer but does not choose the moment ("the shell decides when"),
 * which is here, because the shell is the only thing that can see both columns.
 *
 * `md` is 768 and it is a MINIMUM width: the gui config this app mounts keys
 * its media by minimum width (`sm` `md` `lg`), with the maximums spelled
 * `max-md`. A `gt`-prefixed key belongs to an older config, and reaching for
 * one is not merely inert — gui passes an unrecognised `$key` straight through
 * to the element. Measured in the browser: `$gtSm` arrived as a DOM attribute,
 * React refused it ("Invalid attribute name"), and the style it carried applied
 * nowhere while the console filled with warnings about a prop nobody wrote.
 */
export const useNarrow = (): boolean => !useMedia().md
