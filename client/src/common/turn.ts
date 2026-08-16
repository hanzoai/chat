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
