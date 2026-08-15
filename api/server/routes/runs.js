const express = require('express');
const { Readable, pipeline } = require('stream');
const { logger } = require('@hanzochat/data-schemas');
const { resolveActiveOrg, resolveTenantBearer } = require('@hanzochat/api');
const { requireJwtAuth } = require('~/server/middleware');

/**
 * Watching and stopping a run — mounted at `/v1/chat/runs`.
 *
 * When the model runs code, cloud leases a sandbox and runs the command there.
 * The command's output used to reach the browser only when the command was OVER,
 * so a long install or a test suite was a spinner and then a wall of text. Cloud
 * now appends that output to the run's session log AS IT IS PRODUCED and serves
 * the log live. These two routes are the browser's way to it.
 *
 * WHY A RELAY, AND NOT A DIRECT CALL. The browser's Authorization header is
 * chat's own session JWT, which cloud rejects — the credential cloud accepts
 * (the user's hanzo.id bearer) lives server-side only and is never handed to the
 * browser. Same reason `/v1/chat/ask` is a relay, same resolver, same posture.
 * There is no second transport here and no socket: the upstream is Server-Sent
 * Events and it is piped through untouched.
 *
 * NO GUESTS. `/v1/chat/ask` admits one because an answer can be metered to a
 * shared capped key. A run cannot: a session and a sandbox belong to the org
 * that leased them, and handing an anonymous caller the shared key would let it
 * watch — and stop — another tenant's work. `requireJwtAuth`, not
 * `requireGuestOrJwtAuth`.
 */
const router = express.Router();

/** Upstream cloud base. In-cluster by default — no public hop for a server call. */
function cloudBaseUrl() {
  return (process.env.HANZO_CLOUD_URL || 'https://api.hanzo.ai').replace(/\/+$/, '');
}

/**
 * The credential for the on-behalf-of call, or null when the caller has none.
 *
 * `resolveTenantBearer` is the ONE selector every cloud-facing surface in chat
 * shares: the caller's own token, as presented on this request.
 */
function credential(req) {
  const bearer = resolveTenantBearer(req);
  return bearer ? { bearer, org: resolveActiveOrg(req) } : null;
}

/** Only what the client can act on; anything else is this route's own 502. */
function relayStatus(status) {
  return [401, 402, 403, 429].includes(status) ? status : 502;
}

function headers(cred) {
  return {
    Authorization: `Bearer ${cred.bearer}`,
    ...(cred.org ? { 'X-Org-Id': cred.org } : {}),
  };
}

/**
 * GET /v1/chat/runs/stream?root=<session> — the live log of one run.
 *
 * `root` narrows the caller's org-wide feed to a single run and its subagents.
 * It is the ONLY parameter forwarded: the tenant is cloud's to decide from the
 * bearer, and anything else a client appends is not evidence of anything.
 *
 * There is no timeout. A run is watched for as long as it runs, which is the
 * point — `/v1/chat/ask` bounds itself because an answer that never finishes is
 * broken, but a feed that stays open is a feed that is working. The browser
 * hanging up is what ends it, and cloud notices on its next write; a 25-second
 * heartbeat keeps that write coming while nothing is happening.
 */
router.get('/stream', requireJwtAuth, async (req, res) => {
  const cred = await credential(req);
  if (!cred) {
    return res.status(401).json({ error: 'sign in to watch a run' });
  }

  const upstream = new URL(`${cloudBaseUrl()}/v1/agents/sessions/stream`);
  const root = (req.query?.root ?? '').toString().trim();
  if (root) {
    upstream.searchParams.set('root', root);
  }

  const controller = new AbortController();
  let clientGone = false;
  res.on('close', () => {
    clientGone = true;
    controller.abort();
  });

  let cloudRes;
  try {
    cloudRes = await fetch(upstream, {
      headers: { ...headers(cred), Accept: 'text/event-stream' },
      signal: controller.signal,
    });
  } catch (err) {
    if (clientGone) {
      return;
    }
    logger.error('[runs] upstream feed failed', err);
    return res.status(502).json({ error: 'the run feed is unavailable' });
  }

  // A non-stream reply is an error envelope. The STATUS is passed through so the
  // client can render the honest reason; the BODY is not, because an intermediary
  // answering with text/html would otherwise make this route a same-origin sink
  // for upstream-controlled markup.
  if (!cloudRes.ok || !cloudRes.body) {
    const detail = await cloudRes.text().catch(() => '');
    logger.warn('[runs] upstream refused the feed', {
      status: cloudRes.status,
      detail: detail.slice(0, 500),
    });
    return res.status(relayStatus(cloudRes.status)).json({ error: 'could not watch this run' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'identity');
  // Chat sits behind an ingress that would otherwise hold frames back until its
  // buffer fills — on a feed whose whole value is arriving early, that is
  // indistinguishable from a hang.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  await new Promise((resolve) => {
    pipeline(Readable.fromWeb(cloudRes.body), res, (err) => {
      if (err && !clientGone) {
        logger.warn('[runs] feed interrupted', { message: err.message });
      }
      resolve();
    });
  });
});

/**
 * POST /v1/chat/runs/stop — stop the work, keep the box.
 *
 * TWO VERBS EXIST UPSTREAM AND THIS IS THE FIRST. `stop` interrupts what the
 * sandbox is RUNNING; `end` releases the sandbox itself. Somebody stops a run
 * because it has gone wrong, and what they want next is to look at it — the
 * checkout, the half-written file, everything it has already said. A Stop wired
 * to the second verb would take all of that with the command.
 *
 * `{stopped: 0}` is an ANSWER, not a failure: a command that ended a moment ago
 * is one there was nothing left to interrupt. A sandbox belonging to somebody
 * else is a 404 from cloud's own org lookup, never a stop.
 */
router.post('/stop', requireJwtAuth, async (req, res) => {
  const sandbox = (req.body?.sandbox ?? '').toString().trim();
  if (!sandbox) {
    return res.status(400).json({ error: 'a sandbox is required' });
  }

  const cred = await credential(req);
  if (!cred) {
    return res.status(401).json({ error: 'sign in to stop a run' });
  }

  let cloudRes;
  try {
    cloudRes = await fetch(`${cloudBaseUrl()}/v1/sandboxes/stop`, {
      method: 'POST',
      headers: { ...headers(cred), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sandbox }),
    });
  } catch (err) {
    logger.error('[runs] stop failed', err);
    return res.status(502).json({ error: 'could not reach the sandbox' });
  }

  if (!cloudRes.ok) {
    const detail = await cloudRes.text().catch(() => '');
    logger.warn('[runs] upstream refused the stop', {
      status: cloudRes.status,
      detail: detail.slice(0, 500),
    });
    return res.status(relayStatus(cloudRes.status)).json({ error: 'could not stop this run' });
  }

  const body = await cloudRes.json().catch(() => ({}));
  return res.json({ ok: true, stopped: body?.stopped ?? 0 });
});

module.exports = router;
