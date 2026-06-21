jest.mock('@hanzochat/api', () => ({
  isEnabled: (value) => value === 'true' || value === true,
}));

jest.mock('librechat-data-provider', () => ({
  EModelEndpoint: { custom: 'custom' },
}));

const {
  getGuestConfig,
  buildGuestPrincipal,
  buildGuestUser,
  buildGuestEndpointsConfig,
  buildGuestModelsConfig,
  GUEST_ROLE,
  GUEST_NAME,
  DEFAULT_GUEST_MESSAGE_MAX,
  DEFAULT_GUEST_ENDPOINT,
  DEFAULT_GUEST_MODEL,
} = require('./guestConfig');

describe('getGuestConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ALLOW_GUEST_CHAT;
    delete process.env.GUEST_MESSAGE_MAX;
    delete process.env.GUEST_TOKEN_EXPIRY;
    delete process.env.GUEST_ENDPOINT;
    delete process.env.GUEST_MODEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is disabled by default (fail closed)', () => {
    expect(getGuestConfig().enabled).toBe(false);
  });

  it('is enabled only when ALLOW_GUEST_CHAT is truthy', () => {
    process.env.ALLOW_GUEST_CHAT = 'true';
    expect(getGuestConfig().enabled).toBe(true);
  });

  it('uses defaults when env is unset', () => {
    const config = getGuestConfig();
    expect(config.messageMax).toBe(DEFAULT_GUEST_MESSAGE_MAX);
    expect(config.endpoint).toBe(DEFAULT_GUEST_ENDPOINT);
    expect(config.model).toBe(DEFAULT_GUEST_MODEL);
  });

  it('honors GUEST_MESSAGE_MAX', () => {
    process.env.GUEST_MESSAGE_MAX = '7';
    expect(getGuestConfig().messageMax).toBe(7);
  });

  it('falls back to default for invalid or non-positive GUEST_MESSAGE_MAX', () => {
    process.env.GUEST_MESSAGE_MAX = 'abc';
    expect(getGuestConfig().messageMax).toBe(DEFAULT_GUEST_MESSAGE_MAX);
    process.env.GUEST_MESSAGE_MAX = '0';
    expect(getGuestConfig().messageMax).toBe(DEFAULT_GUEST_MESSAGE_MAX);
    process.env.GUEST_MESSAGE_MAX = '-5';
    expect(getGuestConfig().messageMax).toBe(DEFAULT_GUEST_MESSAGE_MAX);
  });

  it('honors the configurable guest endpoint and model', () => {
    process.env.GUEST_ENDPOINT = 'Hanzo';
    process.env.GUEST_MODEL = 'zen4-mini';
    const config = getGuestConfig();
    expect(config.endpoint).toBe('Hanzo');
    expect(config.model).toBe('zen4-mini');
  });

  it('exposes GUEST_ROLE constant', () => {
    expect(GUEST_ROLE).toBe('GUEST');
  });
});

describe('guest principal + scoped-config builders', () => {
  beforeEach(() => {
    delete process.env.GUEST_ENDPOINT;
    delete process.env.GUEST_MODEL;
  });

  it('buildGuestPrincipal returns an ephemeral GUEST principal with no DB id/email', () => {
    const principal = buildGuestPrincipal('guest_abc');
    expect(principal).toEqual({
      id: 'guest_abc',
      role: GUEST_ROLE,
      name: GUEST_NAME,
      guest: true,
    });
    expect(principal).not.toHaveProperty('email');
    expect(principal).not.toHaveProperty('_id');
  });

  it('buildGuestUser exposes only safe, guest-scoped fields (no email)', () => {
    const user = buildGuestUser(buildGuestPrincipal('guest_abc'));
    expect(user.id).toBe('guest_abc');
    expect(user.role).toBe(GUEST_ROLE);
    expect(user.name).toBe(GUEST_NAME);
    expect(user.guest).toBe(true);
    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('password');
  });

  it('buildGuestEndpointsConfig exposes ONLY the configured guest endpoint', () => {
    process.env.GUEST_ENDPOINT = 'Hanzo';
    const config = buildGuestEndpointsConfig();
    expect(Object.keys(config)).toEqual(['Hanzo']);
    expect(config.Hanzo).toMatchObject({ type: 'custom', userProvide: false });
  });

  it('buildGuestModelsConfig exposes ONLY the single configured guest model', () => {
    process.env.GUEST_ENDPOINT = 'Hanzo';
    process.env.GUEST_MODEL = 'zen5-mini';
    expect(buildGuestModelsConfig()).toEqual({ Hanzo: ['zen5-mini'] });
  });
});
