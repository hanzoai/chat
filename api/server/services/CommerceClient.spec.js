jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Fixed multiplier table: prompt=6 credits/token, completion=12 credits/token.
jest.mock('~/models/tx', () => ({
  getMultiplier: ({ tokenType }) => (tokenType === 'completion' ? 12 : 6),
}));

const { getIamToken, getBillingOrg, computeUsageCents } = require('./CommerceClient');

describe('getIamToken', () => {
  it('prefers the id_token (JWKS-validatable, carries owner claim)', () => {
    const req = { user: { federatedTokens: { id_token: 'ID', access_token: 'AC' } } };
    expect(getIamToken(req)).toBe('ID');
  });

  it('falls back to the access_token when no id_token', () => {
    const req = { user: { federatedTokens: { access_token: 'AC' } } };
    expect(getIamToken(req)).toBe('AC');
  });

  it('returns null when there is no IAM identity (caller must fail closed)', () => {
    expect(getIamToken({ user: {} })).toBeNull();
    expect(getIamToken({})).toBeNull();
    expect(getIamToken(undefined)).toBeNull();
  });
});

describe('getBillingOrg', () => {
  it('lowercases and trims the IAM owner/org so it matches commerce org.Name', () => {
    expect(getBillingOrg({ user: { organization: '  ACME  ' } })).toBe('acme');
    expect(getBillingOrg({ user: { organization: 'Hanzo' } })).toBe('hanzo');
    expect(getBillingOrg({ user: {} })).toBe('');
  });
});

describe('computeUsageCents', () => {
  it('mirrors the local ledger cost (1e6 credits = $1) and rounds up', () => {
    // 1000*6 + 500*12 = 12000 credits = 1.2 cents -> ceil = 2
    expect(computeUsageCents({ model: 'gpt', promptTokens: 1000, completionTokens: 500 })).toBe(2);
  });

  it('rounds any non-zero usage up to at least 1 cent (never under-charges)', () => {
    // 100*6 = 600 credits = 0.06 cents -> ceil = 1
    expect(computeUsageCents({ model: 'gpt', promptTokens: 100, completionTokens: 0 })).toBe(1);
  });

  it('is zero for zero usage', () => {
    expect(computeUsageCents({ model: 'gpt', promptTokens: 0, completionTokens: 0 })).toBe(0);
  });
});
