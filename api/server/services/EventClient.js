const { createAnalytics } = require('@hanzo/event');

/**
 * EventClient is the server half of the ONE telemetry surface. The browser posts
 * to the ONE front door (POST {host}/v1/event, body {batch:[Event,…]}) through
 * @hanzogui/telemetry; this posts the SAME events, built by the SAME library, to
 * the SAME door. Server and browser rows differ in exactly one field, `source`.
 *
 * It is a REPORTER, not a second endpoint and not a second error tracker: there
 * is no Sentry SDK here and no DSN. @hanzo/event's error plane resolves a DSN
 * from the product registry, which has no `chat` key, so that plane stays inert
 * by construction — chat's errors land as `type:'error'` rows in the event
 * warehouse (GET /v1/errors) and nowhere else.
 *
 * Fail-soft is the whole contract. Nothing here throws, nothing awaits, nothing
 * delays a response: a capture builds an event, hands it to a fire-and-forget
 * fetch with a short timeout, and returns. With no HANZO_INGEST_KEY it is a
 * no-op — no client is built and no request is made.
 */

/** The one door. Same default as the browser client. */
const DEFAULT_HOST = 'https://api.hanzo.ai';

/** The only field that distinguishes a server event from a browser one. */
const SOURCE = 'server';

/** A report is never worth holding a socket open for. */
const TIMEOUT_MS = 3000;

/**
 * Stamps `source` onto every event in a serialized batch. This is the ONE place
 * the server's events are marked as such — @hanzo/event builds the wire, we add
 * the single field it has no opinion about. An unparseable body is sent through
 * unchanged: an unstamped report beats a dropped one.
 *
 * @param {string} body - the serialized `{batch:[…]}` @hanzo/event produced
 * @returns {string}
 */
function stampSource(body) {
  try {
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed.batch)) {
      return body;
    }
    parsed.batch = parsed.batch.map((event) => ({ ...event, source: SOURCE }));
    return JSON.stringify(parsed);
  } catch {
    return body;
  }
}

/**
 * ServerTransport replaces the browser transport (sendBeacon/keepalive fetch,
 * neither of which means anything here) with a plain bounded fetch. Synchronous
 * and void by interface, so a capture can never block its caller.
 */
class ServerTransport {
  send(url, body, opts) {
    const headers = { 'Content-Type': opts.contentType ?? 'application/json' };
    const bearer = opts.ingestKey ?? opts.token;
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    let signal;
    try {
      signal = AbortSignal.timeout(TIMEOUT_MS);
    } catch {
      signal = undefined;
    }

    try {
      // No await, no rejection escape: telemetry loss is invisible to the app.
      fetch(url, { method: 'POST', headers, body: stampSource(body), signal }).catch(() => {});
    } catch {
      /* fetch itself unavailable — stay silent */
    }
  }
}

let client;
let resolved = false;

/**
 * The process-wide client, built once on first capture. Absent an ingest key
 * there is nothing to authenticate with, so nothing is built and every capture
 * is a no-op.
 *
 * @returns {import('@hanzo/event').Analytics | undefined}
 */
function getClient() {
  if (resolved) {
    return client;
  }
  resolved = true;

  const ingestKey = (process.env.HANZO_INGEST_KEY || '').trim();
  if (!ingestKey) {
    return undefined;
  }

  client = createAnalytics({
    host: (process.env.HANZO_API_URL || DEFAULT_HOST).replace(/\/+$/, ''),
    product: 'chat',
    ingestKey,
    // Global handlers are the caller's job here (see index.js) — and this client
    // never runs in a browser, where that option's listeners live.
    captureErrors: false,
    transport: new ServerTransport(),
  });
  return client;
}

/**
 * Reports one exception to the front door. Safe to call with anything thrown.
 *
 * @param {unknown} err
 * @param {{ handled?: boolean, properties?: Record<string, unknown> }} [context]
 */
function captureServerError(err, context) {
  try {
    getClient()?.captureError(err, context);
  } catch {
    /* a reporter that can break the thing it reports on is worse than no reporter */
  }
}

/**
 * The Express hook: ONE pass-through error middleware, mounted immediately
 * before ErrorController so every error that reaches the app's boundary is
 * reported and then handled exactly as it was before. It observes; it never
 * responds and never swallows.
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorTelemetry(err, req, _res, next) {
  captureServerError(err, {
    handled: false,
    properties: {
      method: req.method,
      // Path only — a query string can carry tokens and PII.
      path: typeof req.originalUrl === 'string' ? req.originalUrl.split('?')[0] : undefined,
      status: err?.statusCode ?? err?.status,
      userId: req.user?.id,
    },
  });
  return next(err);
}

/** Test seam: forget the memoized client so the next capture re-reads the env. */
function resetEventClient() {
  client = undefined;
  resolved = false;
}

module.exports = { captureServerError, errorTelemetry, resetEventClient };
