import { resolveActiveOrg } from './tenantBearer';

describe('resolveActiveOrg', () => {
  it('returns the selected org from the hanzo_active_org cookie', () => {
    expect(resolveActiveOrg({ headers: { cookie: 'hanzo_active_org=acme' } })).toBe('acme');
  });

  it('picks hanzo_active_org out among other cookies', () => {
    const req = {
      headers: { cookie: 'openid_id_token=abc; hanzo_active_org=acme; theme=dark' },
    };
    expect(resolveActiveOrg(req)).toBe('acme');
  });

  it('URL-decodes the org value', () => {
    expect(resolveActiveOrg({ headers: { cookie: 'hanzo_active_org=acme%20labs' } })).toBe(
      'acme labs',
    );
  });

  it('returns null when the cookie is absent (home org, no header)', () => {
    expect(resolveActiveOrg({ headers: { cookie: 'theme=dark' } })).toBeNull();
  });

  it('returns null when there is no cookie header at all', () => {
    expect(resolveActiveOrg({ headers: {} })).toBeNull();
    expect(resolveActiveOrg({})).toBeNull();
  });

  it('returns null for an empty org value rather than an empty string', () => {
    expect(resolveActiveOrg({ headers: { cookie: 'hanzo_active_org=' } })).toBeNull();
  });
});
