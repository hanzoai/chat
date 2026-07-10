const { ContentTypes } = require('librechat-data-provider');

/**
 * Content-part types whose payload is a plain string and which render nothing
 * when that string is empty. Everything else (error, tool_call, image, audio,
 * agent_update, ...) renders some visible affordance even without text.
 */
const TEXT_LIKE_TYPES = new Set([ContentTypes.TEXT, ContentTypes.THINK, ContentTypes.TEXT_DELTA]);

/**
 * True when an assembled agent response carries nothing the user would see.
 *
 * The Hanzo Cloud gateway can end a `stream:true` completion with NO content and
 * WITHOUT throwing — a rejected key or an out-of-credits balance answered as a
 * 200 `text/event-stream` that yields zero deltas. The agent run then completes
 * "successfully" with an empty `content` array, so the client renders an empty
 * assistant bubble instead of a visible error (the GA-blocker silent failure).
 * Callers use this to detect that case and surface a real error over the SSE
 * error path instead.
 *
 * A response is non-empty if it has any non-whitespace `text`, or any content
 * part that renders something: a text/think part with non-whitespace text, or
 * any non-text part (error, tool_call, image, audio, ...).
 *
 * @param {{ text?: unknown, content?: unknown } | null | undefined} response
 * @returns {boolean}
 */
function isEmptyAgentResponse(response) {
  if (!response) {
    return true;
  }

  if (typeof response.text === 'string' && response.text.trim() !== '') {
    return false;
  }

  const { content } = response;
  if (!Array.isArray(content) || content.length === 0) {
    return true;
  }

  return !content.some((part) => {
    if (typeof part === 'string') {
      return part.trim() !== '';
    }
    if (part == null || typeof part !== 'object') {
      return false;
    }
    if (TEXT_LIKE_TYPES.has(part.type)) {
      const value = part[part.type];
      return typeof value === 'string' && value.trim() !== '';
    }
    // Any non-text content part renders a visible affordance on its own.
    return true;
  });
}

module.exports = { isEmptyAgentResponse };
