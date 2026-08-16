const { Balance } = require('~/db/models');
const { resolveTenantBearer } = require('@hanzochat/api');

/** How long to wait on cloud before falling back to the local record. */
const READ_TIMEOUT_MS = 5000;

/**
 * The balance a user SEES, read AS THAT USER.
 *
 * cloud answers `/v1/billing/balance` from the caller's own validated principal,
 * by the same rule its spend gate uses (`apps/billing/balance.go` subjectFor →
 * `principal.Subject`), so the number shown and the number that admits or refuses
 * a request cannot drift apart.
 *
 * Reading it with chat's shared service token asked as a MACHINE instead, and a
 * machine resolves to the org's POOLED account. In the signup org — where every
 * self-serve signup lands — that pool is the platform's own, so each new member
 * was shown a six-figure balance while the gateway refused their first message at
 * zero. Their own read answers $0 on their own account, which is the truth.
 *
 * There is no subject to compute here, and that is the point: who pays is cloud's
 * rule and cloud's alone. chat forwards the credential the caller already
 * presented and renders the answer.
 *
 * Commerce cents → tokenCredits at ×10,000 (1¢ = 10,000; 1,000,000 = $1) keeps
 * the client contract unchanged.
 *
 * Display is NOT the money path: the gate fails closed, this read falls through
 * to the local record instead — a stale number beats a blocked page.
 */
async function balanceController(req, res) {
  const bearer = resolveTenantBearer(req);
  const cloudUrl = (process.env.HANZO_CLOUD_URL || '').replace(/\/+$/, '');

  if (bearer && cloudUrl) {
    try {
      const resp = await fetch(`${cloudUrl}/v1/billing/balance?currency=usd`, {
        headers: { Authorization: `Bearer ${bearer}` },
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
      });
      if (resp.ok) {
        const { available } = await resp.json();
        return res.status(200).json({ tokenCredits: Math.round((available || 0) * 10000) });
      }
    } catch (err) {
      // cloud unreachable — fall through to the local record.
    }
  }

  const balanceData = await Balance.findOne(
    { user: req.user.id },
    '-_id tokenCredits autoRefillEnabled refillIntervalValue refillIntervalUnit lastRefill refillAmount expiresAt creditsGrantedAt creditType tierId',
  ).lean();

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  // If auto-refill is not enabled, remove auto-refill related fields from the response
  if (!balanceData.autoRefillEnabled) {
    delete balanceData.refillIntervalValue;
    delete balanceData.refillIntervalUnit;
    delete balanceData.lastRefill;
    delete balanceData.refillAmount;
  }

  // If credits have expired, report zero balance
  if (balanceData.expiresAt && new Date(balanceData.expiresAt) < new Date()) {
    balanceData.tokenCredits = 0;
  }

  res.status(200).json(balanceData);
}

module.exports = balanceController;
