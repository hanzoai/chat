const express = require('express');
const request = require('supertest');

// The authenticated principal requireJwtAuth injects for each test.
let mockCurrentUser = null;

jest.mock('~/server/controllers/UserController', () => ({
  updateUserPluginsController: (req, res) => res.json({}),
  resendVerificationController: (req, res) => res.json({}),
  getTermsStatusController: (req, res) => res.json({}),
  acceptTermsController: (req, res) => res.json({}),
  verifyEmailController: (req, res) => res.json({}),
  deleteUserController: (req, res) => res.json({}),
  getUserController: (req, res) => res.json({}),
}));

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, _res, next) => {
    req.user = mockCurrentUser;
    next();
  },
  requireGuestOrJwtAuth: (req, _res, next) => {
    req.user = mockCurrentUser;
    next();
  },
  verifyEmailLimiter: (req, _res, next) => next(),
  configMiddleware: (req, _res, next) => next(),
  canDeleteAccount: (req, _res, next) => next(),
}));

jest.mock('./settings', () => require('express').Router());

// The route imports only ACTIVE_ORG_COOKIE from the package barrel; mock it so the
// test stays a focused unit and doesn't boot the whole @hanzochat/api runtime
// (logger/data-schemas). The constant's value + resolveActiveOrg's read of it are
// covered by packages/api/src/endpoints/custom/activeOrg.spec.ts.
jest.mock('@hanzochat/api', () => ({ ACTIVE_ORG_COOKIE: 'hanzo_active_org' }));

const { ACTIVE_ORG_COOKIE } = require('@hanzochat/api');
const userRoutes = require('./user');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/chat/user', userRoutes);
  return app;
}

/** The Set-Cookie header for the active-org cookie, or undefined. */
function activeOrgCookie(res) {
  return (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${ACTIVE_ORG_COOKIE}=`));
}

describe('POST /v1/chat/user/active-org', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    mockCurrentUser = null;
  });

  it('sets the httpOnly cookie for the caller’s home org (owner)', async () => {
    mockCurrentUser = { organization: 'acme', groups: ['beta'] };
    const res = await request(app).post('/v1/chat/user/active-org').send({ organization: 'acme' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ organization: 'acme' });
    const cookie = activeOrgCookie(res);
    expect(cookie).toContain(`${ACTIVE_ORG_COOKIE}=acme`);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('sets the cookie for an org the caller belongs to via groups', async () => {
    mockCurrentUser = { organization: 'acme', groups: ['beta', 'gamma'] };
    const res = await request(app).post('/v1/chat/user/active-org').send({ organization: 'gamma' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ organization: 'gamma' });
    expect(activeOrgCookie(res)).toContain(`${ACTIVE_ORG_COOKIE}=gamma`);
  });

  it('rejects (400) an org outside the caller’s memberships and sets no cookie', async () => {
    mockCurrentUser = { organization: 'acme', groups: ['beta'] };
    const res = await request(app).post('/v1/chat/user/active-org').send({ organization: 'evil' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not in your memberships/i);
    expect(activeOrgCookie(res)).toBeUndefined();
  });

  it('rejects (400) a missing/blank organization', async () => {
    mockCurrentUser = { organization: 'acme', groups: ['beta'] };

    const missing = await request(app).post('/v1/chat/user/active-org').send({});
    expect(missing.status).toBe(400);
    expect(activeOrgCookie(missing)).toBeUndefined();

    const blank = await request(app).post('/v1/chat/user/active-org').send({ organization: '  ' });
    expect(blank.status).toBe(400);
  });

  it('rejects a non-home org when the caller has no groups (fail closed)', async () => {
    mockCurrentUser = { organization: 'acme' };

    const home = await request(app).post('/v1/chat/user/active-org').send({ organization: 'acme' });
    expect(home.status).toBe(200);

    const other = await request(app).post('/v1/chat/user/active-org').send({ organization: 'beta' });
    expect(other.status).toBe(400);
  });
});
