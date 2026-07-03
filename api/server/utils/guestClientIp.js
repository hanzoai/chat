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
 * The returned string is the SOLE identity the guest quota keys on, so it must be
 * stable across guest tokens, cookie clears, and incognito sessions from the same
 * network origin.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const guestClientIp = (req) => {
  const cf = req.headers?.['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) {
    return cf.trim();
  }
  return removePorts(req);
};

module.exports = guestClientIp;
