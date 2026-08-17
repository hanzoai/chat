/**
 * How a turn looks, stated once.
 *
 * The user's bubble was written out three times — MessageRender, MessageParts
 * and ContentRender each carried the same literal — so the surface had three
 * places to change and no way to change them together. Any edit to one left the
 * other two rendering the old shape, and which one a reader saw depended on
 * which component drew their message.
 *
 * `glass` is the shared dark-glass material from `@hanzo/ui/glass.css`, so the
 * bubble is already the fleet's; what was missing is a single name for the
 * shape it takes here.
 *
 * An assistant turn deliberately has no bubble. It is the page's main content,
 * and wrapping it would make the reply look like a quotation of itself.
 */
export const USER_TURN = 'glass hz-turn w-fit max-w-[85%] rounded-3xl px-3.5 py-2';

/**
 * The row a turn sits in, stated once.
 *
 * Four files carried this literal — Message, MessageContent, MessageParts and
 * the shared transcript's Message — so the space between any two turns had four
 * definitions and no way to change them together.
 *
 * Only the horizontal padding is spelled here. How much room a turn gets above
 * and below is `.hz-turn-row` in style.css, because it depends on the pointer
 * and tailwind 3.4 has no variant for that. What the two say together: the room
 * between turns is the room the action strip needs, since from `md` up SubRow
 * hangs that strip in it rather than stacking on top of it.
 *
 * `justify-center` and `md:gap-6` used to ride along in these copies. The box is
 * a block, so neither ever did anything.
 */
export const TURN_ROW = 'hz-turn-row m-auto px-4';

/**
 * The column a turn's parts stack in: what was said, and the action strip under
 * it. Written out three times, like everything else in this file used to be.
 *
 * `items-end` belongs here and not on the wrapper outside, which is where it was
 * written and where it never bit — this column is `w-full`, and a declared width
 * is not something the parent's cross-axis alignment can override. So the user's
 * bubble came out flush left, at the same x as the reply, and position said
 * nothing at all about who was speaking. That left the gap to say it alone,
 * which is a lot to ask of empty space.
 */
export function turnColumn(isUser?: boolean): string {
  return isUser === true ? 'flex w-full flex-col items-end gap-1' : 'flex w-full flex-col gap-1';
}

/**
 * How wide the message column runs, stated once.
 *
 * This was the same function written out three times — MessageRender,
 * ContentRender and MessageParts each carried an identical copy — so the column
 * that decides the layout at every breakpoint had three definitions and no way
 * to change them together. The widths are the ones already shipping; only their
 * number of homes changed.
 *
 * `maximize` gives the column the whole page; `parallel` is the wider track a
 * turn takes when it renders content beside the reply.
 */
export function chatWidth({
  maximize,
  parallel,
}: {
  maximize?: boolean;
  parallel?: boolean;
}): string {
  if (maximize === true) {
    return 'w-full max-w-full md:px-5 lg:px-1 xl:px-5';
  }
  if (parallel === true) {
    return 'md:max-w-[58rem] xl:max-w-[70rem]';
  }
  return 'md:max-w-[47rem] xl:max-w-[55rem]';
}
