const express = require('express');
const request = require('supertest');
const { SystemRoles, roleDefaults } = require('@hanzochat/data-provider');

const mockGetRoleByName = jest.fn();
const mockHasCapability = jest.fn();

/**
 * Every middleware is a no-op except the ones named here. A LIST of middleware
 * names has to be kept in step with whatever the router mounts — miss one and
 * express refuses the whole router at import with `argument handler must be a
 * function`, and the suite reports zero tests rather than a failure anyone can
 * read. This suite is about ROUTING, so anything it does not name passes
 * through.
 */
jest.mock('~/server/middleware', () => {
  const named = {};
  return new Proxy(named, {
    get: (target, key) => {
      if (key in target) {
        return target[key];
      }
      // Never answer the interop probes — a thenable module breaks `require`.
      if (typeof key !== 'string' || key === 'then' || key === '__esModule') {
        return undefined;
      }
      return (req, res, next) => next();
    },
  });
});

jest.mock('~/server/middleware/roles/capabilities', () => ({
  hasCapability: (...args) => mockHasCapability(...args),
  requireCapability: () => (_req, _res, next) => next(),
}));

jest.mock('~/models', () => ({
  getRoleByName: (...args) => mockGetRoleByName(...args),
  updateRoleByName: jest.fn(),
}));

const rolesRouter = require('../roles');

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/v1/chat/roles', rolesRouter);
  return app;
}

const staffRole = {
  name: 'STAFF',
  permissions: {
    PROMPTS: { USE: true, CREATE: false },
  },
};

const userRole = roleDefaults[SystemRoles.USER];
const adminRole = roleDefaults[SystemRoles.ADMIN];

beforeEach(() => {
  jest.clearAllMocks();
  mockHasCapability.mockResolvedValue(false);
  mockGetRoleByName.mockResolvedValue(null);
});

describe('GET /v1/chat/roles/:roleName — isOwnRole authorization', () => {
  it('allows a custom role user to fetch their own role', async () => {
    mockGetRoleByName.mockResolvedValue(staffRole);
    const app = createApp({ id: 'u1', role: 'STAFF' });

    const res = await request(app).get('/v1/chat/roles/STAFF');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('STAFF');
    expect(mockGetRoleByName).toHaveBeenCalledWith('STAFF', '-_id -__v');
  });

  it('returns 403 when a custom role user requests a different custom role', async () => {
    const app = createApp({ id: 'u1', role: 'STAFF' });

    const res = await request(app).get('/v1/chat/roles/MANAGER');

    expect(res.status).toBe(403);
    expect(mockGetRoleByName).not.toHaveBeenCalled();
  });

  it('returns 403 when a custom role user requests ADMIN', async () => {
    const app = createApp({ id: 'u1', role: 'STAFF' });

    const res = await request(app).get('/v1/chat/roles/ADMIN');

    expect(res.status).toBe(403);
    expect(mockGetRoleByName).not.toHaveBeenCalled();
  });

  it('allows USER to fetch the USER role (roleDefaults key)', async () => {
    mockGetRoleByName.mockResolvedValue(userRole);
    const app = createApp({ id: 'u1', role: SystemRoles.USER });

    const res = await request(app).get(`/v1/chat/roles/${SystemRoles.USER}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 when USER requests the ADMIN role', async () => {
    const app = createApp({ id: 'u1', role: SystemRoles.USER });

    const res = await request(app).get(`/v1/chat/roles/${SystemRoles.ADMIN}`);

    expect(res.status).toBe(403);
  });

  it('allows ADMIN user to fetch their own ADMIN role via isOwnRole', async () => {
    mockHasCapability.mockResolvedValue(false);
    mockGetRoleByName.mockResolvedValue(adminRole);
    const app = createApp({ id: 'u1', role: SystemRoles.ADMIN });

    const res = await request(app).get(`/v1/chat/roles/${SystemRoles.ADMIN}`);

    expect(res.status).toBe(200);
  });

  it('allows any user with READ_ROLES capability to fetch any role', async () => {
    mockHasCapability.mockResolvedValue(true);
    mockGetRoleByName.mockResolvedValue(staffRole);
    const app = createApp({ id: 'u1', role: SystemRoles.USER });

    const res = await request(app).get('/v1/chat/roles/STAFF');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('STAFF');
  });

  it('returns 404 when the requested role does not exist', async () => {
    mockGetRoleByName.mockResolvedValue(null);
    const app = createApp({ id: 'u1', role: 'GHOST' });

    const res = await request(app).get('/v1/chat/roles/GHOST');

    expect(res.status).toBe(404);
  });

  it('returns 500 when getRoleByName throws', async () => {
    mockGetRoleByName.mockRejectedValue(new Error('db error'));
    const app = createApp({ id: 'u1', role: SystemRoles.USER });

    const res = await request(app).get(`/v1/chat/roles/${SystemRoles.USER}`);

    expect(res.status).toBe(500);
  });

  it('returns 403 for prototype property names like constructor (no prototype pollution)', async () => {
    const app = createApp({ id: 'u1', role: 'STAFF' });

    const res = await request(app).get('/v1/chat/roles/constructor');

    expect(res.status).toBe(403);
    expect(mockGetRoleByName).not.toHaveBeenCalled();
  });

  it('treats hasCapability failure as no capability (does not 500)', async () => {
    mockHasCapability.mockRejectedValue(new Error('capability check failed'));
    const app = createApp({ id: 'u1', role: 'STAFF' });
    mockGetRoleByName.mockResolvedValue(staffRole);

    const res = await request(app).get('/v1/chat/roles/STAFF');

    expect(res.status).toBe(200);
  });
});
