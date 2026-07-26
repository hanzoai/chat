import { resolveActiveOrg, resolveRequestOrg } from './tenantBearer';

/**
 * The tenant IS the IAM org — there is no separate tenant identity in chat.
 * These lock in that one resolution order: the org a member switched to
 * (`hanzo_active_org`, admitted only from their own membership set server-side),
 * else their home org projected from the verified IAM `owner` claim.
 */
describe('resolveRequestOrg — the one IAM org for a request', () => {
  const withCookie = (cookie: string, organization?: string) =>
    ({ headers: { cookie }, user: organization ? { organization } : null }) as Parameters<
      typeof resolveRequestOrg
    >[0];

  it('prefers the selected working org over the home org', () => {
    expect(resolveRequestOrg(withCookie('hanzo_active_org=acme', 'hanzo'))).toBe('acme');
  });

  it('falls back to the IAM home org when no org is selected', () => {
    expect(resolveRequestOrg(withCookie('other=1', 'hanzo'))).toBe('hanzo');
  });

  it('is null when IAM gives no org — the caller keeps un-scoped behaviour', () => {
    expect(resolveRequestOrg(withCookie('other=1'))).toBeNull();
    expect(resolveRequestOrg({ headers: {} } as Parameters<typeof resolveRequestOrg>[0])).toBeNull();
  });

  it('does not invent a value resolveActiveOrg would not report', () => {
    const req = withCookie('hanzo_active_org=acme', 'hanzo');
    expect(resolveActiveOrg(req)).toBe('acme');
    expect(resolveRequestOrg(req)).toBe(resolveActiveOrg(req));
  });
});
