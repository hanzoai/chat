jest.mock('~/db/models', () => ({
  Balance: { findOne: jest.fn() },
}));
// The client is mocked; the SUBJECT RULE is not. Which account a caller is shown
// is the thing under test here, so it runs for real.
jest.mock('~/server/services/CommerceClient', () => ({
  ...jest.requireActual('~/server/services/CommerceClient'),
  getCommerceClient: jest.fn(),
}));

const { Balance } = require('~/db/models');
const { getCommerceClient } = require('~/server/services/CommerceClient');
const balanceController = require('./Balance');

const localRecord = (doc) => Balance.findOne.mockReturnValue({ lean: () => Promise.resolve(doc) });

describe('balanceController', () => {
  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('answers with the Commerce org balance, in tokenCredits, without reading the local record', async () => {
    getCommerceClient.mockReturnValue({
      // $12.34 in cents → 12,340,000 tokenCredits ($1 = 1,000,000).
      checkBalance: jest.fn().mockResolvedValue({ sufficient: true, available: 1234 }),
      getTierConfig: jest.fn().mockResolvedValue({ name: 'pro', allowedModels: ['*'] }),
      getCreditBreakdown: jest.fn().mockResolvedValue({
        trial: { cents: 234 },
        paid: { cents: 1000 },
      }),
    });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(Balance.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      tokenCredits: 12340000,
      tierId: 'pro',
      allowedModels: ['*'],
      trialCredits: 234,
      paidCredits: 1000,
    });
  });

  it('reads a signup-org member OWN account, never the pool beside them', async () => {
    // The pool in the signup org is the platform's own. Reading it here showed
    // everyone who had just signed up a six-figure balance they could not spend,
    // while the gateway debited `hanzo/<name>` and refused them at zero.
    const checkBalance = jest.fn().mockResolvedValue({ sufficient: false, available: 0 });
    const getTierConfig = jest.fn().mockResolvedValue(null);
    const getCreditBreakdown = jest.fn().mockResolvedValue(null);
    getCommerceClient.mockReturnValue({ checkBalance, getTierConfig, getCreditBreakdown });
    const req = { user: { id: 'user-1', organization: 'hanzo', username: 'carol' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(checkBalance).toHaveBeenCalledWith('hanzo/carol');
    // Tier and breakdown describe the same account, not a different one.
    expect(getTierConfig).toHaveBeenCalledWith('hanzo/carol');
    expect(getCreditBreakdown).toHaveBeenCalledWith('hanzo/carol');
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 0 });
  });

  it('reads the POOL for a tenant org, where members share one balance', async () => {
    const checkBalance = jest.fn().mockResolvedValue({ sufficient: true, available: 900 });
    getCommerceClient.mockReturnValue({
      checkBalance,
      getTierConfig: jest.fn().mockResolvedValue(null),
      getCreditBreakdown: jest.fn().mockResolvedValue(null),
    });
    const req = { user: { id: 'user-1', organization: 'acme', username: 'carol' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(checkBalance).toHaveBeenCalledWith('acme');
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 9000000 });
  });

  it('still answers the balance when tier/breakdown enrichment fails', async () => {
    getCommerceClient.mockReturnValue({
      checkBalance: jest.fn().mockResolvedValue({ sufficient: true, available: 500 }),
      getTierConfig: jest.fn().mockRejectedValue(new Error('tier down')),
      getCreditBreakdown: jest.fn().mockRejectedValue(new Error('breakdown down')),
    });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 5000000 });
  });

  it('falls through to the local record when Commerce is unreachable — display is not the money path', async () => {
    getCommerceClient.mockReturnValue({
      checkBalance: jest.fn().mockRejectedValue(new Error('commerce down')),
    });
    localRecord({ tokenCredits: 100, autoRefillEnabled: false });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 100, autoRefillEnabled: false });
  });

  it('reads the local record when the user has no billing org', async () => {
    getCommerceClient.mockReturnValue({ checkBalance: jest.fn() });
    localRecord({ tokenCredits: 42, autoRefillEnabled: false });
    const req = { user: { id: 'user-1' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 42, autoRefillEnabled: false });
  });

  it('returns not found when Commerce is off and no record exists', async () => {
    getCommerceClient.mockReturnValue(null);
    localRecord(null);
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Balance not found' });
  });

  it('reports expired local credits as zero', async () => {
    getCommerceClient.mockReturnValue(null);
    localRecord({
      tokenCredits: 900,
      autoRefillEnabled: false,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const req = { user: { id: 'user-1' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ tokenCredits: 0 }),
    );
  });
});
