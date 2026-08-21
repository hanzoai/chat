/**
 * WHICH KEY a conversation's messages are cached under — one derivation, used by
 * the writer and the reader.
 *
 * It was written twice. `useChatHelpers` derived it as
 *
 *     paramId === 'new' ? paramId : (paramId ?? conversationId ?? '')
 *
 * with a comment reading "this must match what ChatView uses", and ChatView used
 * `conversationId ?? ''` — the URL param alone, with no fall back to the
 * conversation's own id. The comment was right about the requirement and wrong
 * about the fact.
 *
 * On the landing there IS no URL param, so the writer put the optimistic echo
 * under 'new' and the reader looked under ''. The message you just sent was in
 * the cache the whole time, under a key nothing on screen was reading, which is
 * why pressing Enter produced ten seconds of silence: not a lost request, a
 * cache miss between two spellings of the same question.
 */
export function messagesKey(paramId?: string | null, conversationId?: string | null): string {
  // A brand-new conversation is addressed as 'new' even once the store has given
  // it an id, because that is what the URL says and the URL is what a reload
  // reproduces.
  if (paramId === 'new') {
    return paramId;
  }
  return paramId ?? conversationId ?? '';
}
