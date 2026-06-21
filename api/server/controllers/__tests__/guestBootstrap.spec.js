/**
 * Guest-scoped bootstrap controllers: verify that a guest principal receives
 * safe, scoped data (and never triggers a DB lookup) on the read-only endpoints
 * the chat composer hard-requires.
 */

jest.mock('@hanzochat/api', () => ({
  isEnabled: (value) => value === 'true' || value === true,
}));
jest.mock('librechat-data-provider', () => ({
  EModelEndpoint: { custom: 'custom' },
  CacheKeys: { CONFIG_STORE: 'CONFIG_STORE', MODELS_CONFIG: 'MODELS_CONFIG' },
  Tools: {},
  Constants: {},
  FileSources: { local: 'local', s3: 's3' },
}));
jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
  webSearchKeys: [],
}));

// --- EndpointController deps ---
jest.mock('~/server/services/Config', () => ({
  getEndpointsConfig: jest.fn(),
  loadDefaultModels: jest.fn(),
  loadConfigModels: jest.fn(),
  getAppConfig: jest.fn(),
}));
jest.mock('~/cache', () => ({ getLogStores: jest.fn(() => ({ get: jest.fn(), set: jest.fn() })) }));

const { getEndpointsConfig } = require('~/server/services/Config');

const endpointController = require('~/server/controllers/EndpointController');
const { modelController } = require('~/server/controllers/ModelController');

const guestReq = (overrides = {}) => ({
  user: { id: 'guest_abc', role: 'GUEST', name: 'Guest', guest: true },
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('guest bootstrap controllers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_GUEST_CHAT = 'true';
    process.env.GUEST_ENDPOINT = 'Hanzo';
    process.env.GUEST_MODEL = 'zen5-mini';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /api/endpoints', () => {
    it('returns ONLY the guest endpoint, no DB/config read', async () => {
      const req = guestReq();
      const res = mockRes();
      await endpointController(req, res);
      expect(getEndpointsConfig).not.toHaveBeenCalled();
      const payload = JSON.parse(res.send.mock.calls[0][0]);
      expect(Object.keys(payload)).toEqual(['Hanzo']);
      expect(payload.Hanzo).toMatchObject({ type: 'custom', userProvide: false });
    });

    it('falls through to the real config for non-guest users', async () => {
      getEndpointsConfig.mockResolvedValue({ Hanzo: {}, openAI: {} });
      const req = { user: { id: 'real', role: 'USER' } };
      const res = mockRes();
      await endpointController(req, res);
      expect(getEndpointsConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/models', () => {
    it('returns ONLY the single guest model under the guest endpoint', async () => {
      const req = guestReq();
      const res = mockRes();
      await modelController(req, res);
      expect(res.send).toHaveBeenCalledWith({ Hanzo: ['zen5-mini'] });
    });
  });
});
