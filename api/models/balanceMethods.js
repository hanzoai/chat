const { logger } = require('@librechat/data-schemas');
const { ViolationTypes } = require('librechat-data-provider');
const { createAutoRefillTransaction } = require('./Transaction');
const { logViolation } = require('~/cache');
const { getMultiplier } = require('./tx');
const { Balance } = require('~/db/models');
const {
  getCommerceClient,
  getIamToken,
  getBillingOrg,
} = require('~/server/services/CommerceClient');

/**
 * Default minimum balance in tokenCredits.
 * Overridden by HANZO_MIN_BALANCE env var (in USD, converted to tokenCredits).
 * 1,000,000 tokenCredits = $1 USD.
 */
function getMinBalance() {
  const envVal = process.env.HANZO_MIN_BALANCE;
  if (envVal != null && envVal !== '') {
    const usd = parseFloat(envVal);
    if (!isNaN(usd) && usd > 0) {
      return Math.round(usd * 1000000);
    }
  }
  return 0;
}

/**
 * Minimum balance in COMMERCE cents (commerce balances are in cents).
 * Derived from HANZO_MIN_BALANCE (USD). Used by the commerce-first money gate.
 */
function getMinBalanceCents() {
  const envVal = process.env.HANZO_MIN_BALANCE;
  if (envVal != null && envVal !== '') {
    const usd = parseFloat(envVal);
    if (!isNaN(usd) && usd > 0) {
      return Math.round(usd * 100);
    }
  }
  return 0;
}

function isInvalidDate(date) {
  return isNaN(date);
}

/**
 * Calculates token cost and decides whether the request may proceed.
 *
 * MONEY GATE — Commerce-first and FAIL CLOSED (this is the money path; better to
 * block a user than bleed). When Commerce is configured and we can identify the
 * user's billing org (their IAM `organization`), Commerce is AUTHORITATIVE:
 *   - sufficient org balance (>= HANZO_MIN_BALANCE) → allowed (decisive; we do
 *     NOT fall through to the local tokenCredits gate, so startBalance:0 never
 *     false-blocks a Commerce-funded user);
 *   - insufficient / unreachable / no billing identity → BLOCKED.
 * The cloud gateway separately debits the user's own hk- key against this same
 * org, so this check is the pre-flight that yields a clean "claim credit" UX
 * instead of a raw gateway 402.
 *
 * When Commerce is not configured (or no billing identity), falls back to the
 * legacy local tokenCredits gate.
 */
const checkBalanceRecord = async function ({
  req,
  user,
  model,
  endpoint,
  valueKey,
  tokenType,
  amount,
  endpointTokenConfig,
}) {
  const multiplier = getMultiplier({ valueKey, tokenType, model, endpoint, endpointTokenConfig });
  const tokenCost = amount * multiplier;

  const commerceClient = getCommerceClient();
  const token = getIamToken(req);
  const billingOrg = getBillingOrg(req);

  // IAM-native money gate — Commerce is authoritative and the path FAILS CLOSED.
  // We confirm a sufficient balance against the user's OWN org (commerce derives
  // the tenant from their IAM JWT). Anything we cannot positively confirm —
  // missing IAM identity, commerce unreachable, balance below minimum — REFUSES
  // the call. We never fall through to a permissive local gate here, so unmetered
  // AI can't leak. A funded user always passes; only no-credit/unconfirmable is
  // blocked.
  if (commerceClient && (token || billingOrg)) {
    // No IAM token ⇒ we cannot prove who the tenant is or read their balance.
    // Block (clean "sign in to continue" UX) rather than serve unmetered tokens.
    if (!token) {
      logger.warn('[Balance.check] No IAM token on request — blocking (fail-closed)', {
        user,
        billingOrg,
      });
      return { canSpend: false, balance: 0, tokenCost, reason: 'no_billing_identity' };
    }

    const minCents = Math.max(getMinBalanceCents(), 1);

    let balance;
    try {
      balance = await commerceClient.getMyBalance(token, billingOrg);
    } catch (err) {
      logger.error('[Balance.check] Commerce unreachable — blocking (fail-closed)', {
        user,
        billingOrg,
        error: err.message,
      });
      return { canSpend: false, balance: 0, tokenCost, reason: 'commerce_unavailable' };
    }

    if ((balance.available || 0) >= minCents) {
      // Decisive: Commerce confirms funds → allow. Do not consult local credits.
      return { canSpend: true, balance: balance.available, tokenCost };
    }

    // Below minimum. Self-heal: grant the idempotent $5 welcome credit once and
    // re-read. This funds brand-new accounts (and any pre-existing user who was
    // created before this shipped) on their first message WITHOUT letting a user
    // who already spent their credit top themselves up — commerce dedupes the
    // grant by tag, so a returning empty wallet stays empty and stays blocked.
    await commerceClient.grantWelcome(token);
    try {
      balance = await commerceClient.getMyBalance(token, billingOrg);
    } catch (err) {
      logger.error('[Balance.check] Commerce re-read failed after grant — blocking', {
        user,
        billingOrg,
        error: err.message,
      });
      return { canSpend: false, balance: 0, tokenCost, reason: 'commerce_unavailable' };
    }

    if ((balance.available || 0) >= minCents) {
      return { canSpend: true, balance: balance.available, tokenCost };
    }

    logger.debug('[Balance.check] Commerce balance insufficient', {
      user,
      billingOrg,
      available: balance.available,
      minCents,
    });
    return {
      canSpend: false,
      balance: balance.available || 0,
      tokenCost,
      reason: 'commerce_insufficient',
    };
  }

  // ── Legacy local-credit gate (Commerce not configured / no billing identity) ──
  let record = await Balance.findOne({ user }).lean();
  if (!record) {
    logger.debug('[Balance.check] No balance record found for user', { user });
    return {
      canSpend: false,
      balance: 0,
      tokenCost,
    };
  }

  let balance = record.tokenCredits;

  // Check if credits have expired
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    logger.debug('[Balance.check] Credits expired', { user, expiresAt: record.expiresAt });
    balance = 0;
  }

  // Enforce minimum balance threshold
  const minBalance = getMinBalance();
  if (minBalance > 0 && balance < minBalance) {
    logger.debug('[Balance.check] Below minimum balance', { user, balance, minBalance });
    return { canSpend: false, balance, tokenCost };
  }

  logger.debug('[Balance.check] Initial state', {
    user,
    model,
    endpoint,
    valueKey,
    tokenType,
    amount,
    balance,
    multiplier,
    endpointTokenConfig: !!endpointTokenConfig,
  });

  // Only perform auto-refill if spending would bring the balance to 0 or below
  if (balance - tokenCost <= 0 && record.autoRefillEnabled && record.refillAmount > 0) {
    const lastRefillDate = new Date(record.lastRefill);
    const now = new Date();
    if (
      isInvalidDate(lastRefillDate) ||
      now >=
        addIntervalToDate(lastRefillDate, record.refillIntervalValue, record.refillIntervalUnit)
    ) {
      try {
        /** @type {{ rate: number, user: string, balance: number, transaction: import('@librechat/data-schemas').ITransaction}} */
        const result = await createAutoRefillTransaction({
          user: user,
          tokenType: 'credits',
          context: 'autoRefill',
          rawAmount: record.refillAmount,
        });
        balance = result.balance;
      } catch (error) {
        logger.error('[Balance.check] Failed to record transaction for auto-refill', error);
      }
    }
  }

  logger.debug('[Balance.check] Token cost', { tokenCost });
  return { canSpend: balance >= tokenCost, balance, tokenCost };
};

