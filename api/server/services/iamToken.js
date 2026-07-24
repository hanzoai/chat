const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { logger } = require('@hanzochat/data-schemas');

/**
 * JWKS verification for Hanzo IAM (hanzo.id) tokens — the ONE server-side proof
 * that a token presented by the @hanzo/iam SPA was really issued by IAM.
 *
 * This is the JWKS verify path promoted out of the per-request `openIdJwtStrategy`
 * (which uses the same `jwks-rsa` signing-key source) into a standalone, callable
 * verifier the session-bridge uses. It is self-contained: it discovers the JWKS
 * URI from `OPENID_ISSUER` (falling back to the already-initialized openid-client
 * config's metadata when present), so it does NOT depend on the Passport OpenID
 * login strategy being registered.
 *
 * Security properties enforced: RS256 signature against IAM's JWKS (key matched by
 * `kid`), unexpired `exp` (jsonwebtoken default), and issuer equality with
 * `OPENID_ISSUER` (trailing-slash-normalized). Audience is intentionally NOT
 * pinned here — the SPA client id (`VITE_HANZO_IAM_APP`) and the backend
 * `OPENID_CLIENT_ID` may differ per deployment, and cloud is the authoritative
 * audience/claim validator on the on-behalf-of path — matching the existing
 * `openIdJwtStrategy` which likewise verifies signature, not audience.
 */

const OIDC_DISCOVERY_PATH = '/.well-known/openid-configuration';

let _jwksClient;
let _discoveredJwksUri;

/** Normalize an origin/issuer by stripping trailing slashes. */
function normalizeIssuer(value) {
  return (value || '').replace(/\/+$/, '');
}

/**
 * Resolve IAM's JWKS URI. Prefers the openid-client Configuration's discovered
 * metadata (already fetched at boot when OpenID is configured); otherwise runs a
 * one-time OIDC discovery against `OPENID_ISSUER`. Cached process-wide.
 * @returns {Promise<string>}
 */
async function resolveJwksUri() {
  try {
    // Lazy require to avoid a circular import at module load and to stay
    // decoupled from whether the Passport OpenID strategy is registered.
    const { getOpenIdConfig } = require('~/strategies');
    const metaUri = getOpenIdConfig?.()?.serverMetadata?.().jwks_uri;
    if (metaUri) {
      return metaUri;
    }
  } catch (err) {
    logger.debug('[iamToken] openid-client config unavailable; discovering JWKS', err?.message);
  }

  if (_discoveredJwksUri) {
    return _discoveredJwksUri;
  }

  const issuer = normalizeIssuer(process.env.OPENID_ISSUER);
  if (!issuer) {
    throw new Error('OPENID_ISSUER is not configured');
  }

  const res = await fetch(`${issuer}${OIDC_DISCOVERY_PATH}`);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed (${res.status}) for ${issuer}`);
  }
  const meta = await res.json();
  if (!meta?.jwks_uri) {
    throw new Error('OIDC discovery response has no jwks_uri');
  }
  _discoveredJwksUri = meta.jwks_uri;
  return _discoveredJwksUri;
}

/** Build (once) the cached jwks-rsa client. */
async function getJwksClient() {
  if (_jwksClient) {
    return _jwksClient;
  }
  const jwksUri = await resolveJwksUri();
  const options = {
    cache: true,
    cacheMaxAge: 600000,
    rateLimit: true,
    jwksUri,
  };
  if (process.env.PROXY) {
    options.requestAgent = new HttpsProxyAgent(process.env.PROXY);
  }
  _jwksClient = jwksRsa(options);
  return _jwksClient;
}

/** jsonwebtoken key resolver backed by the JWKS client. */
function keyResolver(client) {
  return (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, key.getPublicKey());
    });
  };
}

/**
 * Verify a Hanzo IAM token and return its claims. Throws on any failure
 * (bad signature, expired, wrong issuer, unreachable JWKS).
 * @param {string} token - a hanzo.id-issued JWT (id_token preferred)
 * @returns {Promise<Record<string, unknown>>} verified claims
 */
async function verifyIamToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('missing token');
  }
  const client = await getJwksClient();
  const claims = await new Promise((resolve, reject) => {
    jwt.verify(token, keyResolver(client), { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(decoded);
    });
  });

  const expectedIssuer = normalizeIssuer(process.env.OPENID_ISSUER);
  if (expectedIssuer && claims?.iss && normalizeIssuer(claims.iss) !== expectedIssuer) {
    throw new Error(`unexpected token issuer: ${claims.iss}`);
  }

  return claims;
}

/** Reset the memoized JWKS client + discovery cache (tests only). */
function _resetIamToken() {
  _jwksClient = undefined;
  _discoveredJwksUri = undefined;
}

module.exports = { verifyIamToken, _resetIamToken };
