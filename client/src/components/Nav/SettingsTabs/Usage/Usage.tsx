import React from 'react';
import { useAtom } from 'jotai';
import { Switch } from '@hanzochat/client';
import { balanceOn } from '@hanzochat/data-provider';
import { ExternalLink, TrendingUp, Zap, ArrowUpRight, BarChart3, Sparkles } from 'lucide-react';
import { useGetStartupConfig, useGetUserUsage, useGetRoutingDefaults } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import { resolveSmartRouting } from '~/utils';
import CloudUsage from './CloudUsage';
import store from '~/store';

const CONSOLE_URL = 'https://console.hanzo.ai/ai-accounts';
const ROUTING_DOCS_URL = 'https://docs.hanzo.ai/docs/chat';

/** Smart-routing toggle: default new Hanzo chats to the gateway `auto` model. */
function SmartRoutingToggle() {
  const localize = useLocalize();
  // The stored value is the user OVERRIDE (null === follow org default).
  const [smartRoutingPref, setSmartRouting] = useAtom<boolean | null>(store.smartRouting);
  // Server-driven org defaults (fail-soft: absent === today's local-only behavior).
  const { data: routingDefaults } = useGetRoutingDefaults();
  const available = routingDefaults?.available === true;
  const orgDefault = available ? (routingDefaults?.default_session_routing ?? null) : null;
  const autoRoutingActive = available ? routingDefaults?.auto_routing_active !== false : true;
  const { enabled, toggleDisabled } = resolveSmartRouting(
    smartRoutingPref,
    orgDefault,
    autoRoutingActive,
  );
  const labelId = 'smartRouting-label';

  return (
    <div className="rounded-xl border border-border-medium bg-surface-secondary p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-secondary" />
          <div id={labelId} className="text-sm font-medium text-text-primary">
            {localize('com_nav_smart_routing')}
          </div>
        </div>
        <Switch
          id="smartRouting"
          checked={enabled}
          disabled={toggleDisabled}
          onCheckedChange={setSmartRouting}
          data-testid="smartRouting"
          aria-labelledby={labelId}
        />
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        {toggleDisabled
          ? localize('com_nav_smart_routing_org_disabled')
          : localize('com_nav_smart_routing_desc')}{' '}
        {!toggleDisabled && (
          <a
            href={ROUTING_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary underline hover:opacity-80"
          >
            {localize('com_nav_smart_routing_learn_more')}
          </a>
        )}
      </p>
    </div>
  );
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

/** Progress bar component (shared idiom with the Balance tab). */
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {sublabel && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>
          )}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Usage() {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  const usageQuery = useGetUserUsage({
    enabled: !!isAuthenticated && balanceOn(startupConfig),
  });
  const usage = usageQuery.data;

  const windows = usage?.windows;
  const today = windows?.today;
  const week = windows?.['7d'];
  const month = windows?.['30d'];
  const models = usage?.models ?? [];

  const monthTokens = month?.totals.tokens ?? 0;
  const monthSpend = month?.providerCost.used ?? 0;
  const tierLabel = usage?.tier && usage.tier !== 'unknown' ? usage.tier : 'Free';
  // Scale the per-window token bars against the widest window (30d).
  const tokenScale = Math.max(monthTokens, 1);
  const topModelCost = models.length > 0 ? Math.max(...models.map((m) => m.cost), 0.0001) : 1;

  return (
    <div className="flex flex-col gap-5 p-4 text-sm text-text-primary">
      {/* Smart routing toggle */}
      <SmartRoutingToggle />

      {/* Canonical cloud usage (api.hanzo.ai) — renders nothing when unavailable.
          A separate concern from the legacy token-credit view below. */}
      <CloudUsage />

      {/* Spend header card */}
      <div className="rounded-xl border border-border-medium bg-surface-secondary p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-text-secondary">
              {localize('com_nav_usage_spend_30d')}
            </p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{formatUsd(monthSpend)}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-1">
            <Zap className="h-3 w-3 text-text-secondary" />
            <span className="text-[10px] font-semibold tracking-wider text-text-secondary">
              {tierLabel}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {formatTokens(monthTokens)} {localize('com_nav_usage_tokens_used_30d')}
        </p>
      </div>

      {/* Token usage by window */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-text-secondary">
          <TrendingUp className="h-3.5 w-3.5" />
          {localize('com_nav_usage_tokens')}
        </h3>

        <UsageBar
          label={localize('com_nav_usage_today')}
          sublabel={`${formatTokens(today?.totals.tokens ?? 0)} · ${formatUsd(
            today?.providerCost.used ?? 0,
          )}`}
          current={today?.totals.tokens ?? 0}
          limit={tokenScale}
          color="bg-blue-500"
        />
        <UsageBar
          label={localize('com_nav_usage_last_7d')}
          sublabel={`${formatTokens(week?.totals.tokens ?? 0)} · ${formatUsd(
            week?.providerCost.used ?? 0,
          )}`}
          current={week?.totals.tokens ?? 0}
          limit={tokenScale}
          color="bg-emerald-500"
        />
        <UsageBar
          label={localize('com_nav_usage_last_30d')}
          sublabel={`${formatTokens(monthTokens)} · ${formatUsd(monthSpend)}`}
          current={monthTokens}
          limit={tokenScale}
          color="bg-violet-500"
        />
      </div>

      {/* Per-model breakdown */}
      {models.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-text-secondary">
            <BarChart3 className="h-3.5 w-3.5" />
            {localize('com_nav_usage_by_model')}
          </h3>
          {models.slice(0, 8).map((m) => (
            <UsageBar
              key={m.model}
              label={m.model}
              sublabel={`${formatTokens(m.tokens)} · ${formatUsd(m.cost)}`}
              current={m.cost}
              limit={topModelCost}
              color="bg-blue-500"
            />
          ))}
        </div>
      )}

      {/* Console link */}
      <div className="space-y-2 border-t border-border-light pt-4">
        <a
          href={CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4 text-text-secondary" />
          {localize('com_nav_usage_all_providers')}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}

export default React.memo(Usage);
