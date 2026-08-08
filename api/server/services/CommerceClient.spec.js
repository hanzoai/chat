jest.mock('@hanzochat/data-schemas', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { CommerceClient } = require('./CommerceClient');

/** Capture the request Commerce would receive. */
function mockFetch({ ok = true, status = 200, body = {} } = {}) {
  const calls = [];
  const fn = jest.fn(async (url, opts) => {
    calls.push({ url, opts });
    return { ok, status, text: async () => JSON.stringify(body), json: async () => body };
  });
  fn.calls = calls;
  return fn;
}

const client = () =>
  new CommerceClient({ endpoint: 'http://commerce.hanzo.svc:8001', token: 'svc-token' });

/**
 * The org header is the whole read.
 *
 * Commerce authorizes a service-token call by `X-Org-Id` and does not read
 * `X-Hanzo-Org` at all, so the wrong spelling answered 401 "sign in to view
 * billing" — identically to sending no credential. Nothing caught it because
 * two deliberate fallbacks sit behind it: `checkBalance` throws, the balance
 * controller falls through to the local ledger, production does not fund that
 * ledger, the read 404s, and the client renders no balance rather than a wrong
 * one. Every layer did what it was written to do and a funded account showed
 * nothing. So the header name is pinned here, at the one place it is written.
 */
describe('CommerceClient', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('scopes the read with X-Org-Id, the header Commerce authorizes on', async () => {
    const fetch = mockFetch({ body: { available: 14986317 } });
    global.fetch = fetch;

    await client().checkBalance('hanzo');

    const { url, opts } = fetch.calls[0];
    expect(url).toBe(
      'http://commerce.hanzo.svc:8001/v1/billing/balance?user=hanzo&currency=usd',
    );
    expect(opts.headers['X-Org-Id']).toBe('hanzo');
    expect(opts.headers.Authorization).toBe('Bearer svc-token');
    // The spelling that silently 401'd. Naming it keeps the regression legible.
    expect(opts.headers['X-Hanzo-Org']).toBeUndefined();
  });

  it('sends the org, not the per-user subject, as the scope', async () => {
    const fetch = mockFetch({ body: { available: 1 } });
    global.fetch = fetch;

    // A per-user subject is "owner/name"; the namespace is the owner alone.
    await client().checkBalance('hanzo/alice@example.com');

    expect(fetch.calls[0].opts.headers['X-Org-Id']).toBe('hanzo');
    expect(fetch.calls[0].url).toContain('user=hanzo%2Falice%40example.com');
  });

  it('reports the balance Commerce returns', async () => {
    global.fetch = mockFetch({ body: { available: 14986317 } });
    await expect(client().checkBalance('hanzo')).resolves.toEqual({
      sufficient: true,
      available: 14986317,
    });
  });

  it('throws on refusal rather than reporting an empty wallet', async () => {
    // Fail CLOSED: a 401 must not read as "this account has no money".
    global.fetch = mockFetch({ ok: false, status: 401, body: { error: 'unauthorized' } });
    await expect(client().checkBalance('hanzo')).rejects.toThrow('401');
  });

  it('carries the same scope on the credit breakdown', async () => {
    const fetch = mockFetch({ body: { breakdown: {}, total: { cents: 0 } } });
    global.fetch = fetch;

    await client().getCreditBreakdown('hanzo/alice@example.com');

    expect(fetch.calls[0].opts.headers['X-Org-Id']).toBe('hanzo');
  });
});
