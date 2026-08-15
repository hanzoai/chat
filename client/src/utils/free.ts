import { hasConsent, isFree, paidUnavailable, servedByFallback } from '@hanzo/ai';

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
 * Offer to switch when the paid route FAILED and free would have served. A spent
 * guest quota (`GUEST_LIMIT`) and a missing session (401) are not that — they
 * want a sign-in, not a cheaper model.
 *
 * This is the second of the two shapes a paid outage takes: the typed error the
 * gateway returns for a model family with no free route of its own.
 */
export function offerSwitch(status: number | undefined, body: unknown): void {
  const reason = (body ?? {}) as { type?: string };
  if (status === 401 || reason.type === 'GUEST_LIMIT') {
    return;
  }
  if (!paidUnavailable({ status, ...reason })) {
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
