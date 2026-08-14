jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockVerify = jest.fn();
const mockReconcile = jest.fn();
jest.mock('~/server/services/iamToken', () => ({ verifyIamToken: mockVerify }));
jest.mock('~/server/services/iamUser', () => ({ reconcileUser: mockReconcile }));

const iamStrategy = require('./iam');

/**
 * The request path, end to end: bearer in, principal out. Passport supplies
 * `success` and `fail` on the strategy it calls, so they are stubbed here the
 * same way.
 */
const run = (headers) => {
  const strategy = iamStrategy();
  const result = new Promise((resolve) => {
    strategy.success = (user) => resolve({ ok: true, user });
    strategy.fail = (info, status) => resolve({ ok: false, info, status });
    strategy.error = (err) => resolve({ ok: false, error: err });
  });
  strategy.authenticate({ headers });
  return result;
};

describe('the iam strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue({ sub: 'hanzo/alice', email: 'alice@hanzo.ai' });
    mockReconcile.mockResolvedValue({ _id: { toString: () => 'abc123' }, email: 'alice@hanzo.ai' });
  });

  it('identifies the holder of a valid token', async () => {
    const res = await run({ authorization: 'Bearer good-token' });
    expect(res.ok).toBe(true);
    expect(res.user.id).toBe('abc123');
    expect(mockVerify).toHaveBeenCalledWith('good-token');
  });

  it('passes the caller their own token, so cloud runs as the same principal', async () => {
    await run({ authorization: 'Bearer good-token' });
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ sub: 'hanzo/alice' }), 'good-token');
  });

  it('refuses a request with no bearer', async () => {
    const res = await run({});
    expect(res).toMatchObject({ ok: false, status: 401 });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('refuses a token IAM rejects, rather than failing the request', async () => {
    mockVerify.mockRejectedValue(new Error('invalid signature'));
    const res = await run({ authorization: 'Bearer forged' });
    expect(res).toMatchObject({ ok: false, status: 401 });
    expect(res.error).toBeUndefined();
  });

  it('refuses a verified token carrying no subject', async () => {
    mockVerify.mockResolvedValue({ email: 'alice@hanzo.ai' });
    expect(await run({ authorization: 'Bearer nosub' })).toMatchObject({ ok: false, status: 401 });
  });

  it('keeps a provider conflict a 403, not a bad token', async () => {
    const err = new Error('already registered another way');
    err.status = 403;
    mockReconcile.mockRejectedValue(err);
    expect(await run({ authorization: 'Bearer good-token' })).toMatchObject({
      ok: false,
      status: 403,
    });
  });
});
