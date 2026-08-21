import { messagesKey } from '../messagesKey';

/**
 * The two spellings that had to agree and did not. Writer and reader now call
 * this, so the only way they can disagree again is by one of them not calling it.
 */
describe('the messages cache key', () => {
  it('is the URL param when there is one', () => {
    expect(messagesKey('abc', 'zzz')).toBe('abc');
  });

  it('is "new" for a brand-new conversation, whatever the store calls it', () => {
    expect(messagesKey('new', 'abc')).toBe('new');
    expect(messagesKey('new', undefined)).toBe('new');
  });

  // THE BUG. No URL param — the landing — so the conversation's own id has to
  // answer. The reader used to stop at the param and read '', while the writer
  // fell through to 'new': the echo was in the cache under a key nothing read.
  it('falls back to the conversation id when the URL has no param', () => {
    expect(messagesKey(undefined, 'new')).toBe('new');
    expect(messagesKey(undefined, 'abc')).toBe('abc');
    expect(messagesKey(null, 'abc')).toBe('abc');
  });

  it('is empty only when nothing identifies a conversation at all', () => {
    expect(messagesKey(undefined, undefined)).toBe('');
    expect(messagesKey(null, null)).toBe('');
  });
});
