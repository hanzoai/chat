const { Balance } = require('~/db/models');
const { getCommerceClient } = require('~/server/services/CommerceClient');

/**
 * The balance a user SEES — Commerce-first, exactly like the money gate
 * (balanceMethods.checkBalanceRecord): when Commerce is configured and the
 * user has a billing org, the org's Commerce balance IS the balance. Cloud
 * debits that account, so it is the only truthful number; the local Mongo
 * record is the legacy tokenCredits ledger, which production does not fund
 * (balance.enabled=false), and reading it first showed a signed-in, funded
 * user nothing at all. Commerce cents → tokenCredits at ×10,000 (1¢ =
 * 10,000; 1,000,000 = $1) keeps the client contract unchanged.
 *
 * Display is NOT the money path: the gate fails closed, this read falls
 * through to the local record instead — a stale number beats a blocked page.
 * Tier and credit breakdown are garnish keyed on the SAME subject as the
 * gate (the org), never on `commerceUserId`, which nothing ever wrote.
 */
async function balanceController(req, res) {
  const commerceClient = getCommerceClient();
  const subject = (req.user?.organization ?? '').toString().trim();

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
