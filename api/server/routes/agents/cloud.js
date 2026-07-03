const cookies = require('cookie');
const jwt = require('jsonwebtoken');
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { requireJwtAuth, cloudAgentLimiter } = require('~/server/middleware');
const { getCloudAgentsClient, AGENT_NAME_RE } = require('~/server/services/CloudAgentsClient');

/**
 * Cloud agents router — lets a signed-in chat user RUN their own canonical Hanzo
 * Cloud agents (`/v1/agents`) from the chat thread. Mounted at `/api/agents/cloud`.
 *
 *   GET  /api/agents/cloud            list the caller's cloud agents
 *   GET  /api/agents/cloud/:name      one agent's detail + recent runs
 *   POST /api/agents/cloud/:name/run  run the agent {input} -> RunResult
 *
 * Auth: `requireJwtAuth` gates every route (guests are rejected). The chat
 * backend then forwards the user's hanzo.id id_token to cloud as a Bearer;
 * cloud validates it and scopes to the user's org (see CloudAgentsClient). The
 * token is read from the server-side session and NEVER returned to the browser.
 */
const router = express.Router();

/**
 * Is this token safe to forward on-behalf-of `user`? Fail-secure gates, ALL
 * mandatory — the function only ever REMOVES a token from consideration, never
 * admits one:
 *  - Decodable JWT: an opaque/garbage token cannot be principal-bound, so it is
 *    never forwarded. hanzo.id — the only cloud IdP — always issues JWTs.
 *  - Principal binding (MANDATORY): the token must NAME the authenticated user
 *    (`sub === user.openidId`). If we cannot ASSERT the binding — no `openidId`
 *    on the principal, no `sub` on the token, or a mismatch — we do NOT forward.
 *    This keeps "forwarded principal == req.user" true by construction, closing
 *    the credential-mixing confused deputy (a session/cookie carrying a
 *    different user's token) with no fail-open when binding data is absent.
 *  - Expiry: never forward a token past its own `exp`.
 *
 * Decode-only (no signature verification): cloud performs the authoritative
 * JWKS + claim validation over the SAME claims, so it runs as exactly this
 * `sub`. A forged/tampered token gains nothing here — changing `sub` fails the
 * binding; an intact `sub` is rejected by cloud on signature.
 *
 * @param {string|undefined} token
 * @param {{openidId?: string}} user
 * @returns {boolean}
 */
function isForwardableToken(token, user) {
  if (!token || !user?.openidId) {
    return false;
  }
  const claims = jwt.decode(token);
  if (!claims || typeof claims !== 'object') {
    return false;
  }
  if (claims.sub !== user.openidId) {
    return false;
  }
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * Resolve the caller's hanzo.id bearer for the on-behalf-of call to cloud.
 *
 * Keyed off the VALIDATED principal (`req.user.provider === 'openid'` — the
 * authoritative DB user loaded by requireJwtAuth), NOT any cookie. A local user
 * never carries a hanzo.id token, so a stale OpenID session left in the browser
 * can never be forwarded under a local identity — the confused deputy is denied
 * at the identity layer.
 *
 * EVERY candidate — session first, then the httpOnly no-session cookie fallback;
 * id_token preferred, access_token second — must pass `isForwardableToken`:
 * principal-bound to req.user and unexpired. Returns null — for an honest 401,
 * never a wrong-principal, expired, unbound, or fabricated call — otherwise.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getUserCloudBearer(req) {
  if (req.user?.provider !== 'openid') {
    return null;
  }

  const parsed = req.headers.cookie ? cookies.parse(req.headers.cookie) : {};
  const session = req.session?.openidTokens;

  const idToken = session?.idToken || parsed.openid_id_token;
  if (isForwardableToken(idToken, req.user)) {
    return idToken;
  }
  /**
   * access_token fallback (rare: the session/cookie carries no id_token).
   * hanzo.id issues JWT access tokens too, so this stays principal-bound; an
   * opaque or foreign access_token fails the gate and is never forwarded.
   */
  const accessToken = session?.accessToken || parsed.openid_access_token;
  if (isForwardableToken(accessToken, req.user)) {
    return accessToken;
  }
  return null;
}

router.use(requireJwtAuth);

/**
 * Per-user rate limit. A run is a real, billable cloud completion holding an
 * upstream socket; without this it escapes the throttle that guards the sibling
 * chat-completion path. Applies to every cloud route (list/get/run) so no proxy
 * op can be looped to degrade the shared backend. Runs after requireJwtAuth so
 * the limiter keys on a real user id.
 */
router.use(cloudAgentLimiter);

/**
 * Validate the :name path segment at the HTTP boundary — the same cloud handle
 * grammar the client enforces, applied here so a malformed/decoded name
 * (traversal, null byte, CRLF, backslash) is rejected before any client call is
 * even constructed. Defense at the boundary, not only in the client.
 */
router.param('name', (req, res, next, name) => {
  if (!AGENT_NAME_RE.test((name ?? '').toString().trim())) {
    return res.status(400).json({ error: 'invalid agent name' });
  }
  return next();
});

/**
 * Map a CloudAgentsClient error to an HTTP response. Upstream failures that
 * carry a run body (cloud's 502 with a recorded error run) are passed through so
 * the client can render the honest failure; everything else is normalized.
 * @param {import('express').Response} res
 * @param {Error & {status?: number, body?: any}} err
 * @param {string} action
 */
function sendCloudError(res, err, action) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
  if (status >= 500) {
    logger.warn(`[cloudAgents] ${action} failed`, { status, message: err.message });
  }
  if (err.body && typeof err.body === 'object') {
    return res.status(status).json(err.body);
  }
  return res.status(status).json({ error: err.message || 'cloud agents request failed' });
}

/** GET /api/agents/cloud — list the caller's cloud agents. */
router.get('/', async (req, res) => {
  const client = getCloudAgentsClient();
  if (!client) {
    return res.json({ agents: [], enabled: false });
  }
  const bearer = getUserCloudBearer(req);
  if (!bearer) {
    return res.status(401).json({ error: 'cloud agents require hanzo.id sign-in' });
  }
  try {
    const data = await client.list(bearer);
    return res.json({ ...data, enabled: true });
  } catch (err) {
    return sendCloudError(res, err, 'list');
  }
});

/** GET /api/agents/cloud/:name — one agent's detail + recent runs. */
router.get('/:name', async (req, res) => {
  const client = getCloudAgentsClient();
  if (!client) {
    return res.status(404).json({ error: 'cloud agents not configured' });
  }
  const bearer = getUserCloudBearer(req);
  if (!bearer) {
    return res.status(401).json({ error: 'cloud agents require hanzo.id sign-in' });
  }
  try {
    const data = await client.get(bearer, req.params.name);
    return res.json(data);
  } catch (err) {
    return sendCloudError(res, err, 'get');
  }
});

/** POST /api/agents/cloud/:name/run — run the agent, return its RunResult. */
router.post('/:name/run', async (req, res) => {
  const client = getCloudAgentsClient();
  if (!client) {
    return res.status(404).json({ error: 'cloud agents not configured' });
  }
  const bearer = getUserCloudBearer(req);
  if (!bearer) {
    return res.status(401).json({ error: 'cloud agents require hanzo.id sign-in' });
  }
  try {
    const run = await client.run(bearer, req.params.name, req.body?.input ?? '');
    return res.json(run);
  } catch (err) {
    return sendCloudError(res, err, 'run');
  }
});

module.exports = router;
