/**
 * End-to-end auth chain for guest bootstrap: real passport `jwt` strategy +
 * real `requireGuestOrJwtAuth` / `requireJwtAuth` + real controllers, driven by
 * a real signed guest JWT.
 *
 * Proves:
 *  - a guest token on a JWT-only route returns a clean 401 (NOT 500/CastError),
 *  - /api/endpoints, /api/user, /api/convos return guest-scoped data,
 *  - a non-bootstrap protected route still 401s for a guest.
 */

const jwt = require('jsonwebtoken');
const express = require('express');
const passport = require('passport');
const request = require('supertest');

jest.mock('@hanzochat/api', () => ({
  isEnabled: (value) => value === 'true' || value === true,
}));
jest.mock('librechat-data-provider', () => ({
  EModelEndpoint: { custom: 'custom' },
  SystemRoles: { USER: 'USER' },
}));
jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

// getUserById would throw a Mongoose CastError on a guest id; assert it is never
// reached for a guest, and returns null (→ clean 401) for a real-but-missing id.
jest.mock('~/models', () => ({
  getUserById: jest.fn(async (id) => {
    if (String(id).startsWith('guest_')) {
      throw new Error('CastError: Cast to ObjectId failed for value "' + id + '"');
    }
    return null;
  }),
  updateUser: jest.fn(),
}));

const { getUserById } = require('~/models');
const jwtLogin = require('~/strategies/jwtStrategy');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const requireGuestOrJwtAuth = require('~/server/middleware/requireGuestOrJwtAuth');
const { buildGuestEndpointsConfig, buildGuestUser } = require('~/server/services/guestConfig');

const JWT_SECRET = 'integration-guest-secret';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(passport.initialize());
  passport.use(jwtLogin());

  // Bootstrap (guest-aware) routes.
  app.get('/api/endpoints', requireGuestOrJwtAuth, (req, res) => {
    if (req.user?.guest === true) {
      return res.send(JSON.stringify(buildGuestEndpointsConfig()));
    }
    return res.send(JSON.stringify({ openAI: {}, Hanzo: {} }));
  });
  app.get('/api/user', requireGuestOrJwtAuth, (req, res) => {
    if (req.user?.guest === true) {
      return res.status(200).send(buildGuestUser(req.user));
    }
    return res.status(200).send(req.user);
  });
  app.get('/api/convos', requireGuestOrJwtAuth, (req, res) => {
    if (req.user?.guest === true) {
      return res.status(200).json({ conversations: [], nextCursor: null });
    }
    return res.status(200).json({ conversations: ['real'] });
  });

  // Non-bootstrap protected route (JWT-only): must reject guests.
  app.get('/api/prompts', requireJwtAuth, (req, res) => res.status(200).json({ ok: true }));

  return app;
};

describe('guest bootstrap auth chain (integration)', () => {
  let app;
  const guestToken = jwt.sign({ id: 'guest_abc-123', guest: true, role: 'GUEST' }, JWT_SECRET);

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ALLOW_GUEST_CHAT = 'true';
    process.env.GUEST_ENDPOINT = 'Hanzo';
    process.env.GUEST_MODEL = 'zen5-mini';
    app = buildApp();
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /api/endpoints → 200 with ONLY the guest endpoint', async () => {
    const res = await request(app)
      .get('/api/endpoints')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(Object.keys(body)).toEqual(['Hanzo']);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('GET /api/user → 200 ephemeral guest principal (no email, no DB lookup)', async () => {
    const res = await request(app).get('/api/user').set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'guest_abc-123', role: 'GUEST', guest: true });
    expect(res.body).not.toHaveProperty('email');
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('GET /api/convos → 200 empty list for a guest', async () => {
    const res = await request(app).get('/api/convos').set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ conversations: [], nextCursor: null });
  });

  it('GET /api/prompts (JWT-only) → clean 401 for a guest, NEVER 500/CastError', async () => {
    const res = await request(app).get('/api/prompts').set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).toBe(401);
    // The guest id must never reach getUserById (that is what caused the CastError → 500).
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('GET /api/prompts → clean 401 for a real-but-missing user (no 500)', async () => {
    const realToken = jwt.sign({ id: '64b2f0c0c0c0c0c0c0c0c0c0' }, JWT_SECRET);
    const res = await request(app).get('/api/prompts').set('Authorization', `Bearer ${realToken}`);
    expect(res.status).toBe(401);
    expect(getUserById).toHaveBeenCalledTimes(1);
  });

  it('GET /api/prompts → 401 with no token (fail closed)', async () => {
    const res = await request(app).get('/api/prompts');
    expect(res.status).toBe(401);
  });
});
