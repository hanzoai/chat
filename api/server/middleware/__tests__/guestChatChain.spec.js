/**
 * Integration test for the guest chat middleware chain composition:
 * guest auth -> scope enforcement -> quota, plus the reserved-subpath guard
 * that keeps management routes (abort/active/...) on the JWT-only parent router.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

jest.mock('@hanzochat/api', () => ({
  isEnabled: (value) => value === 'true' || value === true,
  limiterCache: () => undefined,
}));

jest.mock('librechat-data-provider', () => ({
  EModelEndpoint: { custom: 'custom', agents: 'agents' },
}));

jest.mock('~/server/utils', () => ({
  removePorts: (req) => req.headers['x-test-ip'] || req.ip,
}));

jest.mock('../requireJwtAuth', () =>
  jest.fn((req, res, next) => {
    req.user = { id: 'real-user', role: 'USER' };
    next();
  }),
);

const requireGuestOrJwtAuth = require('../requireGuestOrJwtAuth');
const enforceGuestScope = require('../enforceGuestScope');
const { guestMessageLimiter } = require('../limiters/guestMessageLimiter');

const JWT_SECRET = 'test-guest-secret';

const buildRouter = () => {
  const router = express.Router();
  const RESERVED = new Set(['abort', 'active']);

  const chatRouter = express.Router();
  chatRouter.use((req, res, next) => {
    const subpath = req.path.split('/').filter(Boolean)[0];
    if (RESERVED.has(subpath)) {
      return next('router');
    }
    return next();
  });
  chatRouter.use(requireGuestOrJwtAuth);
  chatRouter.use(enforceGuestScope);
  chatRouter.use(guestMessageLimiter);
  chatRouter.post('/', (req, res) =>
    res
      .status(200)
      .json({ endpoint: req.body.endpoint, model: req.body.model, role: req.user.role }),
  );
  router.use('/chat', chatRouter);

  // JWT-only management route on the parent (after the guest router)
  router.post('/chat/abort', require('../requireJwtAuth'), (req, res) =>
    res.status(200).json({ aborted: true, role: req.user.role }),
  );

  return router;
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/agents', buildRouter());
  return app;
};

const guestToken = () => jwt.sign({ id: 'guest_1', guest: true, role: 'GUEST' }, JWT_SECRET);

describe('guest chat middleware chain', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ALLOW_GUEST_CHAT = 'true';
    process.env.GUEST_MESSAGE_MAX = '2';
    process.env.GUEST_ENDPOINT = 'Hanzo';
    process.env.GUEST_MODEL = 'zen3-nano';
  });

  afterEach(() => {
    delete process.env.ALLOW_GUEST_CHAT;
    delete process.env.GUEST_MESSAGE_MAX;
    delete process.env.GUEST_ENDPOINT;
    delete process.env.GUEST_MODEL;
  });

  it('lets a guest reach the completion route, pinned to the free endpoint/model', async () => {
    const res = await request(buildApp())
      .post('/api/agents/chat')
      .set('Authorization', `Bearer ${guestToken()}`)
      .set('x-test-ip', '10.1.0.1')
      .send({ endpoint: 'Hanzo', model: 'zen3-nano', text: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ endpoint: 'Hanzo', model: 'zen3-nano', role: 'GUEST' });
  });

  it('returns 402 GUEST_LIMIT after the quota is exhausted', async () => {
    const app = buildApp();
    const ip = '10.1.0.2';
    const send = () =>
      request(app)
        .post('/api/agents/chat')
        .set('Authorization', `Bearer ${guestToken()}`)
        .set('x-test-ip', ip)
        .send({ endpoint: 'Hanzo', model: 'zen3-nano', text: 'hi' });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const blocked = await send();
    expect(blocked.status).toBe(402);
    expect(blocked.body.type).toBe('GUEST_LIMIT');
  });

  it('routes reserved /chat/abort to the JWT-only handler, not the guest router', async () => {
    const res = await request(buildApp())
      .post('/api/agents/chat/abort')
      .set('Authorization', `Bearer ${guestToken()}`)
      .set('x-test-ip', '10.1.0.3')
      .send({ streamId: 'x' });
    // requireJwtAuth mock forces a real USER; guest never reaches abort.
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ aborted: true, role: 'USER' });
  });
});
