/**
 * What may be put inside the preview frame.
 *
 * The frame carries `allow-scripts` but deliberately NOT `allow-same-origin`,
 * so anything loaded in it runs at an opaque origin and can reach neither
 * chat's cookies and storage nor the parent document. That covers the DOCUMENT
 * once it loads. It does not cover the URL itself: `javascript:` executes in
 * the EMBEDDING page's context before any sandbox applies, and `data:`/`blob:`
 * inherit the embedder's origin in some engines. Those two are the reason this
 * function exists, and why it is an allow-list of exactly `http` and `https`
 * rather than a deny-list of the schemes we happened to think of.
 *
 * Pure and DOM-free so it is asserted directly, the way the repo's other
 * decision helpers (agentCommand, login) are.
 */

/** The absolute http(s) URL to frame, or null if `raw` must not be framed. */
export function framable(raw: string): string | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  let url: URL;
  try {
    // A bare host ("hanzo.ai") is what people paste; assume https rather than
    // refusing it, but never assume a scheme for something that HAS one.
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  if (!url.hostname) {
    return null;
  }

  return url.toString();
}
