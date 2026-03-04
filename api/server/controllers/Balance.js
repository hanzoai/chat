const { Balance } = require('~/db/models');
const { getCommerceClient } = require('~/server/services/CommerceClient');

async function balanceController(req, res) {
  const balanceData = await Balance.findOne(
    { user: req.user.id },
    '-_id tokenCredits autoRefillEnabled refillIntervalValue refillIntervalUnit lastRefill refillAmount expiresAt creditsGrantedAt creditType tierId commerceUserId',
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

  // Enrich with Commerce tier and credit breakdown if available
  const commerceClient = getCommerceClient();
  if (commerceClient && balanceData.commerceUserId) {
    try {
      const [tierConfig, breakdown] = await Promise.all([
        commerceClient.getTierConfig(balanceData.commerceUserId),
        commerceClient.getCreditBreakdown(balanceData.commerceUserId),
      ]);

      if (tierConfig) {
        balanceData.tierId = tierConfig.name || balanceData.tierId;
        balanceData.allowedModels = tierConfig.allowedModels || ['*'];
      }

      if (breakdown) {
        balanceData.trialCredits = breakdown.trial?.cents || 0;
        balanceData.paidCredits = breakdown.paid?.cents || 0;
      }
    } catch (err) {
      // Fail-open: return local data without Commerce enrichment
    }
  }

  res.status(200).json(balanceData);
}

module.exports = balanceController;
