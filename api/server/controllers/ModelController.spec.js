const { FREE_MODEL } = require('@hanzo/ai');

jest.mock('@hanzochat/data-schemas', () => ({ logger: { error: jest.fn() } }));
jest.mock('~/server/services/Config', () => ({
  loadDefaultModels: jest.fn(),
  loadConfigModels: jest.fn(),
}));
jest.mock('~/cache', () => ({ getLogStores: jest.fn() }));
jest.mock('~/server/services/guestConfig', () => ({
  buildGuestModelsConfig: jest.fn(() => ({ Hanzo: [require('@hanzo/ai').FREE_MODEL] })),
}));
jest.mock('~/server/services/plan', () => ({ planOf: jest.fn(), FREE: 'free' }));

const { getLogStores } = require('~/cache');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');
const { planOf } = require('~/server/services/plan');
const { modelController, leadFree } = require('./ModelController');

/** The deployed shape: priced rungs first, the free route last. */
const CATALOG = {
  Hanzo: ['enso', 'enso-flash', 'zen5', FREE_MODEL],
  Anthropic: ['claude-sonnet'],
};

const answer = () => {
  const res = { send: jest.fn(), status: jest.fn(() => res) };
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  getLogStores.mockReturnValue({ get: jest.fn().mockResolvedValue(CATALOG), set: jest.fn() });
  loadDefaultModels.mockResolvedValue({});
  loadConfigModels.mockResolvedValue(CATALOG);
});

describe('leadFree', () => {
  it('puts the free route first without dropping a priced one', () => {
    expect(leadFree(CATALOG).Hanzo).toEqual(['enso-free', 'enso', 'enso-flash', 'zen5']);
  });

  it('leaves an endpoint that has no free route exactly as it was', () => {
    expect(leadFree(CATALOG).Anthropic).toEqual(['claude-sonnet']);
  });
});

describe('modelController', () => {
  it('leads a free plan with the model it can actually run', async () => {
    planOf.mockResolvedValue('free');
    const res = answer();
    await modelController({ user: {} }, res);
    expect(res.send.mock.calls[0][0].Hanzo[0]).toBe(FREE_MODEL);
  });

  it('leaves a paid plan on the model it pays for', async () => {
    planOf.mockResolvedValue('pro');
    const res = answer();
    await modelController({ user: {} }, res);
    expect(res.send.mock.calls[0][0].Hanzo[0]).toBe('enso');
  });

  // A plan that could not be read is not a free plan. Reading silence as free
  // would hand the free lane to every caller cloud failed to name.
  it('leaves an unreadable plan on the paid default', async () => {
    planOf.mockResolvedValue(null);
    const res = answer();
    await modelController({ user: {} }, res);
    expect(res.send.mock.calls[0][0].Hanzo[0]).toBe('enso');
  });

  it('narrows a guest to the one model they are pinned to, and asks no plan', async () => {
    const res = answer();
    await modelController({ user: { guest: true } }, res);
    expect(res.send).toHaveBeenCalledWith({ Hanzo: [FREE_MODEL] });
    expect(planOf).not.toHaveBeenCalled();
  });
});
