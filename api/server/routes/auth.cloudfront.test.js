const express = require('express');
const request = require('supertest');

const mockForceRefreshCloudFrontAuthCookies = jest.fn();

jest.mock('@hanzochat/api', () => ({
  ...jest.requireActual('@hanzochat/api'),
  createSetBalanceConfig: jest.fn(() => (req, res, next) => next()),
  forceRefreshCloudFrontAuthCookies: (...args) => mockForceRefreshCloudFrontAuthCookies(...args),
}));

jest.mock('~/server/controllers/AuthController', () => ({
  refreshController: jest.fn((req, res) => res.status(200).end()),
  registrationController: jest.fn((req, res) => res.status(200).end()),
  resetPasswordController: jest.fn((req, res) => res.status(200).end()),
  resetPasswordRequestController: jest.fn((req, res) => res.status(200).end()),
  graphTokenController: jest.fn((req, res) => res.status(200).end()),
}));

jest.mock('~/server/controllers/TwoFactorController', () => ({
  enable2FA: jest.fn((req, res) => res.status(200).end()),
  verify2FA: jest.fn((req, res) => res.status(200).end()),
  confirm2FA: jest.fn((req, res) => res.status(200).end()),
  disable2FA: jest.fn((req, res) => res.status(200).end()),
  regenerateBackupCodes: jest.fn((req, res) => res.status(200).end()),
}));

jest.mock('~/server/controllers/auth/TwoFactorAuthController', () => ({
  verify2FAWithTempToken: jest.fn((req, res) => res.status(200).end()),
}));

jest.mock('~/server/controllers/auth/LogoutController', () => ({
  logoutController: jest.fn((req, res) => res.status(200).end()),
}));

jest.mock('~/models', () => ({
  findBalanceByUser: jest.fn(),
  upsertBalanceFields: jest.fn(),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn(),
}));

/**
 * Every middleware is a no-op except the ones named here. A LIST of middleware
 * names has to be kept in step with whatever the router mounts — miss one and
 * express refuses the whole router at import with `argument handler must be a
 * function`, so the suite reports zero tests instead of a failure anyone can
 * read. Anything not named below passes through.
 */
jest.mock('~/server/middleware', () => {
  const pass = (req, res, next) => next();
  const named = {
      logHeaders: pass,
      loginLimiter: pass,
      checkBan: pass,
      requireLocalAuth: pass,
      requireLdapAuth: pass,
      registerLimiter: pass,
      checkInviteUser: pass,
      validateRegistration: pass,
      resetPasswordLimiter: pass,
      validatePasswordReset: pass,
      requireJwtAuth: jest.fn((req, res, next) => {
        if (req.headers.authorization !== 'Bearer ok') {
          return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = { _id: 'user123', tenantId: 'tenantA' };
        if (req.headers['x-cloudfront-warmed'] === 'true') {
          req.cloudFrontAuthCookieRefreshResult = {
            enabled: true,
            attempted: true,
            refreshed: true,
            expiresInSec: 1800,
            refreshAfterSec: 1500,
          };
        }
        return next();
      }),
  };
  return new Proxy(named, {
    get: (target, key) => {
      if (key in target) {
        return target[key];
      }
      // Never answer the interop probes — a thenable module breaks `require`.
      if (typeof key !== 'string' || key === 'then' || key === '__esModule') {
        return undefined;
      }
      return pass;
    },
  });
});

const authRouter = require('./auth');

describe('POST /v1/chat/auth/cloudfront/refresh', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/v1/chat/auth', authRouter);
  });

  it('requires authentication', async () => {
    await request(app).post('/v1/chat/auth/cloudfront/refresh').expect(401);

    expect(mockForceRefreshCloudFrontAuthCookies).not.toHaveBeenCalled();
  });

  it('returns 404 when CloudFront cookie mode is disabled', async () => {
    mockForceRefreshCloudFrontAuthCookies.mockReturnValue({
      enabled: false,
      attempted: false,
      refreshed: false,
      reason: 'cloudfront_disabled',
    });

    const response = await request(app)
      .post('/v1/chat/auth/cloudfront/refresh')
      .set('Authorization', 'Bearer ok')
      .expect(404);

    expect(response.status).toBe(404);
  });

  it('returns cookie refresh timing when CloudFront cookies are refreshed', async () => {
    mockForceRefreshCloudFrontAuthCookies.mockReturnValue({
      enabled: true,
      attempted: true,
      refreshed: true,
      expiresInSec: 1800,
      refreshAfterSec: 1500,
    });

    const response = await request(app)
      .post('/v1/chat/auth/cloudfront/refresh')
      .set('Authorization', 'Bearer ok')
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      expiresInSec: 1800,
      refreshAfterSec: 1500,
    });
    expect(mockForceRefreshCloudFrontAuthCookies).toHaveBeenCalledWith(
      expect.objectContaining({ user: { _id: 'user123', tenantId: 'tenantA' } }),
      expect.any(Object),
      { _id: 'user123', tenantId: 'tenantA' },
    );
  });

  it('reuses the auth middleware refresh result instead of minting cookies twice', async () => {
    const response = await request(app)
      .post('/v1/chat/auth/cloudfront/refresh')
      .set('Authorization', 'Bearer ok')
      .set('x-cloudfront-warmed', 'true')
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      expiresInSec: 1800,
      refreshAfterSec: 1500,
    });
    expect(mockForceRefreshCloudFrontAuthCookies).not.toHaveBeenCalled();
  });
});