/**
 * Adds a time interval to a given date.
 * @param {Date} date - The starting date.
 * @param {number} value - The numeric value of the interval.
 * @param {'seconds'|'minutes'|'hours'|'days'|'weeks'|'months'} unit - The unit of time.
 * @returns {Date} A new Date representing the starting date plus the interval.
 */
const addIntervalToDate = (date, value, unit) => {
  const result = new Date(date);
  switch (unit) {
    case 'seconds':
      result.setSeconds(result.getSeconds() + value);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + value);
      break;
    case 'hours':
      result.setHours(result.getHours() + value);
      break;
    case 'days':
      result.setDate(result.getDate() + value);
      break;
    case 'weeks':
      result.setDate(result.getDate() + value * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + value);
      break;
    default:
      break;
  }
  return result;
};

/**
 * Checks the balance for a user and determines if they can spend a certain amount.
 * If the user cannot spend the amount, it logs a violation and denies the request.
 *
 * @async
 * @function
 * @param {Object} params - The function parameters.
 * @param {ServerRequest} params.req - The Express request object.
 * @param {Express.Response} params.res - The Express response object.
 * @param {Object} params.txData - The transaction data.
 * @param {string} params.txData.user - The user ID or identifier.
 * @param {('prompt' | 'completion')} params.txData.tokenType - The type of token.
 * @param {number} params.txData.amount - The amount of tokens.
 * @param {string} params.txData.model - The model name or identifier.
 * @param {string} [params.txData.endpointTokenConfig] - The token configuration for the endpoint.
 * @returns {Promise<boolean>} Throws error if the user cannot spend the amount.
 * @throws {Error} Throws an error if there's an issue with the balance check.
 */
const checkBalance = async ({ req, res, txData }) => {
  const result = await checkBalanceRecord({ ...txData, req });
  if (result.canSpend) {
    return true;
  }

  const type = ViolationTypes.TOKEN_BALANCE;
  const errorMessage = {
    type,
    balance: result.balance,
    tokenCost: result.tokenCost,
    promptTokens: txData.amount,
  };

  // Pass through Commerce-specific error context
  if (result.reason) {
    errorMessage.reason = result.reason;
  }
  if (result.tier) {
    errorMessage.tier = result.tier;
  }
  if (result.allowedModels) {
    errorMessage.allowedModels = result.allowedModels;
  }

  if (txData.generations && txData.generations.length > 0) {
    errorMessage.generations = txData.generations;
  }

  await logViolation(req, res, type, errorMessage, 0);
  throw new Error(JSON.stringify(errorMessage));
};

module.exports = {
  checkBalance,
};
