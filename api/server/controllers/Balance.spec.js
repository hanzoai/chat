jest.mock('~/db/models', () => ({
  Balance: { findOne: jest.fn() },
}));
jest.mock('@hanzochat/api', () => ({
  resolveTenantBearer: jest.fn(),
}));

const { Balance } = require('~/db/models');
const { resolveTenantBearer } = require('@hanzochat/api');
const balanceController = require('./Balance');

const localRecord = (doc) => Balance.findOne.mockReturnValue({ lean: () => Promise.resolve(doc) });

/** cloud's answer to the caller's own read. `available` is cents. */
const cloudSays = (body, ok = true) =>
  jest.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });

describe('balanceController', () => {
  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HANZO_CLOUD_URL = 'http://cloud.test:8000';
    resolveTenantBearer.mockReturnValue('user-jwt');
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("reads the balance AS THE USER, and reports what cloud says they hold", async () => {
    // $12.34 in cents → 12,340,000 tokenCredits ($1 = 1,000,000).
    global.fetch = cloudSays({ balance: 1234, holds: 0, available: 1234 });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('http://cloud.test:8000/v1/billing/balance?currency=usd');
    // The caller's OWN credential. cloud resolves who pays from it; nothing here
    // computes a subject, so this view cannot drift from the gate that spends it.
    expect(init.headers.Authorization).toBe('Bearer user-jwt');
    expect(Balance.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 12340000 });
  });

  it('shows a new signup their own zero, never the pool beside them', async () => {
    // Read as a MACHINE, this answered with the signup org's pooled account — the
    // platform's own balance — so every new member saw six figures they could not
    // spend while their first message was refused at zero. Read as themselves,
    // cloud answers on their own account.
    global.fetch = cloudSays({ balance: 0, holds: 0, available: 0, account: 'newcomer' });
    const req = { user: { id: 'user-1', organization: 'hanzo', username: 'newcomer' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 0 });
  });

  it('falls through to the local record when cloud is unreachable — display is not the money path', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('cloud down'));
    localRecord({ tokenCredits: 100, autoRefillEnabled: false });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 100, autoRefillEnabled: false });
  });

  it('falls through to the local record when cloud refuses the read', async () => {
    global.fetch = cloudSays({}, false);
    localRecord({ tokenCredits: 7, autoRefillEnabled: false });
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 7, autoRefillEnabled: false });
  });

  it('reads the local record when the caller presented no bearer', async () => {
    resolveTenantBearer.mockReturnValue(null);
    global.fetch = jest.fn();
    localRecord({ tokenCredits: 42, autoRefillEnabled: false });
    const req = { user: { id: 'user-1' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ tokenCredits: 42, autoRefillEnabled: false });
  });

  it('returns not found when there is no cloud answer and no record', async () => {
    resolveTenantBearer.mockReturnValue(null);
    localRecord(null);
    const req = { user: { id: 'user-1', organization: 'hanzo' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Balance not found' });
  });

  it('reports expired local credits as zero', async () => {
    resolveTenantBearer.mockReturnValue(null);
    localRecord({
      tokenCredits: 900,
      autoRefillEnabled: false,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const req = { user: { id: 'user-1' } };
    const res = createResponse();

    await balanceController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tokenCredits: 0 }));
  });
});
