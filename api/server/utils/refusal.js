/**
 * The ONE translation from a thrown upstream failure into a refusal the reader
 * can act on.
 *
 * A refusal travels as `{ error, code }` — the shape
 * `client/src/components/Messages/Content/Error.tsx` dispatches on, and the shape
 * `controllers/agents/request.js` already answers with when a thrower knows its
 * own code. Every OTHER carrier on this path flattened a failure to PROSE
 * (`An error occurred while processing the request: 402 invalid API key`), and
 * prose is precisely the shape that renderer cannot map — so a PAYWALL rendered
 * as "Something went wrong on our side" to a reader who was holding a credit
 * card. The status and the code are known at the throw; they have to survive to
 * the render.
 *
 * `routes/ask.js#relayStatus` does this job for the answer engine: the upstream
 * STATUS is the authority and only the statuses a client can act on survive.
 * This is that same rule for the completion path, where the carrier is a stored
 * message rather than an HTTP response.
 */

/** The gateway's "I cannot bill this request" — the one refusal money resolves. */
const PAYMENT_REQUIRED = 402;

/**
 * The name that refusal already has here: it is what the gateway's own wrapper
 * emits for a spent balance
 * (`packages/api/src/endpoints/custom/hanzoGatewayFetch.ts`) and the key
 * `Messages/Content/Error.tsx` renders as the add-credit paywall.
 */
const INSUFFICIENT_QUOTA = 'insufficient_quota';

/** The upstream status, wherever the thrower left it. */
const statusOf = (error) => error?.status ?? error?.statusCode ?? error?.response?.status ?? null;

/**
 * The code a failure carries, or null when it names nothing.
 *
 * The code the thrower chose wins — an OpenAI-client `APIError` puts the
 * gateway's own `code`/`type` there. Failing that the STATUS names it: 402 is
 * the only status that arrives here already meaning something specific to a
 * reader, because 401 and 403 are refused before a run ever starts
 * (`requireGuestOrJwtAuth`, and the bearer gate in `custom/initialize.ts`).
 *
 * @param {unknown} error
 * @returns {string|null}
 */
function refusalCode(error) {
  const code = error?.code ?? error?.type ?? error?.error?.code ?? error?.error?.type;
  if (typeof code === 'string' && code.length > 0) {
    return code;
  }
  return statusOf(error) === PAYMENT_REQUIRED ? INSUFFICIENT_QUOTA : null;
}

/**
 * The envelope a thrower already built, kept verbatim — `custom/initialize.ts`
 * throws `JSON.stringify({ type })` for the key/base-URL refusals and re-wrapping
 * that would bury the code one level deeper than the renderer looks.
 *
 * @param {unknown} message
 * @returns {string|null}
 */
function builtEnvelope(message) {
  if (typeof message !== 'string' || message[0] !== '{') {
    return null;
  }
  try {
    const json = JSON.parse(message);
    return json?.type || json?.code ? message : null;
  } catch {
    return null;
  }
}

/**
 * The text to STORE for a failed generation.
 *
 * A named refusal becomes the envelope; anything else keeps the caller's own
 * sentence, because a failure nobody recognises must stay unrecognised rather
 * than be dressed up as something the reader could fix. The raw upstream message
 * rides along inside the envelope for whoever is debugging — the renderer shows
 * the code's own copy, never that string.
 *
 * @param {unknown} error - The thrown failure.
 * @param {string} fallback - What to say when the failure names nothing.
 * @returns {string}
 */
function refusalText(error, fallback) {
  const built = builtEnvelope(error?.message);
  if (built) {
    return built;
  }
  const code = refusalCode(error);
  if (!code) {
    return fallback;
  }
  return JSON.stringify({ error: error?.message || code, code });
}

module.exports = { INSUFFICIENT_QUOTA, refusalCode, refusalText };
