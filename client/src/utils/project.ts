/**
 * The ONE definition of the cross-surface project link (console <-> hanzo.app
 * <-> hanzo.chat). Sibling to buildApp.ts (the app-builder handoff).
 *
 * A project is identified everywhere by its org-unique SLUG -- the key the
 * cloud `/v1/projects/:slug` store is keyed on (the org is derived server-side
 * from the IAM JWT owner claim, HIP-0111; it never travels in the URL). The
 * slug rides as `?project=<slug>`. Opening `hanzo.chat/c/new?project=<slug>`
 * scopes the conversation to that project and links back to the builder + the
 * console for the SAME slug, so one project round-trips across every surface.
 */
import { HANZO_APP_BUILDER_URL } from './buildApp';

/** The query param carrying the project slug across every surface. */
export const PROJECT_PARAM = 'project';

/** sessionStorage key that keeps the active project scope through Chat's
 *  `/c/new` -> `/c/:id` navigation (which drops the query string). */
const STORE_KEY = 'hanzo:activeProject';

const CONSOLE_ORIGIN = 'https://console.hanzo.ai';

// The org-unique slug grammar the cloud store enforces. Reject anything else so
// a hostile value can never be reflected into an outbound URL or storage.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Return `raw` iff it is a valid project slug, else ''. */
export function sanitizeSlug(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  return SLUG_RE.test(s) ? s : '';
}

function readStored(): string {
  try {
    return sanitizeSlug(sessionStorage.getItem(STORE_KEY));
  } catch {
    return '';
  }
}

/** Pure read: the slug from `?project=` in `search`, falling back to the
 *  persisted scope. No side effects (safe to call during render). */
export function resolveProjectSlug(search: string): string {
  let fromUrl = '';
  try {
    fromUrl = sanitizeSlug(new URLSearchParams(search).get(PROJECT_PARAM));
  } catch {
    fromUrl = '';
  }
  return fromUrl || readStored();
}

/** Resolve the slug AND persist a URL-supplied one so the scope survives the
 *  post-send navigation. Call from an effect, not during render. */
export function persistProjectSlug(search: string): string {
  let fromUrl = '';
  try {
    fromUrl = sanitizeSlug(new URLSearchParams(search).get(PROJECT_PARAM));
  } catch {
    fromUrl = '';
  }
  if (fromUrl) {
    try {
      sessionStorage.setItem(STORE_KEY, fromUrl);
    } catch {
      /* storage unavailable */
    }
    return fromUrl;
  }
  return readStored();
}

/** Exit the project scope (the banner's dismiss). */
export function clearProjectSlug(): void {
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Deep-link into the hanzo.app builder for this project. */
export function appBuilderProjectUrl(slug: string): string {
  return `${HANZO_APP_BUILDER_URL}?${PROJECT_PARAM}=${encodeURIComponent(slug)}`;
}

/** Deep-link into console.hanzo.ai for this project (manage/deploy). */
export function consoleProjectUrl(slug: string): string {
  return `${CONSOLE_ORIGIN}/?${PROJECT_PARAM}=${encodeURIComponent(slug)}`;
}

/** A short opener that scopes a new conversation to the project. */
export function projectOpener(slug: string): string {
  return `I'm working on my Hanzo project "${slug}". `;
}
