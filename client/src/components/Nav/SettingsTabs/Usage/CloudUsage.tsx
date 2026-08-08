import React, { useState } from 'react';
import { BarChart3, Activity, RefreshCw, Cloud } from 'lucide-react';
import {
  normalizeCloudUsage,
  formatCents,
  formatCount,
  type CloudUsageOverview,
  type UsageRange,
} from '@hanzo/usage';
import { useGetCloudUsage } from '~/data-provider';
import { useAuthContext } from '~/hooks';

/**
 * Cloud usage — the canonical, org-scoped AI usage from `GET /v1/get-cloud-usages`
 * (proxied on-behalf-of by the chat backend). Rendered as a native, Hanzo Chat-styled
 * view over the SHARED `@hanzo/usage` `CloudUsageOverview` shape: nothing is re-derived,
 * the numbers come straight from the ledger, and `normalizeCloudUsage` is the ONE
 * boundary guard (a partial/absent field degrades to honest zeros, never fabricated).
 *
 * We DON'T mount `@hanzo/usage`'s `<UsagePanel>` here: it is built on @hanzo/gui
 * (Tamagui / react-native-web), and this client is Vite + React 18 + Tailwind with no
 * @hanzo/gui runtime — so we take the package's headless core and render it natively,
 * beside (not replacing) the Mongo token-credit tab, which is a separate concern.
 */

const RANGES: UsageRange[] = ['24h', '7d', '30d'];

/** The proxy answers `{ enabled: false }` when cloud usage is off (no HANZO_CLOUD_URL)
 *  or the caller has no hanzo.id bearer — the section then renders nothing. */
function isDisabled(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as { enabled?: boolean }).enabled === false;
}

function RangeTabs({ value, onChange }: { value: UsageRange; onChange: (r: UsageRange) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-tertiary p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            value === r
              ? 'bg-surface-primary text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          aria-pressed={value === r}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[84px] flex-1 rounded-lg border border-border-medium bg-surface-secondary p-3">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

/** A share meter (matches the Usage tab's UsageBar idiom). */
function Meter({ pct, color = 'bg-blue-500' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

function activityTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function Sections({ overview }: { overview: CloudUsageOverview }) {
  const { totals, byModel, activity } = overview;
  const models = byModel.items;
  const acts = activity.items.slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      {/* Totals */}
      <div className="flex flex-wrap gap-2">
        <StatTile label="Spend" value={formatCents(totals.spendCents)} />
        <StatTile label="Tokens" value={formatCount(totals.tokens)} />
        <StatTile label="Requests" value={formatCount(totals.requests)} />
        <StatTile label="Models" value={formatCount(totals.models)} />
      </div>

      {/* Spend by model */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-text-secondary">
          <BarChart3 className="h-3.5 w-3.5" />
          Spend by model
        </h3>
        {models.length > 0 ? (
          <div className="space-y-3">
            {models.map((m, i) => (
              <div key={`${m.model}-${i}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {m.model || 'unknown'}
                    <span className="ml-2 text-xs text-text-secondary">{m.provider}</span>
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCents(m.spendCents)}
                  </span>
                </div>
                <Meter pct={m.pct} />
              </div>
            ))}
            {byModel.other && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-text-secondary">
                    Other ({byModel.other.modelCount})
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCents(byModel.other.spendCents)}
                  </span>
                </div>
                <Meter pct={byModel.other.pct} color="bg-gray-400 dark:bg-gray-500" />
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">No model spend in this range yet.</p>
        )}
      </div>

      {/* Recent activity */}
      {acts.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-text-secondary">
            <Activity className="h-3.5 w-3.5" />
            Recent activity
          </h3>
          <div className="divide-y divide-border-light">
            {acts.map((r, i) => (
              <div key={r.requestId || `${r.time}-${i}`} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {r.model || 'inference'}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {[r.provider, activityTime(r.time)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-text-secondary">
                  {formatCount(r.tokens)} tok
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
                  {formatCents(r.costCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CloudUsage() {
  const { isAuthenticated } = useAuthContext();
  const [range, setRange] = useState<UsageRange>('7d');
  const query = useGetCloudUsage(range, { enabled: !!isAuthenticated });

  // Feature off / no hanzo.id bearer → render nothing (the Mongo usage tab stands alone).
  if (isDisabled(query.data)) {
    return null;
  }

  const overview: CloudUsageOverview | null =
    query.data && !isDisabled(query.data) ? normalizeCloudUsage(query.data) : null;

  return (
    <div className="rounded-xl border border-border-medium bg-surface-primary p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-secondary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Cloud usage</p>
            <p className="text-xs text-text-secondary">Your org · api.hanzo.ai</p>
          </div>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {query.isError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border-medium bg-surface-secondary p-5 text-center">
          <p className="text-sm font-semibold text-text-primary">Usage is unavailable</p>
          <p className="text-xs text-text-secondary">
            {query.error instanceof Error
              ? query.error.message
              : 'The usage ledger could not be reached.'}
          </p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-border-medium px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : overview ? (
        <Sections overview={overview} />
      ) : (
        <p className="text-xs text-text-secondary">Loading usage…</p>
      )}
    </div>
  );
}

export default React.memo(CloudUsage);
