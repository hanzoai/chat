const express = require('express');
const { Readable, pipeline } = require('stream');
const { logger } = require('@hanzochat/data-schemas');
const { resolveActiveOrg, resolveTenantBearer } = require('@hanzochat/api');
const { requireGuestOrJwtAuth, guestMessageLimiter } = require('~/server/middleware');
const { getGuestConfig } = require('~/server/services/guestConfig');
const { upstreamMessage, needsSignIn, SIGNIN_REQUIRED } = require('./askMessage');

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

/**
 * Modes a guest may run. Research and deep gather a far wider source set and run
 * several times longer, and a guest spends a SHARED balance — so they are the
 * paid modes. Declared here, beside WEB_MODES, because this is the authority; the
 * client's chip filter is a display of the same names.
 */
const GUEST_MODES = new Set(['search', 'news']);

/**
 * Upper bound on grounding sources. Cloud is the authority on what each mode may
 * gather (apps/answer/mode.go) and clamps to it; this is only the guard that an
 * UNBOUNDED number never leaves chat and becomes a spend multiplier on the shared
 * key. So it is sized to the widest mode cloud offers — research, at 32 — and
 * never to a number below it: at 16 this clamp silently HALVED the one mode whose
 * whole value is breadth, and it did so before cloud ever saw the request, so
 * cloud's own budget could not correct it. One ceiling, not a copy of cloud's
 * per-mode table, because a copy is a thing that drifts.
 */
const MAX_SOURCES = 32;

/** `@source` hints cloud honors; everything else is dropped upstream anyway. */
const SOURCE_HINTS = new Set(['news', 'academic', 'github', 'reddit', 'x']);

/**
 * Ceiling on a single relayed answer — a BACKSTOP against an upstream that never
 * finishes, not a second opinion on how long an answer may take. Cloud bounds each
 * mode itself (apps/answer/mode.go: 90s for search/news, 300s for research), so
 * this only has to sit above the LONGEST of them; below it, chat becomes the thing
 * that kills the answer.
 *
 * It was 120s against a comment claiming cloud stopped at 90s. That was true of
 * search and news and never of research, which iterates its survey over six rounds
 * and is allowed 300s. A measured research answer — six rounds, 30 searches, 14
 * pages read, 32 sources — took 74s, so the old ceiling was not a wide margin over
 * research, it was under half of research's budget and a heavier question crossed
 * it. The user then saw a stream that started, delivered sources and part of a
 * report, and stopped mid-sentence: the failure looks like a broken product and
 * bills like a complete answer, because cloud has already done and charged for the
 * work when chat hangs up.
 *
 * 330s is 300s plus the headroom for cloud to write its terminal frame. Sizing it
 * to the deepest mode costs the fast modes nothing — cloud returns to them at 90s,
 * so this deadline is never what ends a search.
 */
const UPSTREAM_TIMEOUT_MS = 330000;

/** Cloud truncates at 2000; reject earlier so an oversized body never leaves chat. */
const MAX_QUERY = 2000;

/**
 * The status this route answers with for an upstream refusal. Only codes the
 * client can act on are passed through; anything else becomes 502. An upstream
 * (or an intermediary) answering 204/304 would otherwise make Express drop the
 * JSON body entirely and the client would render a generic failure instead of
 * the real reason.
 */
function relayStatus(status) {
  return [401, 402, 403, 429].includes(status) ? status : 502;
}

/** Is this request an anonymous guest (shared key, shared balance)? */
function isGuest(req) {
  return req.user?.guest === true;
}

/** Upstream cloud base. In-cluster by default — no public hop for a server call. */
function cloudBaseUrl() {
  return (process.env.HANZO_CLOUD_URL || 'https://api.hanzo.ai').replace(/\/+$/, '');
}

