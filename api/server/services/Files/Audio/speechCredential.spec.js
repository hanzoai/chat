// `@hanzochat/api` is a barrel that pulls the whole agent/langchain graph in, which
// a unit test has no business loading. The two symbols used here are pure, so the
// mock states the contract this file depends on rather than importing the world.
const SENTINEL = '{{CHAT_OPENID_TOKEN}}';

jest.mock('@hanzochat/api', () => ({
  OPENID_BEARER_SENTINEL: '{{CHAT_OPENID_TOKEN}}',
  // Mirrors the real resolver's shape: a forwardable bearer, or nothing.
  resolveTenantBearer: (req) =>
    req?.user?.provider === 'openid' ? (req?.session?.openidTokens?.accessToken ?? null) : null,
}));

jest.mock('@hanzochat/data-provider', () => ({
  extractEnvVariable: (v) => v,
}));

const { resolveSpeechCredential } = require('./speechCredential');

const signedIn = (accessToken, extra = {}) => ({
  user: { provider: 'openid', openidId: 'sub-123', ...extra.user },
  session: { openidTokens: { accessToken } },
  headers: extra.headers || {},
});

describe('resolveSpeechCredential', () => {
  it('passes a literal key through, so a self-hosted OpenAI/Azure key still works', () => {
    const { apiKey, tenantHeaders } = resolveSpeechCredential('sk-literal', signedIn('ignored'));
    expect(apiKey).toBe('sk-literal');
    expect(tenantHeaders).toEqual({});
  });

  it('forwards the caller OWN bearer for the sentinel, so the turn bills them', () => {
    const { apiKey } = resolveSpeechCredential(SENTINEL, signedIn('user-bearer-abc'));
    expect(apiKey).toBe('user-bearer-abc');
  });

  it('refuses instead of falling back when no bearer exists', () => {
    // The one that matters: a signed-out caller must never inherit a shared key.
    const { apiKey } = resolveSpeechCredential(SENTINEL, { user: undefined, headers: {} });
    expect(apiKey).toBe('');
  });

  it('never emits the sentinel itself as a credential', () => {
    // A leaked sentinel would travel as a Bearer and 401 every turn — the
    // literal-${VAR} bug wearing a different hat.
    const { apiKey } = resolveSpeechCredential(SENTINEL, { user: undefined, headers: {} });
    expect(apiKey).not.toBe(SENTINEL);
  });

  it('sends X-Org-Id only alongside a bearer, never alone', () => {
    const withBearer = resolveSpeechCredential(
      SENTINEL,
      signedIn('user-bearer-abc', { user: { activeOrg: 'acme' } }),
    );
    expect(withBearer.tenantHeaders).toEqual({ 'X-Org-Id': 'acme' });

    const withoutBearer = resolveSpeechCredential(SENTINEL, {
      user: { activeOrg: 'acme' },
      headers: {},
    });
    expect(withoutBearer.apiKey).toBe('');
    expect(withoutBearer.tenantHeaders).toEqual({});
  });
});
