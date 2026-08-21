/**
 * WHICH SURFACE the chat column shows, as one decision in one place.
 *
 * Three states, and they were three booleans spread across a render body that
 * each had to agree with the other two. They did not: `isLandingPage` keyed on
 * the messages QUERY being empty, and on a brand-new conversation that query has
 * nothing to serve until the server has created the conversation. Measured on
 * production: 10.5 seconds. For all of it the landing kept rendering, so the
 * echo of what you just typed — and the thinking indicator beside it — were not
 * mounted at all.
 *
 * From the outside that is the whole of "the chat is not working": the composer
 * empties the instant you press Enter, and then nothing happens for ten seconds.
 * No message, no spinner, no error. A reasonable person concludes it was
 * swallowed, and sends it again.
 *
 * The fix is one fact the render body did not consult: a SUBMISSION. It is set
 * synchronously by `send()` — together with the user's message and an empty
 * assistant placeholder — so it is true on the same tick as the keypress and
 * stays true until the stream ends. That makes it the honest answer to "is this
 * still the landing", where an empty query result never was.
 */

export type Surface = 'landing' | 'loading' | 'thread';

export function chatSurface({
  hasMessages,
  conversationId,
  isNewConversation,
  isSubmitting,
  isLoading,
}: {
  hasMessages: boolean;
  conversationId: string | null | undefined;
  /** The route says this conversation does not exist yet. */
  isNewConversation: boolean;
  /** A send is in flight — `store.submission` is non-null. */
  isSubmitting: boolean;
  /** The messages query is still fetching. */
  isLoading: boolean;
}): Surface {
  // Something to render always wins. A thread with messages is a thread, even
  // while a query refetches behind it.
  if (hasMessages) {
    return isLoading && !isNewConversation ? 'loading' : 'thread';
  }

  // Nothing stored yet, but a send is in flight: the thread holds the optimistic
  // echo and the thinking indicator, and both exist from the keypress.
  if (isSubmitting) {
    return 'thread';
  }

  // An empty NEW conversation with nothing in flight is the landing.
  if (isNewConversation) {
    return 'landing';
  }

  // An existing conversation whose messages have not arrived: really navigating.
  return conversationId != null || isLoading ? 'loading' : 'landing';
}
