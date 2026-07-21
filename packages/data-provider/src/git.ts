/**
 * Hanzo's Git (git.hanzo.ai) — the ONE place that names the host and decides
 * whether a repository URL lives on it.
 *
 * Apps built in hanzo.app are cloned to git.hanzo.ai; the community showcase
 * lists ONLY those apps and links ONLY to their git.hanzo.ai repositories. This
 * module is pure and shared by the marketplace query, the server-side list
 * filter, and the client link guard, so "built on Hanzo Git" has exactly one
 * meaning across client and server.
 */

/** Hanzo's Git host. */
export const HANZO_GIT_HOST = 'git.hanzo.ai';

/** Canonical base URL for a repository on Hanzo's Git. */
export const HANZO_GIT_URL = `https://${HANZO_GIT_HOST}/`;

/**
 * Anchored pattern for a repository URL served by Hanzo's Git, for a
 * server-side store query (e.g. Mongo `$regex`). Mirrors {@link isHanzoGitUrl}:
 * http(s) scheme and exact host. Apply it case-insensitively (Mongo `i` option /
 * `RegExp` `i` flag) so the server matches the same URLs the client accepts.
 */
export const HANZO_GIT_URL_PATTERN = `^https?://${HANZO_GIT_HOST.replace(/\./g, '\\.')}/`;

/** True when `url` is an http(s) repository served by Hanzo's Git. */
export function isHanzoGitUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  try {
    const { protocol, hostname } = new URL(url);
    return (
      (protocol === 'https:' || protocol === 'http:') && hostname.toLowerCase() === HANZO_GIT_HOST
    );
  } catch {
    return false;
  }
}
