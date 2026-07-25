const express = require('express');
const { logger } = require('@hanzochat/data-schemas');
const { resolveTenantBearer, resolveActiveOrg } = require('@hanzochat/api');
const { requireGuestOrJwtAuth, guestMessageLimiter } = require('~/server/middleware');
const { getGuestConfig } = require('~/server/services/guestConfig');

/**
 * Answer engine — the grounded-search surface of hanzo.chat. Mounted at
 * `/v1/chat/ask`, it is a thin server-side relay in front of Hanzo Cloud's
 * `POST /v1/ask` (the ONE unified agentic grounded advisor: live web sources,
 * cited synthesis, follow-ups).
 *
 * WHY A RELAY. The browser cannot call `api.hanzo.ai` itself: the client's
 * Authorization header is chat's own local session JWT, which cloud rejects. The
 * tenant credential that cloud DOES accept lives server-side only (the OIDC
 * session store / httpOnly cookie) and is never exposed to the browser. So the
 * credential is attached here and the upstream stream is piped straight through.
 *
 * AUTH — identical posture to the chat-completion path (custom/initialize.ts), via
 * the SAME canonical resolver, so there is one way to do this and no parallel token
 * logic:
 *   - signed-in  -> the user's own hanzo.id IAM bearer (`resolveTenantBearer`),
 *                   plus the selected org as `X-Org-Id`. Cloud validates the JWT
 *                   and meters the answer to that user's org.
 *   - guest      -> the shared, capped guest key (`GUEST_API_KEY`, KMS
 *                   `chat-guest-key`; `HANZO_API_KEY` is the dev fallback). A
 *                   guest spends a SHARED balance, so the same per-IP quota and
 *                   model pin the guest completion path uses apply here too —
 *                   without them an anonymous loop could bill the shared account
 *                   for premium models.
 *   - neither    -> an honest 401. Never a fabricated or wrong-principal call.
 *
 * The upstream envelope is data-only SSE whose frames are the `@hanzo/ai`
 * SearchEvent union (`sources | status | text | follow_ups | done`), so it is
 * relayed VERBATIM — this route re-encodes nothing and invents no events.
 */
const router = express.Router();

/** Answer modes cloud grounds on the live web. Anything else is rejected here. */
const WEB_MODES = new Set(['search', 'news', 'research', 'deep']);

/** `@source` hints cloud honors; everything else is dropped upstream anyway. */
const SOURCE_HINTS = new Set(['news', 'academic', 'github', 'reddit', 'x']);

/** Cloud truncates at 2000; reject earlier so an oversized body never leaves chat. */
const MAX_QUERY = 2000;

/** Is this request an anonymous guest (shared key, shared balance)? */
function isGuestMode(req) {
  return req.user?.guest === true;
}

/** Upstream cloud base. In-cluster by default — no public hop for a server call. */
function cloudBaseUrl() {
  return (process.env.HANZO_CLOUD_URL || 'https://api.hanzo.ai').replace(/\/+$/, '');
}

/**
 * The credential for the on-behalf-of call to cloud, or null when the caller has
 * none. Mirrors the completion path's precedence exactly.
 * @param {import('express').Request} req
 * @returns {{ bearer: string, org: string|null }|null}
 */
function resolveCredential(req) {
  if (req.user?.guest === true) {
    const guestKey = process.env.GUEST_API_KEY || process.env.HANZO_API_KEY || '';
    return guestKey ? { bearer: guestKey, org: null } : null;
  }
  const bearer = resolveTenantBearer(req);
  return bearer ? { bearer, org: resolveActiveOrg(req) } : null;
}

/**
 * POST /v1/chat/ask — stream a grounded answer.
 *
 * Body: `{ q, mode?, model?, sources?, language?, maxSources?, followUps? }`.
 * Responds `text/event-stream`, relaying cloud's frames unchanged.
 */
router.post('/', requireGuestOrJwtAuth, guestMessageLimiter, async (req, res) => {
  const q = (req.body?.q ?? '').toString().trim();
  if (!q) {
    return res.status(400).json({ error: 'a question is required' });
  }
  if (q.length > MAX_QUERY) {
    return res.status(400).json({ error: `a question must be at most ${MAX_QUERY} characters` });
  }

  const mode = (req.body?.mode ?? 'search').toString().trim().toLowerCase();
  if (!WEB_MODES.has(mode)) {
    return res.status(400).json({ error: 'unknown mode' });
  }

  const credential = resolveCredential(req);
  if (!credential) {
    // Honest, actionable: the surface renders for everyone, but an answer is a
    // real metered cloud call and needs a real principal behind it.
    return res.status(401).json({
      error: 'Sign in with Hanzo to search — your Hanzo account funds this request.',
      code: 'ASK_SIGNIN_REQUIRED',
    });
  }

  // Deep/research modes cost several times a search and run far longer; a shared
  // guest key does not fund them.
  if (isGuestMode(req) && mode !== 'search' && mode !== 'news') {
    return res.status(403).json({ error: 'sign in to run research and deep modes' });
  }

  const sources = Array.isArray(req.body?.sources)
    ? req.body.sources
        .map((s) => (s ?? '').toString().trim().toLowerCase())
        .filter((s) => SOURCE_HINTS.has(s))
    : undefined;

  const upstream = {
    q,
    mode,
    stream: true,
    followUps: req.body?.followUps !== false,
  };
  // A guest is pinned to the guest model, exactly as the completion path pins it
  // (enforceGuestScope). The client only offers that one model, but the pin lives
  // here because the client is not the authority on what a shared key may spend.
  const isGuest = req.user?.guest === true;
  if (isGuest) {
    upstream.model = getGuestConfig().model;
  } else if (req.body?.model) {
    upstream.model = req.body.model.toString();
  }
  if (sources?.length) {
    upstream.sources = sources;
  }
  if (req.body?.language) {
    upstream.language = req.body.language.toString();
  }
  if (Number.isInteger(req.body?.maxSources)) {
    upstream.maxSources = req.body.maxSources;
  }

  const controller = new AbortController();
  // The browser going away must release the upstream socket; cloud's own loop is
  // bounded (90s) but chat should not hold a dead relay open.
  res.on('close', () => controller.abort());

  let cloudRes;
  try {
    cloudRes = await fetch(`${cloudBaseUrl()}/v1/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${credential.bearer}`,
        ...(credential.org ? { 'X-Org-Id': credential.org } : {}),
      },
      body: JSON.stringify(upstream),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      return;
    }
    logger.error('[ask] upstream request failed', err);
    return res.status(502).json({ error: 'the answer engine is unavailable' });
  }

  // A non-stream reply is always an error envelope (402 spend cap, 401, 5xx).
  // Pass the status through so the client can render the honest reason.
  if (!cloudRes.ok || !cloudRes.body) {
    const detail = await cloudRes.text().catch(() => '');
    logger.warn('[ask] upstream rejected', { status: cloudRes.status });
    res.status(cloudRes.status);
    res.set('Content-Type', cloudRes.headers.get('content-type') || 'application/json');
    return res.send(detail || JSON.stringify({ error: 'the answer engine is unavailable' }));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'identity');
  // Chat sits behind an ingress that will otherwise buffer the whole answer.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    for await (const chunk of cloudRes.body) {
      if (res.writableEnded) {
        break;
      }
      res.write(chunk);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      logger.warn('[ask] stream interrupted', { message: err.message });
    }
  }
  if (!res.writableEnded) {
    res.end();
  }
});

module.exports = router;
