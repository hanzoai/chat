const express = require('express');
const request = require('supertest');

jest.mock('@hanzochat/api', () => ({
  limiterCache: () => undefined,
}));

jest.mock('~/server/utils', () => ({
  removePorts: (req) => req.headers['x-test-ip'] || req.ip,
}));

jest.mock('~/server/services/guestConfig', () => ({
  getGuestConfig: jest.fn(),
}));

const { getGuestConfig } = require('~/server/services/guestConfig');
const { guestMessageLimiter } = require('./guestMessageLimiter');

const buildApp = (user) => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(guestMessageLimiter);
  app.post('/chat', (_req, res) => res.status(200).json({ ok: true }));
  return app;
};

describe('guestMessageLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGuestConfig.mockReturnValue({
      enabled: true,
      messageMax: 3,
      endpoint: 'Hanzo',
      model: 'zen3-nano',
    });
  });

  it('allows up to GUEST_MESSAGE_MAX guest messages then returns 402 GUEST_LIMIT', async () => {
    const app = buildApp({ id: 'g1', guest: true });
    const ip = '10.0.0.1';

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/chat').set('x-test-ip', ip);
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/chat').set('x-test-ip', ip);
    expect(blocked.status).toBe(402);
    expect(blocked.body.type).toBe('GUEST_LIMIT');
  });

  it('counts quota per IP independently', async () => {
    const app = buildApp({ id: 'g1', guest: true });

    for (let i = 0; i < 3; i++) {
      await request(app).post('/chat').set('x-test-ip', '10.0.0.2');
    }
    const blocked = await request(app).post('/chat').set('x-test-ip', '10.0.0.2');
    expect(blocked.status).toBe(402);

    const fresh = await request(app).post('/chat').set('x-test-ip', '10.0.0.3');
    expect(fresh.status).toBe(200);
  });

  it('never counts or blocks authenticated (non-guest) users', async () => {
    const app = buildApp({ id: 'real-user', role: 'USER' });

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/chat').set('x-test-ip', '10.0.0.4');
      expect(res.status).toBe(200);
    }
  });
});