/**
 * The credential for the on-behalf-of call to cloud, or null when the caller has
 * none. Mirrors the completion path's precedence exactly.
 *
 * `resolveTenantBearer` is the ONE selector both surfaces share — this route adds
 * only what is its own: the guest key and the selected org.
 * @param {import('express').Request} req
 * @returns {{ bearer: string, org: string|null }|null}
 */
function resolveCredential(req) {
  if (isGuest(req)) {
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
    // real metered cloud call and needs a real principal behind it. SIGNIN_REQUIRED
    // drives the client's "Sign in" button; needsSignIn is the ONE place that
    // decides who earns it. Reaching here means the caller presented no bearer,
    // so the button is the only thing that helps them.
    const signedIn = req.user != null && !isGuest(req);
    const body = { error: upstreamMessage(401, signedIn) };
    if (needsSignIn(401, signedIn)) {
      body.code = SIGNIN_REQUIRED;
    }
    return res.status(401).json(body);
  }

  // The paid modes are not funded by the shared guest key.
  const guest = isGuest(req);
  if (guest && !GUEST_MODES.has(mode)) {
    return res
      .status(403)
      .json({ error: 'Sign in to run research and deep modes.', code: SIGNIN_REQUIRED });
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
  if (guest) {
    upstream.model = getGuestConfig().model;
  } else if (req.body?.model) {
    upstream.model = req.body.model.toString();
  }
  if (sources?.length) {
    upstream.sources = sources;
  }
  // Both are cost inputs on a key this process is responsible for. Cloud clamps
  // them too, but chat does not forward an unbounded number or an arbitrary
  // string just because cloud would cope.
  const language = (req.body?.language ?? '').toString().trim();
  if (/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(language)) {
    upstream.language = language;
  }
  if (Number.isInteger(req.body?.maxSources)) {
    upstream.maxSources = Math.min(Math.max(req.body.maxSources, 1), MAX_SOURCES);
  }

  const controller = new AbortController();
  let clientGone = false;
  // Two independent ways this call must end: the browser going away, and the
  // upstream simply never finishing. Cloud bounds its own loop, but that is not a
  // property this process can enforce, so chat keeps its own deadline.
  res.on('close', () => {
    clientGone = true;
    controller.abort();
  });
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);

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
      signal,
    });
  } catch (err) {
    if (clientGone) {
      return;
    }
    logger.error('[ask] upstream request failed', err);
    return res.status(502).json({ error: 'the answer engine is unavailable' });
  }

  // A non-stream reply is always an error envelope (402 spend cap, 401, 5xx). The
  // STATUS is passed through so the client can render the honest reason, but the
  // body is not: an intermediary answering 502 with text/html would otherwise make
  // this route a same-origin sink for upstream-controlled markup. This endpoint
  // answers with SSE or with this one JSON shape, nothing else.
  if (!cloudRes.ok || !cloudRes.body) {
    const detail = await cloudRes.text().catch(() => '');
    logger.warn('[ask] upstream rejected', {
      status: cloudRes.status,
      detail: detail.slice(0, 500),
    });
    const status = relayStatus(cloudRes.status);
    const signedIn = req.user != null && !isGuest(req);
    const body = { error: upstreamMessage(status, signedIn) };
    if (needsSignIn(status, signedIn)) {
      body.code = SIGNIN_REQUIRED;
    }
    return res.status(status).json(body);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'identity');
  // Chat sits behind an ingress that will otherwise buffer the whole answer.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // pipeline gives backpressure (a slow reader cannot make this process buffer the
  // whole answer), error propagation, and the end() in one call — at replicas: 1
  // an unbounded write queue is the whole process's memory.
  await new Promise((resolve) => {
    pipeline(Readable.fromWeb(cloudRes.body), res, (err) => {
      // On a pipeline error Node destroys res, which emits 'close' and aborts the
      // controller — so the signal alone cannot tell "we cancelled" from "the
      // stream broke". The flag is set only by the client actually going away.
      if (err && !clientGone) {
        logger.warn('[ask] stream interrupted', { message: err.message });
      }
      resolve();
    });
  });
});

module.exports = router;
