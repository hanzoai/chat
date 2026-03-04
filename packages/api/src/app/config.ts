import { logger } from '@librechat/data-schemas';
import {
  EModelEndpoint,
  removeNullishValues,
  normalizeEndpointName,
} from 'librechat-data-provider';
import type { TCustomConfig, TEndpoint, TTransactionsConfig } from 'librechat-data-provider';
import type { AppConfig } from '@librechat/data-schemas';
import { isEnabled } from '~/utils';

/**
 * Retrieves the balance configuration object.
 * Supports legacy env vars (CHECK_BALANCE, START_BALANCE) and
 * Hanzo billing env vars (HANZO_BILLING_ENABLED, HANZO_SIGNUP_CREDIT, etc.).
 */
export function getBalanceConfig(appConfig?: AppConfig): Partial<TCustomConfig['balance']> | null {
  const isLegacyEnabled = isEnabled(process.env.CHECK_BALANCE);
  const isHanzoEnabled = isEnabled(process.env.HANZO_BILLING_ENABLED);
  const startBalance = process.env.START_BALANCE;

  // Hanzo billing env vars: HANZO_SIGNUP_CREDIT is in USD, convert to tokenCredits
  const hanzoSignupCredit = process.env.HANZO_SIGNUP_CREDIT;
  const hanzoExpiryDays = process.env.HANZO_SIGNUP_CREDIT_EXPIRY_DAYS;
  const hanzoMinBalance = process.env.HANZO_MIN_BALANCE;

  const envConfig: Partial<TCustomConfig['balance']> = removeNullishValues({
    enabled: isLegacyEnabled || isHanzoEnabled,
    startBalance: startBalance != null && startBalance ? parseInt(startBalance, 10) : undefined,
  });

  // Apply Hanzo env var overrides (USD to tokenCredits conversion)
  if (hanzoSignupCredit != null && hanzoSignupCredit !== '') {
    const usd = parseFloat(hanzoSignupCredit);
    if (!isNaN(usd)) {
      envConfig.startBalance = Math.round(usd * 1000000);
    }
  }
  if (hanzoExpiryDays != null && hanzoExpiryDays !== '') {
    const days = parseInt(hanzoExpiryDays, 10);
    if (!isNaN(days)) {
      envConfig.creditExpiryDays = days;
    }
  }
  if (hanzoMinBalance != null && hanzoMinBalance !== '') {
    const usd = parseFloat(hanzoMinBalance);
    if (!isNaN(usd)) {
      envConfig.minBalance = Math.round(usd * 1000000);
    }
  }

  // Commerce integration settings
  const commerceUrl = process.env.COMMERCE_API_URL || process.env.COMMERCE_ENDPOINT;
  if (commerceUrl) {
    envConfig.commerce = {
      enabled: true,
      endpoint: commerceUrl,
      token: process.env.COMMERCE_API_TOKEN || process.env.COMMERCE_TOKEN || '',
    };
  }

  // Trial credit config (white-label overrides)
  const trialUsd = process.env.HANZO_TRIAL_CREDIT_USD;
  const trialExpiry = process.env.HANZO_TRIAL_EXPIRY_DAYS;
  const trialModels = process.env.HANZO_TRIAL_ALLOWED_MODELS;
  const trialRateLimit = process.env.HANZO_TRIAL_RATE_LIMIT;

  if (trialUsd || trialExpiry || trialModels || trialRateLimit) {
    envConfig.trial = {
      ...(trialUsd ? { amountUsd: parseFloat(trialUsd) } : {}),
      ...(trialExpiry ? { expiryDays: parseInt(trialExpiry, 10) } : {}),
      ...(trialModels ? { allowedModels: trialModels.split(',').map((m: string) => m.trim()) } : {}),
      ...(trialRateLimit ? { rateLimit: parseInt(trialRateLimit, 10) } : {}),
    };
  }

  // Paid credit config
  const paidModels = process.env.HANZO_PAID_ALLOWED_MODELS;
  if (paidModels) {
    envConfig.paid = {
      allowedModels: paidModels.split(',').map((m: string) => m.trim()),
    };
  }

  if (!appConfig) {
    return envConfig;
  }

  const appBalance = appConfig?.['balance'] ?? {};
  return {
    ...envConfig,
    ...appBalance,
    // Deep merge commerce/trial/paid from appConfig if present
    commerce: { ...envConfig.commerce, ...appBalance.commerce },
    trial: { ...envConfig.trial, ...appBalance.trial },
    paid: { ...envConfig.paid, ...appBalance.paid },
  };
}

/**
 * Retrieves the transactions configuration object
 * */
export function getTransactionsConfig(appConfig?: AppConfig): Partial<TTransactionsConfig> {
  const defaultConfig: TTransactionsConfig = { enabled: true };

  if (!appConfig) {
    return defaultConfig;
  }

  const transactionsConfig = appConfig?.['transactions'] ?? defaultConfig;
  const balanceConfig = getBalanceConfig(appConfig);

  // If balance is enabled but transactions are disabled, force transactions to be enabled
  // and log a warning
  if (balanceConfig?.enabled && !transactionsConfig.enabled) {
    logger.warn(
      'Configuration warning: transactions.enabled=false is incompatible with balance.enabled=true. ' +
        'Transactions will be enabled to ensure balance tracking works correctly.',
    );
    return { ...transactionsConfig, enabled: true };
  }

  return transactionsConfig;
}

export const getCustomEndpointConfig = ({
  endpoint,
  appConfig,
}: {
  endpoint: string | EModelEndpoint;
  appConfig?: AppConfig;
}): Partial<TEndpoint> | undefined => {
  if (!appConfig) {
    throw new Error(`Config not found for the ${endpoint} custom endpoint.`);
  }

  const customEndpoints = appConfig.endpoints?.[EModelEndpoint.custom] ?? [];
  return customEndpoints.find(
    (endpointConfig) => normalizeEndpointName(endpointConfig.name) === normalizeEndpointName(endpoint),
  );
};

export function hasCustomUserVars(appConfig?: AppConfig): boolean {
  const mcpServers = appConfig?.mcpConfig;
  return Object.values(mcpServers ?? {}).some((server) => server?.customUserVars);
}
