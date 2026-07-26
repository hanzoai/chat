/**
 * Which Hanzo surface handed this visitor to hanzo.chat.
 *
 * hanzo.ai's composer forwards its prompt here (`?q=…&hz_ref=site`). The two are
 * different origins, so a logged-out visitor has a different anonymousId on each
 * and NO per-person funnel can span them. Stamping the source surface on
 * chat_started is what makes the handoff drop-off measurable in aggregate —
 * FUNNELS.siteToChat in @hanzo/event reads exactly this property.
 *
 * Read once (the chat clears its query params after auto-submitting) and pinned
 * to the session so the attribution survives the URL cleanup and later messages.
 */
const KEY = 'hz_ref';

let cached: string | null | undefined;

/** A closed allow-list: an arbitrary `?hz_ref=` from a stranger must never open
 *  a new event dimension. Anything unknown is dropped. */
const KNOWN = new Set(['site', 'app', 'console', 'cloud', 'admin']);

export function referrerProduct(): string | undefined {
  if (cached !== undefined) {
    return cached ?? undefined;
  }
  cached = null;
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(KEY);
    if (fromUrl && KNOWN.has(fromUrl)) {
      window.sessionStorage.setItem(KEY, fromUrl);
      cached = fromUrl;
    } else {
      const stored = window.sessionStorage.getItem(KEY);
      cached = stored && KNOWN.has(stored) ? stored : null;
    }
  } catch {
    /* private mode / blocked storage — attribution is best-effort, never fatal */
  }
  return cached ?? undefined;
}
