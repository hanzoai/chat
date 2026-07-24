const mockVerify = jest.fn();
const mockGetSigningKey = jest.fn();
const mockJwksRsa = jest.fn(() => ({ getSigningKey: mockGetSigningKey }));
const mockGetOpenIdConfig = jest.fn();

jest.mock('jsonwebtoken', () => ({ verify: (...args) => mockVerify(...args) }));
jest.mock('jwks-rsa', () => (...args) => mockJwksRsa(...args));
jest.mock('https-proxy-agent', () => ({ HttpsProxyAgent: class {} }));
jest.mock('@hanzochat/data-schemas', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock(
  '~/strategies',
  () => ({ getOpenIdConfig: (...args) => mockGetOpenIdConfig(...args) }),
  { virtual: true },
);

const { verifyIamToken, _resetIamToken } = require('~/server/services/iamToken');

describe('verifyIamToken — JWKS verification for hanzo.id tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetIamToken();
    process.env.OPENID_ISSUER = 'https://hanzo.id';
    // Resolve JWKS URI from the already-initialized openid-client config (no network).
    mockGetOpenIdConfig.mockReturnValue({
      serverMetadata: () => ({ jwks_uri: 'https://hanzo.id/v1/iam/.well-known/jwks' }),
    });
    mockGetSigningKey.mockImplementation((kid, cb) => cb(null, { getPublicKey: () => 'PUBKEY' }));
  });

  afterEach(() => {
    delete process.env.OPENID_ISSUER;
  });

  it('throws on a missing token', async () => {
    await expect(verifyIamToken('')).rejects.toThrow('missing token');
  });

  it('returns claims for a valid, correctly-issued token', async () => {
    mockVerify.mockImplementation((token, key, opts, cb) =>
      cb(null, { sub: 'hanzo/alice', iss: 'https://hanzo.id', email: 'alice@hanzo.ai' }),
    );
    const claims = await verifyIamToken('good.token');
    expect(claims.sub).toBe('hanzo/alice');
    // RS256 only, JWKS-backed key resolver used.
    expect(mockVerify).toHaveBeenCalledWith(
      'good.token',
      expect.any(Function),
      expect.objectContaining({ algorithms: ['RS256'] }),
      expect.any(Function),
    );
  });

  it('rejects a token whose issuer does not match OPENID_ISSUER', async () => {
    mockVerify.mockImplementation((token, key, opts, cb) =>
      cb(null, { sub: 'hanzo/eve', iss: 'https://evil.example' }),
    );
    await expect(verifyIamToken('forged.iss')).rejects.toThrow('unexpected token issuer');
  });

  it('accepts a trailing-slash issuer variant (normalized)', async () => {
    process.env.OPENID_ISSUER = 'https://hanzo.id/';
    mockVerify.mockImplementation((token, key, opts, cb) =>
      cb(null, { sub: 'hanzo/al', iss: 'https://hanzo.id' }),
    );
    const claims = await verifyIamToken('ok.token');
    expect(claims.sub).toBe('hanzo/al');
  });

  it('propagates a signature-verification failure', async () => {
    mockVerify.mockImplementation((token, key, opts, cb) => cb(new Error('invalid signature')));
    await expect(verifyIamToken('bad.sig')).rejects.toThrow('invalid signature');
  });
});
