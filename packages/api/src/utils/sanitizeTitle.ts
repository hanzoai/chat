/**
 * Sanitizes LLM-generated chat titles by removing <think>...</think> reasoning blocks.
 *
 * This function strips out all reasoning blocks (with optional attributes and newlines)
 * and returns a clean title. If the result is empty, a fallback is returned.
 *
 * @param rawTitle - The raw LLM-generated title string, potentially containing <think> blocks.
 * @returns A sanitized title string, never empty (fallback used if needed).
 */
export function sanitizeTitle(rawTitle: string): string {
  const DEFAULT_FALLBACK = 'Untitled Conversation';

  // Step 1: Input Validation
  if (!rawTitle || typeof rawTitle !== 'string') {
    return DEFAULT_FALLBACK;
  }

  // Step 2: Build and apply the regex to remove all <think>...</think> blocks
  const thinkBlockRegex = /<think\b[^>]*>[\s\S]*?<\/think>/gi;
  const cleaned = rawTitle.replace(thinkBlockRegex, '');

  // Step 3: Normalize whitespace (collapse multiple spaces/newlines to single space)
  const normalized = cleaned.replace(/\s+/g, ' ');

  // Step 4: Trim leading and trailing whitespace
  const trimmed = normalized.trim();

  // Step 5: Return trimmed result or fallback if empty
  return trimmed.length > 0 ? trimmed : DEFAULT_FALLBACK;
}

/**
 * The name a conversation carries when the model did not give it one: the
 * opening line the user typed, clipped to fit a sidebar.
 *
 * Titling is a model call and model calls fail. When one does, the conversation
 * has to be called something, and the opening line is the one name that is
 * always already there — no second call, nothing to time out. Empty only when
 * the conversation opened without text at all (an image, a file), which is the
 * one case with nothing to read.
 *
 * @param text - The user's first message.
 * @returns A name, or '' when the opening carried no text.
 */
export function opening(text: string): string {
  const LIMIT = 60;

  if (!text || typeof text !== 'string') {
    return '';
  }

  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= LIMIT) {
    return line;
  }

  const cut = line.slice(0, LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > LIMIT / 2 ? cut.slice(0, lastSpace) : cut) + '…';
}
