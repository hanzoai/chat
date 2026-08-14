const removePorts = require('./removePorts');

/**
 * Resolves the real client IP for per-IP guest rate limiting.
 *
 * hanzo.chat is served behind Cloudflare → the DO LB → the ingress. With that
 * many hops, Express `req.ip` (via `trust proxy`) is not reliably the visitor's
 * address, which would let anonymous users share/reset their free-message bucket
 * (or collapse everyone into one bucket). Cloudflare always sets
 * `CF-Connecting-IP` to the true originating client and — unlike a
 * client-supplied `X-Forwarded-For` entry — a browser cannot forge it through
 * the CF edge. Prefer it; fall back to the trust-proxy-resolved `req.ip` when the
 * request did not transit Cloudflare (e.g. in-cluster/local).
 *
 * The returned string is the SOLE identity an anonymous visitor has — the guest
 * quota keys on it and so does the guest principal — so it must be stable across
 * cookie clears and incognito sessions from the same network origin.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const guestClientIp = (req) => {
  const cf = req.headers?.['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) {
    return cf.trim();
  }
  /* Always a string. A request with no address the server can resolve is not an
     error — it is one more anonymous visitor, and they all share this bucket
     rather than crashing the request or each getting a free quota. */
  return removePorts(req) || 'unknown';
};

module.exports = guestClientIp;
