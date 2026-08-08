const express = require('express');
const request = require('supertest');

/**
 * Proofs for the answer-engine relay. What matters is the CONTRACT with cloud's
 * `/v1/ask`: a validated credential is attached server-side, the web `mode` is
 * always named (an unmoded ask silently falls into cloud's figure advisor, not a
 * web search), and the upstream envelope reaches the browser byte-for-byte.
 */

let mockUser = null;

jest.mock('~/server/middleware', () => ({
  requireGuestOrJwtAuth: (req, res, next) => {
    if (!mockUser) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    req.user = mockUser;
    return next();
  },
  guestMessageLimiter: (req, res, next) => next(),
}));

jest.mock('~/server/services/guestConfig', () => ({
  getGuestConfig: () => ({ model: 'zen5-flash', endpoint: 'Hanzo', messageMax: 10 }),
}));

jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockResolveTenantBearer = jest.fn();
const mockResolveActiveOrg = jest.fn();
jest.mock('@hanzochat/api', () => ({
  resolveTenantBearer: (...a) => mockResolveTenantBearer(...a),
  resolveActiveOrg: (...a) => mockResolveActiveOrg(...a),
}));

const askRoute = require('./ask');

/** An SSE body as cloud sends it: data-only frames, `[DONE]` sentinel. */
function sseBody(frames) {
  const text = frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

/** A fresh 200 SSE response per call — a ReadableStream can only be read once. */
function mockOk(frames = [{ type: 'done', answer: 'a', sources: [] }]) {
  global.fetch.mockImplementation(async () => ({
    ok: true,
    status: 200,
    headers: new Map(),
    body: sseBody(frames),
  }));
}

function app() {
  const a = express();
  a.use(express.json());
  a.use('/v1/chat/ask', askRoute);
  return a;
}

describe('POST /v1/chat/ask', () => {
  beforeEach(() => {
    mockUser = { id: 'u1', provider: 'openid', openidId: 'sub-1' };
    mockResolveTenantBearer.mockReset().mockReturnValue('iam-jwt');
    mockResolveActiveOrg.mockReset().mockReturnValue(null);
    delete process.env.GUEST_API_KEY;
    delete process.env.HANZO_API_KEY;
    process.env.HANZO_CLOUD_URL = 'http://cloud.test:8000';
    global.fetch = jest.fn();
  });

  it('rejects an empty question before any upstream call', async () => {
    const res = await request(app()).post('/v1/chat/ask').send({ q: '   ' });
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an unknown mode before any upstream call', async () => {
    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi', mode: 'telepathy' });
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('401s with no forwardable bearer instead of calling cloud unauthenticated', async () => {
    mockResolveTenantBearer.mockReturnValue(null);
    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(res.status).toBe(401);
    // This caller HAS a session, and reaching here means renewal ALREADY ran and
    // failed (`currentBearer`), which deletes the refresh credential from the
    // session. Nothing in that session can recover — so the honest answer is "sign
    // in again", with the button that actually performs it. It previously said
    // "reload the page", advice that could not work once durable refresh existed:
    // a reload replays a session whose refresh credential was just discarded.
    expect(res.body.code).toBe('ASK_SIGNIN_REQUIRED');
    expect(res.body.error).toMatch(/sign in again/i);
    expect(res.body.error).not.toMatch(/reload the page/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("attaches the user's IAM bearer and always names a web mode", async () => {
    mockResolveActiveOrg.mockReturnValue('acme');
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'who won' });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('http://cloud.test:8000/v1/ask');
    expect(init.headers.Authorization).toBe('Bearer iam-jwt');
    expect(init.headers['X-Org-Id']).toBe('acme');
    const body = JSON.parse(init.body);
    // Named mode is the whole point: without it cloud runs the figure advisor.
    expect(body.mode).toBe('search');
    expect(body.q).toBe('who won');
    expect(body.stream).toBe(true);
  });

  it('uses the shared guest key for a guest, and sends no org', async () => {
    mockUser = { id: 'guest_1', guest: true };
    process.env.GUEST_API_KEY = 'hk-guest';
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'hi' });

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer hk-guest');
    expect(init.headers['X-Org-Id']).toBeUndefined();
    // A guest's key must never be resolved through the tenant-bearer path.
    expect(mockResolveTenantBearer).not.toHaveBeenCalled();
  });

  it('pins a guest to the guest model, ignoring a premium model they asked for', async () => {
    mockUser = { id: 'guest_1', guest: true };
    process.env.GUEST_API_KEY = 'hk-guest';
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', model: 'zen5-pro' });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // The shared key must never fund a model the guest scope does not allow.
    expect(body.model).toBe('zen5-flash');
  });

  it('refuses the expensive modes for a guest', async () => {
    mockUser = { id: 'guest_1', guest: true };
    process.env.GUEST_API_KEY = 'hk-guest';
    for (const mode of ['research', 'deep']) {
      const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi', mode });
      expect(res.status).toBe(403);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("honors a signed-in caller's model choice", async () => {
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', model: 'zen5-pro' });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.model).toBe('zen5-pro');
  });

  it('drops source hints cloud does not honor', async () => {
    mockOk();

    await request(app())
      .post('/v1/chat/ask')
      .send({ q: 'hi', sources: ['github', 'myspace', 'NEWS'] });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.sources).toEqual(['github', 'news']);
  });

  it('relays the upstream envelope verbatim', async () => {
    const frames = [
      { type: 'status', stage: 'searching' },
      { type: 'sources', sources: [{ url: 'https://e.com', title: 'E' }] },
      { type: 'text', delta: 'Tokyo' },
      { type: 'follow_ups', questions: ['why?'] },
      { type: 'done', answer: 'Tokyo', sources: [] },
    ];
    mockOk(frames);

    const res = await request(app()).post('/v1/chat/ask').send({ q: 'capital of japan' });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    for (const f of frames) {
      expect(res.text).toContain(`data: ${JSON.stringify(f)}`);
    }
    expect(res.text.trim().endsWith('data: [DONE]')).toBe(true);
  });

  it('passes an upstream refusal status through WITHOUT its body', async () => {
    // An intermediary answering with text/html must never become a same-origin
    // markup sink; this route answers SSE or one JSON shape, nothing else.
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Map([['content-type', 'text/html']]),
      text: async () => '<script>alert(document.domain)</script>',
      body: null,
    });

    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(res.status).toBe(502);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<script>');
    expect(JSON.parse(res.text).error).toBe('The answer engine is unavailable right now.');
  });

  it('clamps maxSources so it cannot multiply spend on the shared key', async () => {
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', maxSources: 100000 });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).maxSources).toBe(32);

    global.fetch.mockClear();
    await request(app()).post('/v1/chat/ask').send({ q: 'hi', maxSources: -5 });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).maxSources).toBe(1);
  });

  // The ceiling is a guard against an unbounded number, not a budget — cloud's
  // per-mode budget is the budget. Pinned at research's 32 because a lower number
  // here is applied BEFORE cloud sees the request, so cloud cannot restore what
  // chat has already taken away: at 16 the deepest mode was silently halved.
  it('does not clamp research below the breadth cloud grants it', async () => {
    mockOk();

    await request(app())
      .post('/v1/chat/ask')
      .send({ q: 'hi', mode: 'research', maxSources: 32 });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).maxSources).toBe(32);
  });

  // The deadline here is a backstop against an upstream that never finishes, so it
  // has to sit ABOVE the longest answer cloud will legitimately produce — research
  // iterates its survey for up to 300s (apps/answer/mode.go). It regressed once by
  // a COMMENT drifting ("cloud bounds its own loop at 90s", true only of the fast
  // modes) while the number stayed at 120s, which is why the bound is asserted here
  // and not just described: chat aborted a live research stream mid-report, and the
  // user paid for work cloud had already finished.
  it('waits longer than cloud will spend on the deepest mode', async () => {
    mockOk();
    const timeout = jest.spyOn(AbortSignal, 'timeout');

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', mode: 'research' });

    expect(timeout).toHaveBeenCalled();
    expect(Math.max(...timeout.mock.calls.map(([ms]) => ms))).toBeGreaterThan(300000);
    timeout.mockRestore();
  });

  it('forwards only a well-formed language tag', async () => {
    mockOk();

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', language: 'x'.repeat(5000) });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).language).toBeUndefined();

    global.fetch.mockClear();
    await request(app()).post('/v1/chat/ask').send({ q: 'hi', language: 'en-GB' });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).language).toBe('en-GB');
  });

  it('marks every refusal that signing in would fix, and only those', async () => {
    // The client renders its sign-in CTA on this code alone, so a refusal that
    // signing in CANNOT fix must not carry it.
    mockResolveTenantBearer.mockReturnValue(null);

    // No session at all — the one state signing in actually resolves.
    mockUser = { id: 'guest_1', guest: true };
    const noBearer = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(noBearer.status).toBe(401);
    expect(noBearer.body.code).toBe('ASK_SIGNIN_REQUIRED');

    // A caller who IS signed in carries it too, now that renewal runs first: their
    // credential expired AND `currentBearer` could not renew it, which discards the
    // refresh credential. Nothing in that session can recover, so signing in again
    // is precisely what fixes it — and the button is the only way to offer that.
    mockUser = { id: 'u1', provider: 'openid', openidId: 'sub-1' };
    const staleBearer = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(staleBearer.status).toBe(401);
    expect(staleBearer.body.code).toBe('ASK_SIGNIN_REQUIRED');

    mockUser = { id: 'guest_1', guest: true };
    process.env.GUEST_API_KEY = 'hk-guest';
    const paidMode = await request(app()).post('/v1/chat/ask').send({ q: 'hi', mode: 'deep' });
    expect(paidMode.status).toBe(403);
    expect(paidMode.body.code).toBe('ASK_SIGNIN_REQUIRED');

    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Map(),
      text: async () => '{"error":"sign in to ask"}',
      body: null,
    });
    const upstream401 = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(upstream401.status).toBe(401);
    expect(upstream401.body.code).toBe('ASK_SIGNIN_REQUIRED');

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Map(),
      text: async () => 'boom',
      body: null,
    });
    const upstream500 = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(upstream500.body.code).toBeUndefined();
  });

  it('never relays a status that would strip the JSON body', async () => {
    // Express sends no body for 204/304, so the client would render a generic
    // failure instead of the real reason.
    for (const status of [204, 304]) {
      global.fetch.mockResolvedValue({
        ok: false,
        status,
        headers: new Map(),
        text: async () => '',
        body: null,
      });
      const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
      expect(res.status).toBe(502);
      expect(JSON.parse(res.text).error).toBeTruthy();
    }
  });

  it('reports a transport failure as a 502 rather than a hung stream', async () => {
    global.fetch.mockRejectedValue(new Error('econnrefused'));
    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(res.status).toBe(502);
  });
});
