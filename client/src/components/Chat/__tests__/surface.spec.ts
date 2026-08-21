import { chatSurface } from '../surface';

/**
 * The bug this pins cost ten and a half seconds of visible nothing, and was
 * invisible from the server: the request 200s, the stream 200s, the answer
 * arrives. Only the screen was empty.
 */
const at = (o: Partial<Parameters<typeof chatSurface>[0]>) =>
  chatSurface({
    hasMessages: false,
    conversationId: 'new',
    isNewConversation: true,
    isSubmitting: false,
    isLoading: false,
    ...o,
  });

describe('which surface the chat column shows', () => {
  it('is the landing on an empty new conversation with nothing in flight', () => {
    expect(at({})).toBe('landing');
  });

  // THE REGRESSION. A send is in flight and the messages query still has
  // nothing, because the conversation does not exist server-side yet. The thread
  // must mount anyway — it is what holds the echo of the message and the
  // thinking indicator, and both exist from the keypress.
  it('is the thread the instant a send is in flight, before any message is stored', () => {
    expect(at({ isSubmitting: true })).toBe('thread');
  });

  // And it must not become a bare spinner instead, which is the same hole with a
  // different thing in it: still no echo, still no indicator.
  it('never shows a spinner while a send is in flight', () => {
    expect(at({ isSubmitting: true, isLoading: true })).toBe('thread');
    expect(at({ isSubmitting: true, conversationId: 'abc', isNewConversation: false })).toBe(
      'thread',
    );
  });

  it('is the thread once there are messages, whatever else is true', () => {
    expect(at({ hasMessages: true })).toBe('thread');
    expect(at({ hasMessages: true, isSubmitting: true })).toBe('thread');
  });

  it('is loading when arriving at an existing thread whose messages have not come', () => {
    expect(at({ conversationId: 'abc', isNewConversation: false })).toBe('loading');
  });

  it('is loading, not the landing, while an existing thread refetches', () => {
    expect(at({ hasMessages: true, isLoading: true, isNewConversation: false })).toBe('loading');
  });
});
