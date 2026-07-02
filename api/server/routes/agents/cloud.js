const cookies = require('cookie');
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
 * Resolve the caller's hanzo.id bearer for the on-behalf-of call to cloud.
 * Prefers the id_token (a standard JWT signed by the IdP's JWKS with the app
 * client_id as audience — what cloud's identity validator verifies); falls back
 * to the access_token. Reads server-side session first (where setOpenIDAuthTokens
 * stores them), then the httpOnly cookies for backward compatibility. Returns
 * null when the user did not authenticate via hanzo.id (e.g. a local JWT user),
 * so the route can fail with an honest 401 rather than a wrong-principal call.
 *
 * Principal guard: only forward the OpenID tokens when THIS request actually
 * authenticated via OpenID (`token_provider === 'openid'` — the exact signal
 * requireJwtAuth uses to pick the openid strategy). A local-JWT user whose
 * browser still holds a stale, non-expired OpenID session would otherwise run as
 * that prior identity (confused deputy); denying keeps the forwarded principal
 * identical to req.user.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getUserCloudBearer(req) {
  const parsed = req.headers.cookie ? cookies.parse(req.headers.cookie) : {};
  if (parsed.token_provider !== 'openid') {
    return null;
  }

  const session = req.session?.openidTokens;
  let idToken = session?.idToken;
  let accessToken = session?.accessToken;

  if (!idToken && !accessToken) {
    idToken = parsed.openid_id_token;
    accessToken = parsed.openid_access_token;
  }

  return idToken || accessToken || null;
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
