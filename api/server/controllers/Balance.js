const { Balance } = require('~/db/models');
const {
  getCommerceClient,
  getIamToken,
  getBillingOrg,
} = require('~/server/services/CommerceClient');

async function balanceController(req, res) {
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

  // Enrich with the authoritative Commerce balance (the real money, in cents),
  // read under the user's own IAM identity. Fail-open for DISPLAY only — this is
  // a UI read, not the spend gate (the gate is balanceMethods.checkBalance, which
  // fails closed). The $5 signup credit lives here and in billing.hanzo.ai.
  const commerceClient = getCommerceClient();
  const token = getIamToken(req);
  if (commerceClient && token) {
    try {
      const balance = await commerceClient.getMyBalance(token, getBillingOrg(req));
      balanceData.commerceAvailableCents = balance.available;
      balanceData.commerceBalanceCents = balance.balance;
    } catch {
      // Fail-open: return local data without Commerce enrichment (display only).
    }
  }

  res.status(200).json(balanceData);
}

module.exports = balanceController;
