import React, { useMemo } from 'react';
import { ExternalLink, CreditCard, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';
import { balanceOn } from '@hanzochat/data-provider';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import TokenCreditsItem from './TokenCreditsItem';
import AutoRefillSettings from './AutoRefillSettings';

const BILLING_URL = 'https://billing.hanzo.ai';

function creditsToUsd(credits: number): number {
  return credits / 1_000_000;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact token count formatter */
function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Progress bar component */
function UsageBar({
  label,
  sublabel,
  current,
  limit,
  color = 'bg-blue-500',
}: {
  label: string;
  sublabel?: string;
  current: number;
  limit: number;
  color?: string;
}) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isHigh = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {sublabel && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>
          )}
        </div>
        <span
          className={`text-xs font-medium ${
            isFull
              ? 'text-red-500 dark:text-red-400'
              : isHigh
                ? 'text-yellow-500 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {Math.round(pct)}% used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isFull ? 'bg-red-500' : isHigh ? 'bg-yellow-500' : color
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Balance() {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && balanceOn(startupConfig),
  });
  const balanceData = balanceQuery.data;

  /**
   * A read that FAILED is not a balance of zero, and it must not render as one.
   *
   * Every field below defaults to 0 out of `balanceData ?? {}`, so a 401/403 or a
   * dropped request produced a confident "$0.00 — 0 tokens remaining" under
   * "Available Balance": the same pixels a genuinely empty account shows. That is
   * the one number a customer checks before topping up, and it was lying to
   * exactly the people whose credential had lapsed. The initial fetch read the
   * same way, so a funded account flashed broke on every open.
   *
   * `tokenCredits === 0` from a SUCCESSFUL read is still a real zero and still
   * renders $0.00. Only the absence of an answer is drawn as absent.
   */
  const balanceUnknown = balanceData == null;

  const {
    tokenCredits = 0,
    autoRefillEnabled = false,
    lastRefill,
    refillAmount,
    refillIntervalUnit,
    refillIntervalValue,
    expiresAt,
    tierId,
    trialCredits,
    paidCredits,
    allowedModels,
  } = balanceData ?? {};

  const hasValidRefillSettings =
    lastRefill !== undefined &&
    refillAmount !== undefined &&
    refillIntervalUnit !== undefined &&
    refillIntervalValue !== undefined;

  // Calculate usage metrics
  const usdBalance = creditsToUsd(tokenCredits);
  const trialUsd = trialCredits != null ? trialCredits / 100 : 0;
  const paidUsd = paidCredits != null ? paidCredits / 100 : 0;
  const totalCreditsUsd = trialUsd + paidUsd;

  // Session usage estimate (from start of current period)
  const sessionUsed = useMemo(() => {
    if (!totalCreditsUsd || totalCreditsUsd <= 0) return 0;
    return Math.max(0, totalCreditsUsd - usdBalance);
  }, [totalCreditsUsd, usdBalance]);

  const tierLabel = tierId && tierId !== 'unknown' ? tierId : 'Free';

  return (
    <div className="flex flex-col gap-5 p-4 text-sm text-text-primary">
      {/* Balance header card */}
      <div className="rounded-xl border border-border-medium bg-surface-secondary p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-text-secondary">
              Available Balance
            </p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {balanceUnknown ? '—' : formatUsd(usdBalance)}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-1">
            <Zap className="h-3 w-3 text-text-secondary" />
            <span className="text-[10px] font-semibold tracking-wider text-text-secondary">
              {tierLabel}
            </span>
          </div>
        </div>

        {/* Quick token count */}
        <p className="mt-1 text-xs text-text-secondary">
          {balanceUnknown
            ? balanceQuery.isError
              ? 'Balance unavailable — could not reach your account'
              : 'Checking balance…'
            : `${formatTokens(tokenCredits)} tokens remaining`}
        </p>
      </div>

      {/* Session / period usage bars. Omitted while the balance is unknown: a
          usage breakdown derived from a read that never landed is fiction, and
          drawing an empty bar is the same lie as "$0.00" in a bigger font. */}
      {!balanceUnknown && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-text-secondary">
            <TrendingUp className="h-3.5 w-3.5" />
            Usage
          </h3>

          {/* Current session */}
          <UsageBar
            label="Current session"
            sublabel="Starts when a message is sent"
            current={sessionUsed}
            limit={Math.max(totalCreditsUsd, usdBalance, 10)}
            color="bg-blue-500"
          />

          {/* Credit breakdown bars */}
          {trialUsd > 0 && (
            <UsageBar
              label="Trial credit"
              sublabel={formatUsd(trialUsd)}
              current={Math.max(0, trialUsd - Math.min(sessionUsed, trialUsd))}
              limit={trialUsd}
              color="bg-emerald-500"
            />
          )}

          {paidUsd > 0 && (
            <UsageBar
              label="Paid credit"
              sublabel={formatUsd(paidUsd)}
              current={paidUsd}
              limit={paidUsd}
              color="bg-violet-500"
            />
          )}
        </div>
      )}

      {/* Token credits detail */}
      {!balanceUnknown && <TokenCreditsItem tokenCredits={tokenCredits} expiresAt={expiresAt} />}

      {/* Model access */}
      {allowedModels && allowedModels.length > 0 && allowedModels[0] !== '*' && (
        <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-text-secondary">
            Available Models
          </p>
          <div className="flex flex-wrap gap-1">
            {allowedModels.slice(0, 8).map((model) => (
              <span
                key={model}
                className="inline-flex items-center rounded-md bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
              >
                {model}
              </span>
            ))}
            {allowedModels.length > 8 && (
              <span className="text-[11px] text-text-secondary">
                +{allowedModels.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Auto-refill */}
      {autoRefillEnabled ? (
        hasValidRefillSettings ? (
          <AutoRefillSettings
            lastRefill={lastRefill}
            refillAmount={refillAmount}
            refillIntervalUnit={refillIntervalUnit}
            refillIntervalValue={refillIntervalValue}
          />
        ) : (
          <div className="text-sm text-red-600">
            {localize('com_nav_balance_auto_refill_error')}
          </div>
        )
      ) : (
        <div className="text-xs text-text-secondary">
          {localize('com_nav_balance_auto_refill_disabled')}
        </div>
      )}

      {/* Billing actions */}
      <div className="space-y-2 border-t border-border-light pt-4">
        <a
          href={BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 active:scale-[0.98]"
        >
          <CreditCard className="h-4 w-4" />
          Add Funds
          <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
        </a>

        <a
          href={BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4 text-text-secondary" />
          Manage Billing & Credits
        </a>
      </div>
    </div>
  );
}

export default React.memo(Balance);
