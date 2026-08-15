import { hasConsent, isFree, paidUnavailable, servedByFallback } from '@hanzo/ai';
import { extractJson, isJson } from '~/utils/json';

/**
 * The free route costs nothing and, in exchange, shares data with the model
 * provider that serves it. `FREE_MODEL` on the Hanzo endpoint is what a
 * signed-in visitor moves to; a guest is pinned to their own free model by the
 * server and never chooses.
 *
 * This module holds the two signals that reach the visitor — the offer, and the
 * request for consent — and the rule for when each is honest. The words, the
 * predicates and the consent record live in `@hanzo/ai`, shared with every other
 * Hanzo surface.
 */

/**
 * Which offer the notice makes.
 *
 * `switch` — the paid route failed outright, nothing was served, so moving to
 * free also resends the message. `keep` — the gateway already answered on free,
 * so the reply is on screen and staying there is one click.
 */
export type Offer = 'switch' | 'keep';

/** Window event carrying an {@link Offer}. `Notice` listens for it. */
export const FREE_OFFERED = 'freeOffered';

/** Window event: free-tier consent is needed. `Consent` listens. */
export const FREE_CONSENT = 'freeConsent';

/** What a {@link FREE_CONSENT} event carries: the work held until consent is given. */
export type ConsentDetail = { proceed: () => void };

/** Where an answered offer is remembered, for as long as the tab lives. */
const SWITCHED = 'hanzo.free.switched';

/** Whether this session already settled on the free route. */
export function switched(): boolean {
  try {
    return window.sessionStorage.getItem(SWITCHED) === 'true';
  } catch {
    return false;
  }
}

/** Records the move, so a later reply is not answered with an offer already taken. */
export function rememberSwitch(): void {
  try {
    window.sessionStorage.setItem(SWITCHED, 'true');
  } catch {
    /* a blocked store only costs a repeated offer */
  }
}

function raise(offer: Offer): void {
  if (typeof window === 'undefined' || switched()) {
    return;
  }
  window.dispatchEvent(new CustomEvent<{ offer: Offer }>(FREE_OFFERED, { detail: { offer } }));
}

/**
 * The refusal, wherever the producer put it. A gateway body carries its reason
 * at the top level or under `error`; this server's own refusals arrive as JSON
 * inside a text field, which is why `Error` extracts before it reads and this
 * has to as well.
 */
function refusal(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    const json = extractJson(body);
    return isJson(json) ? (JSON.parse(json) as Record<string, unknown>) : null;
  }
  if (body == null || typeof body !== 'object') {
    return null;
  }
  const held = body as Record<string, unknown>;
  for (const field of ['text', 'message'] as const) {
    if (typeof held[field] === 'string') {
      const inner = refusal(held[field]);
      if (inner) {
        return inner;
      }
    }
  }
  return held;
}

/**
 * This server's own answer to a request it cannot bill: `checkBalance` throws
 * `{type:'token_balance', …}`, and the commerce check adds a `reason`. Free
 * costs nothing, so a spent balance has a way forward — which is the whole
 * point of the offer, and the shape that was missing it.
 *
 * `@hanzo/ai` deliberately knows only the codes the GATEWAY returns; this name
 * is this repo's vocabulary, so it is read here rather than pushed into the
 * shared predicate.
 *
 * `commerce_unavailable` is excluded: it means the balance could not be READ,
 * not that it is empty, and a model swap is not the answer to that.
 */
function spent(body: unknown): boolean {
  const json = refusal(body);
  const nested = json?.error as { type?: string } | undefined;
  const type = json?.type ?? nested?.type;
  return type === 'token_balance' && json?.reason !== 'commerce_unavailable';
}

/**
 * Offer to switch when the paid route FAILED and free would have served. A spent
 * guest quota (`GUEST_LIMIT`) and a missing session (401) are not that — they
 * want a sign-in, not a cheaper model.
 *
 * This is the second of the two shapes a paid outage takes: the typed error the
 * gateway returns for a model family with no free route of its own, and the
 * refusal this server writes when the balance will not cover the turn.
 */
export function offerSwitch(status: number | undefined, body: unknown): void {
  const reason = (body ?? {}) as { type?: string };
  if (status === 401 || reason.type === 'GUEST_LIMIT') {
    return;
  }
  if (!paidUnavailable({ status, ...reason }) && !spent(body)) {
    return;
  }
  raise('switch');
}

/**
 * Offer to keep free when the gateway ALREADY answered on it — a reply whose
 * model is not the one asked for, which is how a paid route is served free
 * during an outage. This is the shape the visitor meets first, so it is where
 * the offer usually comes from.
 *
 * A conversation already on a free id is excluded: `FREE_MODEL` is an auto-route
 * that resolves to whichever free provider is up, so its replies always name a
 * different model and would otherwise offer free to someone already on it.
 */
export function offerKeep(requested: string | undefined | null, served?: string | null): void {
  if (isFree(requested) || !servedByFallback(requested, { model: served ?? undefined })) {
    return;
  }
  raise('keep');
}

/**
 * Run `proceed` once free-tier consent is on record — immediately when it
 * already is, otherwise when the visitor agrees in the consent dialog. Declining
 * runs nothing, so nothing is ever served free without agreement.
 */
export function askConsent(proceed: () => void): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (hasConsent(window.localStorage)) {
    proceed();
    return;
  }
  window.dispatchEvent(new CustomEvent<ConsentDetail>(FREE_CONSENT, { detail: { proceed } }));
}
