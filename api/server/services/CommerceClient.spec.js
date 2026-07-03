jest.mock('@librechat/data-schemas', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { CommerceClient } = require('./CommerceClient');

function mockFetch({ ok = true, status = 200, body = {} } = {}) {
  const calls = [];
  const fn = jest.fn(async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  });
  fn.calls = calls;
  return fn;
}

describe('CommerceClient.recordUsage → POST /v1/billing/usage', () => {
  let client;
  afterEach(() => {
    if (client) {
      client.destroy();
    }
    delete global.fetch;
  });

  it('debits the SUBJECT with amountMicros + requestId, scoped to the org namespace', async () => {
    const fetch = mockFetch();
    global.fetch = fetch;
    client = new CommerceClient({ endpoint: 'http://commerce.hanzo.svc:8001', token: 't' });

    client.recordUsage({
      subject: 'hanzo/alice@example.com',
      model: 'gpt-4o',
      provider: 'openai',
      promptTokens: 1200,
      completionTokens: 800,
      amountMicros: 34000, // 3.4 cents worth of micro-USD
      requestId: 'txn_abc123',
    });
    await client._flushUsageQueue();

    expect(fetch).toHaveBeenCalledTimes(1);
    const { url, opts } = fetch.calls[0];
    expect(url).toBe('http://commerce.hanzo.svc:8001/v1/billing/usage');
    expect(opts.method).toBe('POST');
    // Debit scoped to the subject's org (matches the read gate), not the default.
    expect(opts.headers['X-Hanzo-Org']).toBe('hanzo');

    const body = JSON.parse(opts.body);
    expect(body.user).toBe('hanzo/alice@example.com'); // the billing subject, not a Mongo id
    expect(body.amountMicros).toBe(34000); // lossless micro-USD
    expect(body.requestId).toBe('txn_abc123'); // idempotency key → no double-debit
    expect(body.totalTokens).toBe(2000);
    expect(body.provider).toBe('openai');
    // Transport-only field must NOT leak into the request body.
    expect(body._namespace).toBeUndefined();
  });
});

describe('recordCommerceDebit flag gate (default OFF)', () => {
  const ORIG = process.env.COMMERCE_WRITES;
  afterEach(() => {
    process.env.COMMERCE_WRITES = ORIG;
    jest.resetModules();
  });

  it('is inert unless COMMERCE_WRITES=true (prod billing untouched by default)', () => {
    delete process.env.COMMERCE_WRITES;
    jest.isolateModules(() => {
      const { commerceWritesEnabled } = require('~/models/commerceWrites');
      expect(commerceWritesEnabled()).toBe(false);
    });
    process.env.COMMERCE_WRITES = 'true';
    jest.isolateModules(() => {
      const { commerceWritesEnabled } = require('~/models/commerceWrites');
      expect(commerceWritesEnabled()).toBe(true);
    });
  });
});
