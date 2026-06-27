// Money-gate decision matrix for the Commerce-first, FAIL-CLOSED balance gate
// (per-org via service token + X-Hanzo-Org; the cloud gateway debits the user's
// own hk- key against the SAME org). Proves both directions: unmetered AI never
// leaks (block on any ambiguity), and funded users + capped guests are never
// wrongly blocked.

const mockClient = {
  checkBalance: jest.fn(),
  isModelAllowed: jest.fn(),
};

jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('~/server/services/CommerceClient', () => ({
  getCommerceClient: jest.fn(() => mockClient),
}));
jest.mock('~/cache', () => ({ logViolation: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./tx', () => ({ getMultiplier: () => 1 }));
jest.mock('./Transaction', () => ({ createAutoRefillTransaction: jest.fn() }));
jest.mock('~/db/models', () => ({ Balance: { findOne: jest.fn() } }));
jest.mock('librechat-data-provider', () => ({
  ViolationTypes: { TOKEN_BALANCE: 'token_balance' },
}));

const { checkBalance } = require('./balanceMethods');
const { getCommerceClient } = require('~/server/services/CommerceClient');
const { Balance } = require('~/db/models');

const argsFor = (user) => ({
  req: { user },
  res: {},
  txData: { user: user?.id ?? 'u1', tokenType: 'prompt', amount: 100, model: 'zen4-mini' },
});

// checkBalance resolves `true` when allowed, throws a JSON error (carrying
// `reason`) when blocked.
const decide = async (user = { id: 'u1', organization: 'acme' }) => {
  try {
    const ok = await checkBalance(argsFor(user));
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

describe('checkBalance — Commerce-first money gate (fail closed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCommerceClient.mockReturnValue(mockClient);
    mockClient.isModelAllowed.mockResolvedValue({ allowed: true, tier: 't', allowedModels: ['*'] });
    process.env.HANZO_MIN_BALANCE = '1.00'; // 100 cents minimum
  });

  it('ALLOWS a guest WITHOUT consulting Commerce (capped by IP limiter + guest key)', async () => {
    const { allowed } = await decide({ id: 'g1', guest: true });
    expect(allowed).toBe(true);
    expect(mockClient.checkBalance).not.toHaveBeenCalled();
    expect(Balance.findOne).not.toHaveBeenCalled();
  });

  it('ALLOWS a funded org (available >= min)', async () => {
    mockClient.checkBalance.mockResolvedValue({ sufficient: true, available: 500 });
    const { allowed, reason } = await decide();
    expect(allowed).toBe(true);
    expect(reason).toBeNull();
    expect(mockClient.checkBalance).toHaveBeenCalledWith('acme');
  });

  it('BLOCKS commerce_insufficient when balance below minimum ($0 → claim $5)', async () => {
    mockClient.checkBalance.mockResolvedValue({ sufficient: false, available: 0 });
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('commerce_insufficient');
  });

  it('BLOCKS commerce_insufficient when balance is a tiny non-zero below min', async () => {
    mockClient.checkBalance.mockResolvedValue({ sufficient: true, available: 50 }); // $0.50 < $1
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('commerce_insufficient');
  });

  it('FAILS CLOSED (commerce_unavailable) when Commerce throws — never bleeds', async () => {
    mockClient.checkBalance.mockRejectedValue(new Error('ECONNREFUSED'));
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('commerce_unavailable');
  });

  it('BLOCKS model_not_allowed for a funded org whose tier forbids the model', async () => {
    mockClient.checkBalance.mockResolvedValue({ sufficient: true, available: 500 });
    mockClient.isModelAllowed.mockResolvedValue({
      allowed: false,
      tier: 'free',
      allowedModels: ['zen3-nano'],
    });
    const { allowed, reason } = await decide();
    expect(allowed).toBe(false);
    expect(reason).toBe('model_not_allowed');
  });

  it('ALLOWS a funded org even if the tier check itself errors (fail-open tier, balance ok)', async () => {
    mockClient.checkBalance.mockResolvedValue({ sufficient: true, available: 500 });
    mockClient.isModelAllowed.mockRejectedValue(new Error('tier-check 500'));
    const { allowed } = await decide();
    expect(allowed).toBe(true);
  });

  it('FAILS CLOSED for an authed user with NO billing org (no commerce branch, no local credits)', async () => {
    Balance.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const { allowed } = await decide({ id: 'u2', organization: '' });
    expect(allowed).toBe(false);
    expect(mockClient.checkBalance).not.toHaveBeenCalled();
  });
});
