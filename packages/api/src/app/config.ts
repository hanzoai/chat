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

  if (!appConfig) {
    return envConfig;
  }
  return { ...envConfig, ...(appConfig?.['balance'] ?? {}) };
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
