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

/**
 * The gateway's own names for the same refusal.
 *
 * A spent balance arrives from api.hanzo.ai as a real 402 carrying
 * `code:"insufficient_balance"`, and `@hanzo/ai` lists the family it belongs to
 * (`FREEABLE_CODES`). This repo already calls that refusal `insufficient_quota`
 * — the key `Messages/Content/Error.tsx` draws the add-credit paywall from — so
 * an untranslated name reached the renderer as a code it knows nothing about and
 * rendered as "Something went wrong on our side": a paywall shown as an outage,
 * to the one reader who could have fixed it by paying.
 *
 * One refusal, one name. The foreign spellings are folded here, at the boundary
 * they enter, rather than taught to every reader downstream.
 */
const SPENT = new Set([
  'insufficient_balance',
  'insufficient_funds',
  'insufficient_quota',
]);

/**
 * IAM's own name for a key it does not hold, relayed by the gateway since
 * hanzoai/ai v1.832.44 (`iam: relay the reason IAM named`).
 *
 * It has to be told apart from a spent balance, because the two arrive as the
 * SAME 402 and lead the reader to opposite places. Every gateway key in the
 * cluster once resolved to `key_unknown` at the same time, and each of those
 * turns rendered the add-credit paywall — pointing a reader at billing.hanzo.ai
 * for a credential no payment can restore. A refusal that sends someone to buy
 * something is worse than one that says nothing.
 */
const KEY_UNKNOWN = 'key_unknown';

/**
 * Whether a failure is about the CREDENTIAL rather than the balance.
 *
 * Matched on the relayed reason first (`key_unknown`), then on the gateway's
 * older prose, so this still separates the two while a deployment predates
 * v1.832.44 — the release that made the reason legible is the one this reads,
 * and it must not depend on that release to avoid the false paywall.
 */
function isKeyFailure(error) {
  const text = `${error?.message ?? ''} ${error?.error?.message ?? ''}`;
  return /key_unknown|API key validation failed|invalid API key/i.test(text);
}

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
  // A broken credential is decided BEFORE the thrower's own code and before the
  // 402 default: the gateway reports it as a 402 either way, and both of the
  // paths below would name that a paywall.
  if (isKeyFailure(error)) {
    return KEY_UNKNOWN;
  }
  const code = error?.code ?? error?.type ?? error?.error?.code ?? error?.error?.type;
  if (typeof code === 'string' && code.length > 0) {
    return SPENT.has(code) ? INSUFFICIENT_QUOTA : code;
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

module.exports = { INSUFFICIENT_QUOTA, KEY_UNKNOWN, isKeyFailure, refusalCode, refusalText };
