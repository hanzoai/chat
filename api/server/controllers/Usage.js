const mongoose = require('mongoose');
const { Transaction } = require('~/db/models');
const { getCommerceClient } = require('~/server/services/CommerceClient');

/** 1e6 tokenCredits == $1 USD (mirrors client creditsToUsd). */
const CREDITS_PER_USD = 1_000_000;
/** Only prompt/completion transactions represent AI usage (spend); `credits` are deposits. */
const SPEND_TYPES = ['prompt', 'completion'];

/** One accumulator over abs(rawAmount) tokens, abs(tokenValue) credits, and request count. */
const spendGroup = (id) => ({
  $group: {
    _id: id,
    tokens: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
    credits: { $sum: { $abs: { $ifNull: ['$tokenValue', 0] } } },
    requests: { $sum: 1 },
  },
});

/** Shape a facet bucket into the @hanzo/usage window schema (UsageTotals + ProviderCostSnapshot). */
function toWindow(bucket) {
  const row = (bucket && bucket[0]) || { tokens: 0, credits: 0, requests: 0 };
  return {
    totals: { tokens: row.tokens, requests: row.requests },
    providerCost: { used: row.credits / CREDITS_PER_USD, currencyCode: 'USD' },
  };
}

/**
 * Unified per-user AI usage. Aggregates this user's spend (prompt + completion
 * Transactions) over today / 7d / 30d plus a per-model breakdown, enriched with
 * the org tier from Commerce. Response mirrors @hanzo/usage's UsageSnapshot
 * shape (providerId 'hanzo', totals, providerCost) so it is one wire format
 * across Hanzo products.
 */
async function usageController(req, res) {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [facet] = await Transaction.aggregate([
    { $match: { user: userId, tokenType: { $in: SPEND_TYPES }, createdAt: { $gte: since30 } } },
    {
      $facet: {
        today: [{ $match: { createdAt: { $gte: startOfToday } } }, spendGroup(null)],
        d7: [{ $match: { createdAt: { $gte: since7 } } }, spendGroup(null)],
        d30: [spendGroup(null)],
        models: [spendGroup('$model'), { $sort: { credits: -1 } }, { $limit: 20 }],
      },
    },
  ]);

  const models = (facet?.models ?? [])
    .filter((m) => m._id)
    .map((m) => ({
      model: m._id,
      tokens: m.tokens,
      requests: m.requests,
      cost: m.credits / CREDITS_PER_USD,
    }));

  const payload = {
    providerId: 'hanzo',
    currencyCode: 'USD',
    tier: 'Free',
    windows: {
      today: toWindow(facet?.today),
      '7d': toWindow(facet?.d7),
      '30d': toWindow(facet?.d30),
    },
    models,
    updatedAt: now.toISOString(),
  };

  // Enrich with Commerce tier (fail-open: usage is still authoritative locally).
  const commerceClient = getCommerceClient();
  if (commerceClient) {
    try {
      const tier = await commerceClient.getTierConfig(req.user.id);
      if (tier) {
        payload.tier = tier.displayName || tier.name || payload.tier;
      }
    } catch {
      // ignore — return local usage without tier enrichment
    }
  }

  res.status(200).json(payload);
}

module.exports = usageController;
