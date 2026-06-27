// Fail-closed/fail-open decision matrix for the IAM-native Commerce money gate.
// Proves BOTH directions: unmetered AI never leaks (fail closed), and funded /
// freshly-credited users are never wrongly blocked (good fail closed).

const mockClient = {
  getMyBalance: jest.fn(),
  grantWelcome: jest.fn(),
};
let mockToken = 'iam.jwt.token';
let mockOrg = 'acme';

jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('~/server/services/CommerceClient', () => ({
  getCommerceClient: () => mockClient,
  getIamToken: () => mockToken,
  getBillingOrg: () => mockOrg,
}));
jest.mock('~/cache', () => ({ logViolation: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./tx', () => ({ getMultiplier: () => 1 }));
jest.mock('./Transaction', () => ({ createAutoRefillTransaction: jest.fn() }));
jest.mock('~/db/models', () => ({ Balance: { findOne: jest.fn() } }));
jest.mock('librechat-data-provider', () => ({
  ViolationTypes: { TOKEN_BALANCE: 'token_balance' },
}));

const { checkBalance } = require('./balanceMethods');

const baseArgs = () => ({
  req: { user: { id: 'u1', organization: 'acme' } },
  res: {},
  txData: { user: 'u1', tokenType: 'prompt', amount: 100, model: 'gpt' },
});

// checkBalance resolves true when allowed and throws (rejects) when blocked.
const decide = async () => {
  try {
    const ok = await checkBalance(baseArgs());
    return { allowed: ok, reason: null };
  } catch (err) {
    let reason = null;
    try {
      reason = JSON.parse(err.message).reason;
    } catch (_) {
      reason = err.message;
    }
    return { allowed: false, reason };
  }
};

describe('checkBalance — IAM-native Commerce money gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'iam.jwt.token';
    mockOrg = 'acme';
    process.env.HANZO_MIN_BALANCE = '1.00'; // 100 cents minimum
  });

  it('ALLOWS a funded user (available >= min) without granting credit', async () => {
    mockClient.getMyBalance.mockResolvedValueOnce({ available: 500 });
    const { allowed } = await decide();
    expect(allowed).toBe(true);
    expect(mockClient.grantWelcome).not.toHaveBeenCalled();
  });

  it('BLOCKS (fail closed) when there is no IAM token — never serves unmetered AI', async () => {
    mockToken = null;
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('no_billing_identity');
    expect(mockClient.getMyBalance).not.toHaveBeenCalled();
  });

  it('BLOCKS (fail closed) when Commerce is unreachable — does NOT fall through to allow', async () => {
    mockClient.getMyBalance.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('commerce_unavailable');
  });

  it('SELF-HEALS a brand-new account: below-min -> idempotent $5 grant -> re-read -> ALLOW', async () => {
    mockClient.getMyBalance
      .mockResolvedValueOnce({ available: 0 }) // first read: empty
      .mockResolvedValueOnce({ available: 500 }); // after grant: funded
    mockClient.grantWelcome.mockResolvedValueOnce({ granted: true });
    const { allowed } = await decide();
    expect(allowed).toBe(true);
    expect(mockClient.grantWelcome).toHaveBeenCalledTimes(1);
    expect(mockClient.getMyBalance).toHaveBeenCalledTimes(2);
  });

  it('BLOCKS a drained wallet: the idempotent grant does NOT refill a spent user', async () => {
    mockClient.getMyBalance
      .mockResolvedValueOnce({ available: 0 }) // empty
      .mockResolvedValueOnce({ available: 0 }); // still empty after dedup-no-op grant
    mockClient.grantWelcome.mockResolvedValueOnce({ granted: false });
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('commerce_insufficient');
    expect(mockClient.grantWelcome).toHaveBeenCalledTimes(1);
  });
});
