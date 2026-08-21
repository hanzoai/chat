// Smart-routing resolution — the mobile mirror of the web client's
// client/src/utils/endpoints.ts (resolveSmartRouting). Mirrored, NOT imported
// across the app boundary: the mobile app is self-contained (not in the chat
// pnpm workspace), so the pure resolver is duplicated verbatim to keep the three
// Hanzo surfaces (web, mobile, …) behaviorally identical. The web copy carries
// the jest coverage; keep the semantics in lock-step.

/**
 * Org-scoped auto-routing defaults from cloud (`GET /v1/ai/router/defaults`),
 * proxied by the chat backend at `/v1/chat/routing-defaults`. `available` is
 * false when the endpoint is absent (older cloud-api) or the fetch failed soft —
 * the client then behaves exactly as today (local preference only).
 */
export type RoutingDefaults = {
  available: boolean
  auto_routing_active?: boolean
  default_session_routing?: boolean
}

/** Effective smart-routing state for a new session and its toggle. */
export interface SmartRoutingState {
  /** Whether a fresh session should default to the `auto` (gateway-routed) model. */
  enabled: boolean
  /** Whether the user-facing toggle must be locked (org disabled auto-routing). */
  toggleDisabled: boolean
}

/**
 * Resolve smart routing from the user's local override and the org's
 * server-driven defaults. The single source of truth for the effective state.
 *
 * - `localPref`: the user override. `null` === never touched (follow org default);
 *   `true`/`false` === an explicit user choice that wins.
 * - `orgDefault`: `default_session_routing` from the org (null when the server
 *   gave no signal — older cloud-api or a fail-soft fetch — in which case we fall
 *   back to today's off-by-default behavior).
 * - `autoRoutingActive`: `auto_routing_active` for the org. When false the org has
 *   disabled auto-routing entirely; the toggle is off and locked. When the fetch
 *   failed soft, callers pass `true` so nothing changes vs. today.
 */
export function resolveSmartRouting(
  localPref: boolean | null,
  orgDefault: boolean | null,
  autoRoutingActive: boolean,
): SmartRoutingState {
  if (!autoRoutingActive) {
    return { enabled: false, toggleDisabled: true }
  }
  const enabled = localPref !== null ? localPref : orgDefault === true
  return { enabled, toggleDisabled: false }
}

/**
 * The org's default_session_routing, or null when there is no server signal
 * (absent endpoint / fail-soft fetch). Mirrors the web derivation.
 */
export function orgDefaultRouting(defaults: RoutingDefaults | null): boolean | null {
  return defaults?.available ? defaults.default_session_routing ?? null : null
}

/**
 * Whether the org has auto-routing active. Fail-soft default is `true` so an
 * absent/errored fetch keeps today's behavior (toggle usable, off by default).
 */
export function orgAutoRoutingActive(defaults: RoutingDefaults | null): boolean {
  return defaults?.available ? defaults.auto_routing_active !== false : true
}

// Module-level cache of the org defaults fetched once at app boot, so the
// non-React api layer (lib/api.ts `chat`) can resolve effective routing for a
// new session without threading React state through. `null` until boot fills it.
let cached: RoutingDefaults | null = null

/** Record the boot-fetched org defaults for later reads by the api layer. */
export function cacheRoutingDefaults(defaults: RoutingDefaults): void {
  cached = defaults
}

/** The last-cached org defaults, or null before boot / on a failed fetch. */
export function cachedRoutingDefaults(): RoutingDefaults | null {
  return cached
}
