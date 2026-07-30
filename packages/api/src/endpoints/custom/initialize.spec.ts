import { AuthType, ErrorTypes } from '@hanzochat/data-provider';
import type { BaseInitializeParams } from '~/types';

const mockValidateEndpointURL = jest.fn();
jest.mock('~/auth', () => ({
  validateEndpointURL: (...args: unknown[]) => mockValidateEndpointURL(...args),
}));

const mockGetOpenAIConfig = jest.fn().mockReturnValue({
  llmConfig: { model: 'test-model' },
  configOptions: {},
});
jest.mock('~/endpoints/openai/config', () => ({
  getOpenAIConfig: (...args: unknown[]) => mockGetOpenAIConfig(...args),
}));

jest.mock('~/endpoints/models', () => ({
  fetchModels: jest.fn(),
}));

jest.mock('~/cache', () => ({
  standardCache: jest.fn(() => ({ get: jest.fn().mockResolvedValue(null) })),
  tokenConfigCache: jest.fn(() => ({ get: jest.fn().mockResolvedValue(null) })),
}));

jest.mock('~/utils', () => ({
  isUserProvided: (val: string) => val === 'user_provided',
  checkUserKeyExpiry: jest.fn(),
}));

const mockGetCustomEndpointConfig = jest.fn();
jest.mock('~/app/config', () => ({
  getCustomEndpointConfig: (...args: unknown[]) => mockGetCustomEndpointConfig(...args),
}));

import { initializeCustom } from './initialize';

function createParams(overrides: {
  apiKey?: string;
  baseURL?: string;
  userBaseURL?: string;
  userApiKey?: string;
  expiresAt?: string;
}): BaseInitializeParams {
  const { apiKey = 'sk-test-key', baseURL = 'https://api.example.com/v1' } = overrides;

  mockGetCustomEndpointConfig.mockReturnValue({
    apiKey,
    baseURL,
    models: {},
  });

  const db = {
    getUserKeyValues: jest.fn().mockResolvedValue({
      apiKey: overrides.userApiKey ?? 'sk-user-key',
      baseURL: overrides.userBaseURL ?? 'https://user-api.example.com/v1',
    }),
  } as unknown as BaseInitializeParams['db'];

  return {
    req: {
      user: { id: 'user-1' },
      body: { key: overrides.expiresAt ?? '2099-01-01' },
      config: {},
    } as unknown as BaseInitializeParams['req'],
    endpoint: 'test-custom',
    model_parameters: { model: 'gpt-4' },
    db,
  };
}

describe('initializeCustom – Agents API user key resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user key even when expiresAt is not in request body (Agents API flow)', async () => {
    const { checkUserKeyExpiry } = jest.requireMock('~/utils');
    const params = createParams({
      apiKey: AuthType.USER_PROVIDED,
      baseURL: 'https://api.example.com/v1',
      userApiKey: 'sk-user-key',
    });
    // Simulate Agents API request body (no `key` field)
    params.req.body = { model: 'agent_123' };

    await initializeCustom(params);

    expect(params.db.getUserKeyValues).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'test-custom',
    });
    expect(checkUserKeyExpiry).not.toHaveBeenCalled();
    expect(mockGetOpenAIConfig).toHaveBeenCalledWith(
      'sk-user-key',
      expect.any(Object),
      'test-custom',
    );
  });

  it('should fetch user key for user-provided URL without expiresAt (Agents API flow)', async () => {
    const { checkUserKeyExpiry } = jest.requireMock('~/utils');
    const params = createParams({
      apiKey: 'sk-system-key',
      baseURL: AuthType.USER_PROVIDED,
      userBaseURL: 'https://user-api.example.com/v1',
    });
    params.req.body = { model: 'agent_123' };

    await initializeCustom(params);

    expect(params.db.getUserKeyValues).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'test-custom',
    });
    expect(checkUserKeyExpiry).not.toHaveBeenCalled();
  });

  it('should still check key expiry when expiresAt is provided (UI flow)', async () => {
    const { checkUserKeyExpiry } = jest.requireMock('~/utils');
    const params = createParams({
      apiKey: AuthType.USER_PROVIDED,
      baseURL: 'https://api.example.com/v1',
      userApiKey: 'sk-user-key',
      expiresAt: '2099-01-01',
    });

    await initializeCustom(params);

    expect(checkUserKeyExpiry).toHaveBeenCalledWith('2099-01-01', 'test-custom');
    expect(params.db.getUserKeyValues).toHaveBeenCalled();
  });

  it('should throw EXPIRED_USER_KEY when expiresAt is expired', async () => {
    const { checkUserKeyExpiry } = jest.requireMock('~/utils');
    checkUserKeyExpiry.mockImplementationOnce(() => {
      throw new Error(JSON.stringify({ type: ErrorTypes.EXPIRED_USER_KEY }));
    });

    const params = createParams({
      apiKey: AuthType.USER_PROVIDED,
      baseURL: 'https://api.example.com/v1',
      userApiKey: 'sk-user-key',
      expiresAt: '2020-01-01',
    });

    await expect(initializeCustom(params)).rejects.toThrow(ErrorTypes.EXPIRED_USER_KEY);
    expect(params.db.getUserKeyValues).not.toHaveBeenCalled();
  });

  it('should NOT call getUserKeyValues when key and URL are system-defined', async () => {
    const params = createParams({
      apiKey: 'sk-system-key',
      baseURL: 'https://api.provider.com/v1',
    });

    await initializeCustom(params);

    expect(params.db.getUserKeyValues).not.toHaveBeenCalled();
  });
});

