const { logger } = require('@librechat/data-schemas');
const { ViolationTypes } = require('librechat-data-provider');
const { createAutoRefillTransaction } = require('./Transaction');
const { logViolation } = require('~/cache');
const { getMultiplier } = require('./tx');
const { Balance } = require('~/db/models');
const { getCommerceClient } = require('~/server/services/CommerceClient');

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

function isInvalidDate(date) {
  return isNaN(date);
}

/**
 * Check if a specific model is allowed for the user's billing tier.
 * Fails open: if Commerce is not configured or unreachable, all models allowed.
 *
 * @param {string} userId - MongoDB user ID
 * @param {string} model - Model identifier
 * @returns {Promise<{allowed: boolean, tier: string, allowedModels: string[]}>}
 */
const checkModelAccess = async function (userId, model) {
  const commerceClient = getCommerceClient();
  if (!commerceClient) {
    return { allowed: true, tier: 'unknown', allowedModels: ['*'] };
  }

  // Look up the Commerce user ID from the balance record
  const record = await Balance.findOne({ user: userId }, 'commerceUserId').lean();
  if (!record?.commerceUserId) {
    return { allowed: true, tier: 'unknown', allowedModels: ['*'] };
  }

  return commerceClient.isModelAllowed(record.commerceUserId, model);
};

/**
 * Simple check method that calculates token cost and returns balance info.
 * Integrates with Commerce balance gate when configured (fail-open).
 */
const checkBalanceRecord = async function ({
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

  // Retrieve the balance record
  let record = await Balance.findOne({ user }).lean();
  if (!record) {
    logger.debug('[Balance.check] No balance record found for user', { user });
    return {
      canSpend: false,
      balance: 0,
      tokenCost,
    };
  }

  // Commerce balance gate: if configured, check Commerce first (fail-open)
  const commerceClient = getCommerceClient();
  if (commerceClient && record.commerceUserId) {
    try {
      const commerceBalance = await commerceClient.checkBalance(record.commerceUserId);
      if (!commerceBalance.sufficient) {
        logger.debug('[Balance.check] Commerce balance insufficient', {
          user,
          commerceUserId: record.commerceUserId,
          available: commerceBalance.available,
        });
        return { canSpend: false, balance: 0, tokenCost, reason: 'commerce_insufficient' };
      }

      // Check model access via Commerce tier
      if (model) {
        const modelAccess = await commerceClient.isModelAllowed(record.commerceUserId, model);
        if (!modelAccess.allowed) {
          logger.debug('[Balance.check] Model not allowed for tier', {
            user,
            model,
            tier: modelAccess.tier,
            allowedModels: modelAccess.allowedModels,
          });
          return {
            canSpend: false,
            balance: record.tokenCredits,
            tokenCost,
            reason: 'model_not_allowed',
            tier: modelAccess.tier,
            allowedModels: modelAccess.allowedModels,
          };
        }
      }
    } catch (err) {
      // Fail-open: Commerce error → fall through to local check
      logger.warn('[Balance.check] Commerce check failed, falling back to local', { error: err.message });
    }
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
  const result = await checkBalanceRecord(txData);
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
  checkModelAccess,
};
