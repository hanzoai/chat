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
export const USER_TURN = 'glass w-fit max-w-[85%] rounded-2xl px-4 py-2.5';

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
