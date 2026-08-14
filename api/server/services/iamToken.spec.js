const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockGetSigningKey = jest.fn();
jest.mock('jwks-rsa', () => () => ({ getSigningKey: mockGetSigningKey }));

const { verifyIamToken, _resetIamToken } = require('./iamToken');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const ISSUER = 'https://hanzo.id';
const CLIENT = 'hanzo-chat';

const sign = (claims, key = privateKey) =>
  jwt.sign({ sub: 'hanzo/alice', iss: ISSUER, aud: CLIENT, ...claims }, key, {
    algorithm: 'RS256',
    expiresIn: '1h',
    keyid: 'k1',
  });

/**
 * The one proof that a caller is who they say they are. Every request now rests
 * on it, so what it refuses matters as much as what it accepts — particularly
 * the audience, since one issuer serves every Hanzo relying party and a token
 * meant for another app is signed by the very same key.
 */
describe('verifyIamToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetIamToken();
    process.env.OPENID_ISSUER = ISSUER;
    process.env.OPENID_CLIENT_ID = CLIENT;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jwks_uri: `${ISSUER}/v1/iam/.well-known/jwks` }),
    });
    mockGetSigningKey.mockImplementation((kid, cb) =>
      cb(null, { getPublicKey: () => publicKey.export({ type: 'spki', format: 'pem' }) }),
    );
  });

  it('accepts a token this app was issued', async () => {
    const claims = await verifyIamToken(sign({}));
    expect(claims.sub).toBe('hanzo/alice');
  });

  it('accepts the org-scoped audience IAM mints for a shared application', async () => {
    const claims = await verifyIamToken(sign({ aud: `${CLIENT}-org-hanzo` }));
    expect(claims.sub).toBe('hanzo/alice');
  });

  it('refuses a token addressed to another Hanzo app', async () => {
    await expect(verifyIamToken(sign({ aud: 'hanzo-app' }))).rejects.toThrow();
  });

  it('refuses an app whose name merely starts the same', async () => {
    await expect(verifyIamToken(sign({ aud: 'hanzo-chat-admin' }))).rejects.toThrow();
  });

  it('refuses another issuer', async () => {
    await expect(verifyIamToken(sign({ iss: 'https://evil.example' }))).rejects.toThrow();
  });

  it('refuses a token signed by someone else', async () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    await expect(verifyIamToken(sign({}, other))).rejects.toThrow();
  });

  it('refuses an expired token', async () => {
    const expired = jwt.sign({ sub: 'hanzo/alice', iss: ISSUER, aud: CLIENT }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '-1s',
      keyid: 'k1',
    });
    await expect(verifyIamToken(expired)).rejects.toThrow();
  });

  it('refuses nothing at all', async () => {
    await expect(verifyIamToken(undefined)).rejects.toThrow('missing token');
  });
});
