import { resolveActiveOrg, ACTIVE_ORG_COOKIE } from './activeOrg';

/** Build a minimal request carrying a raw Cookie header. */
const reqWithCookie = (cookie?: string) => ({ headers: { cookie } });

describe('resolveActiveOrg', () => {
  it('returns the selected org from the hanzo_active_org cookie', () => {
    expect(resolveActiveOrg(reqWithCookie(`${ACTIVE_ORG_COOKIE}=acme`))).toBe('acme');
  });

  it('picks the org out of a Cookie header carrying several pairs', () => {
    const cookie = `theme=dark; ${ACTIVE_ORG_COOKIE}=acme; token_provider=openid`;
    expect(resolveActiveOrg(reqWithCookie(cookie))).toBe('acme');
  });

  it('URL-decodes the cookie value', () => {
    expect(resolveActiveOrg(reqWithCookie(`${ACTIVE_ORG_COOKIE}=acme%2Fteam`))).toBe('acme/team');
  });

  it('returns null when the cookie is absent', () => {
    expect(resolveActiveOrg(reqWithCookie('theme=dark'))).toBeNull();
  });

  it('returns null when there is no Cookie header at all', () => {
    expect(resolveActiveOrg(reqWithCookie(undefined))).toBeNull();
    expect(resolveActiveOrg({ headers: {} })).toBeNull();
    expect(resolveActiveOrg({})).toBeNull();
  });

  it('returns null for an empty cookie value (falls back to the home org)', () => {
    expect(resolveActiveOrg(reqWithCookie(`${ACTIVE_ORG_COOKIE}=`))).toBeNull();
  });
});
