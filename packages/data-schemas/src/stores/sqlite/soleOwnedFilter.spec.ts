import { matchesFilter } from './engine';

/**
 * Pins the exact filter shapes PermissionService.getSoleOwnedResourceIds uses.
 * That function feeds deleteMany on account deletion, so if these predicates
 * are wrong we delete somebody else's data. The PermissionService suite itself
 * cannot run (pre-existing Jest transform failure), so the risky predicate is
 * verified here, against the engine that actually evaluates it.
 */
describe('getSoleOwnedResourceIds — filter semantics', () => {
  const ME = 'user-me';
  const OWNER = 15; // VIEW|EDIT|DELETE|SHARE
  const EDITOR = 3; // VIEW|EDIT — no DELETE
  const VIEWER = 1;
  const OWNER_BIT = 4; // PermissionBits.DELETE

  const ownerFilter = { resourceType: 'promptGroup', permBits: { $bitsAllSet: OWNER_BIT } };
  const mineFilter = { ...ownerFilter, principalType: 'user', principalId: ME };
  const othersFilter = {
    ...ownerFilter,
    $nor: [{ principalType: 'user', principalId: ME }],
  };

  const row = (principalId: string, permBits: number, principalType = 'user') => ({
    resourceType: 'promptGroup',
    principalType,
    principalId,
    permBits,
  });

  it('$bitsAllSet(DELETE) selects owners and rejects editors/viewers', () => {
    expect(matchesFilter(row(ME, OWNER), mineFilter)).toBe(true);
    expect(matchesFilter(row(ME, EDITOR), mineFilter)).toBe(false);
    expect(matchesFilter(row(ME, VIEWER), mineFilter)).toBe(false);
  });

  it('the "other owners" filter EXCLUDES me and INCLUDES every other owner', () => {
    expect(matchesFilter(row(ME, OWNER), othersFilter)).toBe(false);
    expect(matchesFilter(row('user-them', OWNER), othersFilter)).toBe(true);
    expect(matchesFilter(row('group-x', OWNER, 'group'), othersFilter)).toBe(true);
    expect(matchesFilter(row('public', OWNER, 'public'), othersFilter)).toBe(true);
  });

  it('a non-owner co-grantee is NOT counted as another owner', () => {
    // else a viewer on my prompt would make it look shared and block deletion
    expect(matchesFilter(row('user-them', EDITOR), othersFilter)).toBe(false);
    expect(matchesFilter(row('user-them', VIEWER), othersFilter)).toBe(false);
  });

  it('does not leak across resource types', () => {
    expect(matchesFilter({ ...row(ME, OWNER), resourceType: 'agent' }, mineFilter)).toBe(false);
  });
});