describe('initializeCustom – SSRF guard wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call validateEndpointURL when baseURL is user_provided', async () => {
    const params = createParams({
      apiKey: 'sk-test-key',
      baseURL: AuthType.USER_PROVIDED,
      userBaseURL: 'https://user-api.example.com/v1',
      expiresAt: '2099-01-01',
    });

    await initializeCustom(params);

    expect(mockValidateEndpointURL).toHaveBeenCalledTimes(1);
    expect(mockValidateEndpointURL).toHaveBeenCalledWith(
      'https://user-api.example.com/v1',
      'test-custom',
      undefined,
    );
  });

  it('should NOT call validateEndpointURL when baseURL is system-defined', async () => {
    const params = createParams({
      apiKey: 'sk-test-key',
      baseURL: 'https://api.provider.com/v1',
    });

    await initializeCustom(params);

    expect(mockValidateEndpointURL).not.toHaveBeenCalled();
  });

  it('should propagate SSRF rejection from validateEndpointURL', async () => {
    mockValidateEndpointURL.mockRejectedValueOnce(
      new Error('Base URL for test-custom targets a restricted address.'),
    );

    const params = createParams({
      apiKey: 'sk-test-key',
      baseURL: AuthType.USER_PROVIDED,
      userBaseURL: 'http://169.254.169.254/latest/meta-data/',
      expiresAt: '2099-01-01',
    });

    await expect(initializeCustom(params)).rejects.toThrow('targets a restricted address');
    expect(mockGetOpenAIConfig).not.toHaveBeenCalled();
  });
});

describe('initializeCustom – guest principal billing (shared capped key)', () => {
  const OPENID_BEARER_SENTINEL = '{{CHAT_OPENID_TOKEN}}';
  const ORIGINAL_ENV = { ...process.env };

  const guestParams = () => {
    const params = createParams({
      apiKey: OPENID_BEARER_SENTINEL,
      baseURL: 'https://api.example.com/v1',
    });
    params.req.user = { id: 'guest_abc', guest: true } as unknown as typeof params.req.user;
    params.req.body = { model: 'zen5-flash' };
    return params;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GUEST_API_KEY;
    delete process.env.HANZO_API_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('routes a guest to the shared GUEST_API_KEY, never a per-user bearer', async () => {
    process.env.GUEST_API_KEY = 'hk-guest-capped';
    await initializeCustom(guestParams());
    expect(mockGetOpenAIConfig).toHaveBeenCalledWith(
      'hk-guest-capped',
      expect.any(Object),
      'test-custom',
    );
  });

  it('falls back to HANZO_API_KEY when GUEST_API_KEY is unset', async () => {
    process.env.HANZO_API_KEY = 'hk-fallback';
    await initializeCustom(guestParams());
    expect(mockGetOpenAIConfig).toHaveBeenCalledWith(
      'hk-fallback',
      expect.any(Object),
      'test-custom',
    );
  });

  it('fails closed for a guest when no guest key is configured', async () => {
    await expect(initializeCustom(guestParams())).rejects.toThrow(
      'Guest chat is temporarily unavailable',
    );
    expect(mockGetOpenAIConfig).not.toHaveBeenCalled();
  });
});

/**
 * The refusal a signed-in caller gets when their forwarded bearer has gone stale.
 *
 * This is the shape half of tonight's defect. The throw used to be a bare
 * `new Error('Sign in with Hanzo to chat …')`; the controller flattens a throw to
 * `{ error: <message> }`, and a body with no `code` and no `type` is exactly what
 * Messages/Content/Error.tsx cannot map — so a one-hour expiry rendered as
 * "Something went wrong on our side. Please try again in a moment." on every
 * message. What is asserted here is therefore not the wording but the CARRIER: a
 * machine-readable code, and a status that does not raise a login gate.
 */
describe('initializeCustom – a stale forwarded bearer refuses with a CODE', () => {
  const OPENID_BEARER_SENTINEL = '{{CHAT_OPENID_TOKEN}}';

  /** A signed-in openid principal whose session carries no forwardable token. */
  const staleParams = () => {
    const params = createParams({
      apiKey: OPENID_BEARER_SENTINEL,
      baseURL: 'https://api.example.com/v1',
    });
    params.req.user = {
      id: 'user_abc',
      provider: 'openid',
      openidId: 'sub-abc',
    } as unknown as typeof params.req.user;
    params.req.body = { model: 'zen5-flash' };
    return params;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carries a machine-readable code, not only a human sentence', async () => {
    await expect(initializeCustom(staleParams())).rejects.toMatchObject({
      code: 'expired_bearer',
    });
    expect(mockGetOpenAIConfig).not.toHaveBeenCalled();
  });

  /**
   * 403, never 401. The caller IS signed in — requireGuestOrJwtAuth already admitted
   * them — and the client answers 401 by raising a login gate, which would tell a
   * paying customer to sign in when they already are. Same distinction
   * routes/askMessage.js draws.
   */
  it('refuses with 403 so the client does not raise a "not signed in" gate', async () => {
    await expect(initializeCustom(staleParams())).rejects.toMatchObject({ status: 403 });
  });

  it('spends no credential when it cannot resolve one', async () => {
    await expect(initializeCustom(staleParams())).rejects.toBeDefined();
    expect(mockGetOpenAIConfig).not.toHaveBeenCalled();
  });
});
