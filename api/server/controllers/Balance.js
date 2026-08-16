const { Balance } = require('~/db/models');
const { getCommerceClient, billingSubject } = require('~/server/services/CommerceClient');

/**
 * The balance a user SEES — Commerce-first, and read at the account that PAYS.
 *
 * The subject is `billingSubject`: the same account cloud debits, which in the
 * signup org is the member's own and everywhere else is the tenant's pool.
 * Reading the bare org instead reported the pool to every member of it, so a
 * stranger who had just signed up was shown the platform's own balance — a
 * six-figure number belonging to somebody else, on an account that could not
 * spend a cent of it.
 *
 * The local record behind it is the legacy tokenCredits ledger, which production
 * does not fund (balance.enabled=false). Commerce cents → tokenCredits at
 * ×10,000 (1¢ = 10,000; 1,000,000 = $1) keeps the client contract unchanged.
 *
 * Display is NOT the money path: the gate fails closed, this read falls
 * through to the local record instead — a stale number beats a blocked page.
 * Tier and credit breakdown are keyed on the SAME subject, so all three
 * describe one account.
 */
async function balanceController(req, res) {
  const commerceClient = getCommerceClient();
  const subject = billingSubject(req.user);

  if (commerceClient && subject) {
    try {
      const { available } = await commerceClient.checkBalance(subject);
      const balanceData = { tokenCredits: Math.round((available || 0) * 10000) };

      try {
        const [tierConfig, breakdown] = await Promise.all([
          commerceClient.getTierConfig(subject),
          commerceClient.getCreditBreakdown(subject),
        ]);
        if (tierConfig) {
          balanceData.tierId = tierConfig.name;
          balanceData.allowedModels = tierConfig.allowedModels || ['*'];
        }
        if (breakdown) {
          balanceData.trialCredits = breakdown.trial?.cents || 0;
          balanceData.paidCredits = breakdown.paid?.cents || 0;
        }
      } catch (err) {
        // Fail-open: the balance stands on its own without enrichment.
      }

      return res.status(200).json(balanceData);
    } catch (err) {
      // Commerce unreachable — fall through to the local record.
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
