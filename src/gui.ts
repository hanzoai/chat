/**
 * The two facts about the page that more than one module has to agree on.
 *
 * Everything else is a theme token — `$3`, `$background`, `$borderColor` — and
 * belongs at the call site, and every WIDTH belongs to whoever owns that
 * column: the rail states its own three (`rail/Rail.tsx`), and `Aside` states
 * its own. What is left is what genuinely spans two owners, which is these.
 */
import { useMedia } from '@hanzo/gui'

/**
 * The reading measure — how wide a line of prose may get.
 *
 * `Thread` already caps and centres the turns at 768 and the composer has to
 * line up under them, so the number is written here rather than a second time
 * in the composer's wrapper. Two literals is how the draft and the answers
 * above it came to sit eight pixels apart.
 */
export const MEASURE = 768

/**
 * Whether the window is too narrow for a column beside the thread.
 *
 * ONE breakpoint decides two things — the rail becomes a drawer over the page,
 * and the details column is not offered at all — and they have to be the same
 * boolean or a phone gets a 320px panel eating half the conversation. `Rail`
 * draws the drawer but does not choose the moment ("the shell decides when"),
 * which is here, because the shell is the only thing that sees both columns.
 */
export const useNarrow = (): boolean => !useMedia().gtSm
