const { logger } = require('@librechat/data-schemas');
const { getCommerceClient } = require('~/server/services/CommerceClient');

/**
 * COMMERCE_WRITES routes billing WRITES (debits/credits) to Hanzo Commerce, the
 * central ledger. Default OFF = the current local-Mongo billing path runs
 * byte-for-byte (nothing changes in prod). Flip ONLY after the commerce debit is
 * live-verified end to end. The Commerce-first fail-closed READ gate
 * (balanceMethods.js) is independent of this flag and unchanged.
 *
 * @returns {boolean}
 */
function commerceWritesEnabled() {
  return process.env.COMMERCE_WRITES === 'true';
}

/**
 * Fire-and-forget commerce debit for a token spend. Enqueues onto the
 * CommerceClient usage queue (flushed as POST /v1/billing/usage). NEVER throws
 * into the spend path — local Mongo remains authoritative until cutover.
 *
 * `tokenValue` is in tokenCredits, which are micro-USD (1e6 tokenCredits = $1),
 * so it maps 1:1 to `amountMicros`. `requestId` is the local transaction `_id`:
 * a stable per-spend key so a retry / stream-abort is deduped by commerce (the
 * usage endpoint's idempotency guard).
 *
 * @param {Object} p
 * @param {string} p.subject   - billingSubject(owner,email) — NOT the Mongo user id
 * @param {string} [p.model]
 * @param {string} [p.provider]
 * @param {number} [p.promptTokens]
 * @param {number} [p.completionTokens]
 * @param {number} p.tokenValue - signed token-credit delta (micro-USD)
 * @param {string} p.requestId  - stable per-spend id (transaction _id)
 */
function recordCommerceDebit({
  subject,
  model,
  provider,
  promptTokens,
  completionTokens,
  tokenValue,
  requestId,
}) {
  if (!commerceWritesEnabled() || !subject || !tokenValue || !requestId) {
    return;
  }
  const client = getCommerceClient();
  if (!client) {
    return;
  }
  try {
    client.recordUsage({
      subject,
      model,
      provider,
      promptTokens,
      completionTokens,
      amountMicros: Math.abs(tokenValue),
      requestId,
    });
  } catch (err) {
    logger.warn('[commerceWrites] recordCommerceDebit failed (local Mongo authoritative)', {
      error: err?.message,
    });
  }
}

module.exports = { commerceWritesEnabled, recordCommerceDebit };
