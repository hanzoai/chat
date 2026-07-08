const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { resolveTenantBearer } = require('@hanzochat/api');
const { requireJwtAuth, cloudAgentLimiter } = require('~/server/middleware');
const { getCloudAgentsClient, AGENT_NAME_RE } = require('~/server/services/CloudAgentsClient');

/**
 * Cloud agents router — lets a signed-in chat user RUN their own canonical Hanzo
 * Cloud agents (`/v1/agents`) from the chat thread. Mounted at `/v1/chat/agents/cloud`.
 *
 *   GET  /v1/chat/agents/cloud            list the caller's cloud agents
 *   GET  /v1/chat/agents/cloud/:name      one agent's detail + recent runs
 *   POST /v1/chat/agents/cloud/:name/run  run the agent {input} -> RunResult
 *
 * Auth: `requireJwtAuth` gates every route (guests are rejected). The chat
 * backend then forwards the user's hanzo.id id_token to cloud as a Bearer;
 * cloud validates it and scopes to the user's org (see CloudAgentsClient). The
 * token is read from the server-side session and NEVER returned to the browser.
 */
const router = express.Router();

/**
 * Resolve the caller's hanzo.id bearer for the on-behalf-of call to cloud.
 * Delegates to the ONE canonical resolver (`resolveTenantBearer`, @hanzochat/api)
 * that the chat-completion path also uses — principal-bound to req.user,
 * unexpired, id_token preferred with an access_token fallback, session first then
 * the httpOnly cookie. Returns null for an honest 401 (never a wrong-principal,
 * expired, unbound, or fabricated call).
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getUserCloudBearer(req) {
  return resolveTenantBearer(req);
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

/** GET /v1/chat/agents/cloud — list the caller's cloud agents. */
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

/** GET /v1/chat/agents/cloud/:name — one agent's detail + recent runs. */
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

/** POST /v1/chat/agents/cloud/:name/run — run the agent, return its RunResult. */
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
