const { publicUser, PUBLIC } = require('./publicUser');

/**
 * The projection is the boundary, so these assert the two directions it has to
 * get right: nothing sensitive escapes, and nothing the app renders is lost.
 *
 * The first matters more than it looks. `refreshToken` reached the browser for
 * as long as this endpoint has existed, because every guard here was a
 * deny-list and nobody had thought of it. A test that only checked the fields
 * somebody remembered would have passed the whole time — which is why the last
 * case asserts the RULE (an unknown field is withheld) rather than a list.
 */
describe('publicUser', () => {
  const full = {
    id: 'u1',
    _id: 'u1',
    name: 'A Person',
    username: 'person',
    email: 'a@hanzo.ai',
    emailVerified: true,
    avatar: '/avatars/u1.png',
    provider: 'openid',
    role: 'USER',
    openidId: 'iam-sub-uuid',
    organization: 'hanzo',
    project: 'proj',
    groups: ['hanzo'],
    plugins: ['web_search'],
    twoFactorEnabled: true,
    termsAccepted: true,
    personalization: { memories: false },
    favorites: [{ model: 'zen5', endpoint: 'Hanzo' }],
    // none of the following may ever reach a browser
    password: 'hashed',
    __v: 3,
    totpSecret: 'totp',
    backupCodes: [{ codeHash: 'x' }],
    refreshToken: [{ refreshToken: 'a-real-refresh-token' }],
    googleId: 'g',
    facebookId: 'f',
    samlId: 's',
    ldapId: 'l',
    githubId: 'gh',
    discordId: 'd',
    appleId: 'ap',
    idOnTheSource: 'ext',
  };

  it('withholds the refresh token — the credential httpOnly exists to hide', () => {
    const out = publicUser(full);
    expect(out).not.toHaveProperty('refreshToken');
    // Belt and braces: not anywhere in the serialized body either.
    expect(JSON.stringify(out)).not.toContain('a-real-refresh-token');
  });

  it('withholds every secret and external identity id', () => {
    const out = publicUser(full);
    for (const key of [
      'password',
      '__v',
      'totpSecret',
      'backupCodes',
      'googleId',
      'facebookId',
      'samlId',
      'ldapId',
      'githubId',
      'discordId',
      'appleId',
      'idOnTheSource',
    ]) {
      expect(out).not.toHaveProperty(key);
    }
  });

  it('keeps what the app renders, including the IAM subject', () => {
    const out = publicUser(full);
    expect(out).toMatchObject({
      id: 'u1',
      email: 'a@hanzo.ai',
      role: 'USER',
      avatar: '/avatars/u1.png',
      twoFactorEnabled: true,
      // the org switcher
      organization: 'hanzo',
      project: 'proj',
      groups: ['hanzo'],
      // AnalyticsProvider's cross-surface identity
      openidId: 'iam-sub-uuid',
    });
  });

  it('withholds a field nobody has heard of — the rule, not a list', () => {
    // The whole reason this is an allow-list: a field added to the schema
    // tomorrow must not ship merely because no one remembered to strip it.
    const out = publicUser({ ...full, aFieldAddedNextTuesday: 'surprise' });
    expect(out).not.toHaveProperty('aFieldAddedNextTuesday');
  });

  it('omits absent keys rather than sending them undefined', () => {
    const out = publicUser({ id: 'u1' });
    expect(Object.keys(out)).toEqual(['id']);
  });

  it('reads a mongoose document through toObject', () => {
    const doc = { toObject: () => full };
    expect(publicUser(doc).email).toBe('a@hanzo.ai');
    expect(publicUser(doc)).not.toHaveProperty('refreshToken');
  });

  it('passes null and undefined straight back', () => {
    expect(publicUser(null)).toBeNull();
    expect(publicUser(undefined)).toBeUndefined();
  });

  it('never lists a secret among the public fields', () => {
    for (const key of ['password', 'totpSecret', 'backupCodes', 'refreshToken', '__v']) {
      expect(PUBLIC).not.toContain(key);
    }
  });
});
