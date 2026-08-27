/**
 * The sign-up address, and the authorize request it has to carry.
 *
 * Registration that reaches the issuer without a request cannot be answered
 * with a code, so the visitor is left at the issuer holding an account this app
 * has never seen. These pin the two halves: the address is the issuer's own
 * registration screen for THIS client, and the query on it is the very request
 * a sign-in would have made.
 */
const mockGetSigninUrl = jest.fn();
jest.mock('@hanzo/iam', () => ({
  IAM: jest.fn().mockImplementation(() => ({ getSigninUrl: mockGetSigninUrl })),
}));
const mockApiBaseUrl = jest.fn(() => '');
jest.mock('@hanzochat/data-provider', () => ({
  setTokenRenewer: jest.fn(),
  apiBaseUrl: () => mockApiBaseUrl(),
}));

import { IAM_SIGNUP_URL, signupUrl } from './iam';

describe('the way in for a visitor with no account', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is the issuer own registration screen for this client', () => {
    expect(IAM_SIGNUP_URL).toBe('https://hanzo.id/signup/hanzo-chat');
  });

  it('carries the authorize request a sign-in would have made', async () => {
    const authorize =
      'https://hanzo.id/v1/iam/oauth/authorize?client_id=hanzo-chat&response_type=code' +
      '&redirect_uri=https%3A%2F%2Fhanzo.chat%2Fauth%2Fcallback&scope=openid+profile+email' +
      '&state=abc123&code_challenge=xyz789&code_challenge_method=S256';
    mockGetSigninUrl.mockResolvedValue(authorize);

    const url = new URL(await signupUrl());

    expect(url.origin + url.pathname).toBe(IAM_SIGNUP_URL);
    expect(url.search).toBe(new URL(authorize).search);
    // The four that decide where a completed registration goes and whether the
    // code it returns can be spent here.
    expect(url.searchParams.get('client_id')).toBe('hanzo-chat');
    expect(url.searchParams.get('redirect_uri')).toBe('https://hanzo.chat/auth/callback');
    expect(url.searchParams.get('state')).toBe('abc123');
    expect(url.searchParams.get('code_challenge')).toBe('xyz789');
  });
});

/**
 * The addresses this app gives IAM to call back.
 *
 * `window.location.origin` carries no path, so on its own it describes the ROOT
 * of the host whatever directory the app is actually served from. Served at
 * hanzo.ai/chat that named https://hanzo.ai/auth/callback — the marketing site —
 * and a sign-in completed onto a page that could not finish it. The host still
 * has to come from the browser (each brand returns to its own), so the fix is to
 * add the base the rest of the app already reads, not to replace the origin.
 */
describe('the callback addresses carry the directory the app is served from', () => {
  const at = (origin: string, base: string) => {
    mockApiBaseUrl.mockReturnValue(base);
    Object.defineProperty(window, 'location', {
      value: { origin },
      writable: true,
    });
    jest.resetModules();
    const { getHanzoIamSdk } = require('./iam');
    const { IAM } = require('@hanzo/iam');
    (IAM as jest.Mock).mockClear();
    getHanzoIamSdk();
    return (IAM as jest.Mock).mock.calls[0]?.[0] ?? {};
  };

  it('is the bare host when the app is served at a root', () => {
    const cfg = at('https://hanzo.chat', '');
    expect(cfg.redirectUri).toBe('https://hanzo.chat/auth/callback');
    expect(cfg.postLogoutRedirectUri).toBe('https://hanzo.chat/login?redirect=false');
  });

  it('carries the subdirectory when the app is served under one', () => {
    const cfg = at('https://hanzo.ai', '/chat');
    expect(cfg.redirectUri).toBe('https://hanzo.ai/chat/auth/callback');
    expect(cfg.postLogoutRedirectUri).toBe('https://hanzo.ai/chat/login?redirect=false');
  });

  it('never names the host root while served from a directory', () => {
    const cfg = at('https://hanzo.ai', '/chat');
    expect(cfg.redirectUri).not.toBe('https://hanzo.ai/auth/callback');
  });
});
