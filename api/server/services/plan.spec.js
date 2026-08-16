jest.mock('@hanzochat/api', () => ({ resolveTenantBearer: jest.fn() }));

const { resolveTenantBearer } = require('@hanzochat/api');
const { planOf, FREE } = require('./plan');

const req = { headers: {} };

beforeEach(() => {
  jest.clearAllMocks();
  resolveTenantBearer.mockReturnValue('bearer');
  process.env.HANZO_CLOUD_URL = 'http://cloud.hanzo.svc:8000';
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.HANZO_CLOUD_URL;
});

const answers = (body, ok = true) =>
  global.fetch.mockResolvedValue({ ok, json: async () => body });

describe('planOf', () => {
  it('reads the plan the allowance names', async () => {
    answers({ plan: 'free', limit: 20, used: 0, spent: false });
    await expect(planOf(req)).resolves.toBe(FREE);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('http://cloud.hanzo.svc:8000/v1/allowance');
    expect(init.headers.Authorization).toBe('Bearer bearer');
  });

  it('reads a paid plan as itself', async () => {
    answers({ plan: 'pro', limit: 0 });
    await expect(planOf(req)).resolves.toBe('pro');
  });

  // Every way of not knowing answers the same: null, never FREE. Guessing free
  // from silence would give the free lane away on any hiccup.
  it('answers null when the caller has no bearer', async () => {
    resolveTenantBearer.mockReturnValue(null);
    await expect(planOf(req)).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('answers null when no cloud is configured', async () => {
    delete process.env.HANZO_CLOUD_URL;
    await expect(planOf(req)).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('answers null when cloud refuses', async () => {
    answers({}, false);
    await expect(planOf(req)).resolves.toBeNull();
  });

  it('answers null when cloud is unreachable', async () => {
    global.fetch.mockRejectedValue(new Error('timed out'));
    await expect(planOf(req)).resolves.toBeNull();
  });

  it('answers null when the answer names no plan', async () => {
    answers({ limit: 5 });
    await expect(planOf(req)).resolves.toBeNull();
  });
});
