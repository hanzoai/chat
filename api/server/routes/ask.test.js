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
    expect(res.body.code).toBe('ASK_SIGNIN_REQUIRED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("attaches the user's IAM bearer and always names a web mode", async () => {
    mockResolveActiveOrg.mockReturnValue('acme');
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody([{ type: 'done', answer: 'a', sources: [] }]),
    });

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
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody([{ type: 'done', answer: 'a', sources: [] }]),
    });

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
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody([{ type: 'done', answer: 'a', sources: [] }]),
    });

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
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody([{ type: 'done', answer: 'a', sources: [] }]),
    });

    await request(app()).post('/v1/chat/ask').send({ q: 'hi', model: 'zen5-pro' });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.model).toBe('zen5-pro');
  });

  it('drops source hints cloud does not honor', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody([{ type: 'done', answer: 'a', sources: [] }]),
    });

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
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: sseBody(frames),
    });

    const res = await request(app()).post('/v1/chat/ask').send({ q: 'capital of japan' });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    for (const f of frames) {
      expect(res.text).toContain(`data: ${JSON.stringify(f)}`);
    }
    expect(res.text.trim().endsWith('data: [DONE]')).toBe(true);
  });

  it('passes an upstream refusal through with its status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 402,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => '{"error":{"code":"insufficient_balance"}}',
      body: null,
    });

    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(res.status).toBe(402);
    expect(res.text).toContain('insufficient_balance');
  });

  it('reports a transport failure as a 502 rather than a hung stream', async () => {
    global.fetch.mockRejectedValue(new Error('econnrefused'));
    const res = await request(app()).post('/v1/chat/ask').send({ q: 'hi' });
    expect(res.status).toBe(502);
  });
});
