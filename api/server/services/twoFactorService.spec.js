const { verifyOTPOrBackupCode } = require('./twoFactorService');

jest.mock('~/models', () => ({ updateUser: jest.fn() }));

/**
 * `verifyOTPOrBackupCode` is an authentication decision, so what matters is the
 * shape of its refusals as much as its approvals: a caller reads `verified` and
 * nothing else should be able to make that true.
 *
 * It is tested through the real TOTP and backup-code implementations rather than
 * mocks. A mock here would only prove the branching, and the branching is not
 * the part that can hurt anyone.
 */
describe('verifyOTPOrBackupCode', () => {
  const {
    generateTOTPSecret,
    generateTOTP,
    generateBackupCodes,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require('./twoFactorService');

  /** A user document as the callers load it: `+totpSecret +backupCodes`. */
  const enabled = async () => {
    const totpSecret = generateTOTPSecret();
    const { plainCodes, codeObjects } = await generateBackupCodes(2);
    return {
      user: { _id: 'u1', twoFactorEnabled: true, totpSecret, backupCodes: codeObjects },
      plainCodes,
    };
  };

  it('accepts the current TOTP code', async () => {
    const { user } = await enabled();
    const token = await generateTOTP(user.totpSecret);
    await expect(verifyOTPOrBackupCode({ user, token })).resolves.toEqual({ verified: true });
  });

  it('accepts a real backup code when no token is sent', async () => {
    const { user, plainCodes } = await enabled();
    await expect(
      verifyOTPOrBackupCode({ user, backupCode: plainCodes[0] }),
    ).resolves.toEqual({ verified: true });
  });

  it('refuses a wrong TOTP code with 401', async () => {
    const { user } = await enabled();
    await expect(verifyOTPOrBackupCode({ user, token: '000000' })).resolves.toMatchObject({
      verified: false,
      status: 401,
    });
  });

  it('refuses an account with 2FA off, whatever it sends', async () => {
    // The caller decides WHETHER to demand a factor; this refuses to pretend it
    // verified one for an account that has none.
    const { user } = await enabled();
    const token = await generateTOTP(user.totpSecret);
    await expect(
      verifyOTPOrBackupCode({ user: { ...user, twoFactorEnabled: false }, token }),
    ).resolves.toMatchObject({ verified: false, status: 400 });
  });

  it('refuses when there is no secret to check against', async () => {
    await expect(
      verifyOTPOrBackupCode({ user: { twoFactorEnabled: true }, token: '123456' }),
    ).resolves.toMatchObject({ verified: false, status: 400 });
  });

  it('refuses an empty request rather than treating it as a pass', async () => {
    const { user } = await enabled();
    await expect(verifyOTPOrBackupCode({ user })).resolves.toMatchObject({
      verified: false,
      status: 400,
    });
  });

  it('refuses null and undefined users', async () => {
    for (const user of [null, undefined]) {
      await expect(verifyOTPOrBackupCode({ user, token: '123456' })).resolves.toMatchObject({
        verified: false,
      });
    }
  });

  it('prefers the token when both are sent, so a backup code cannot mask a bad token', async () => {
    // The backup code here is REAL. With an `||` fallback this passes and the
    // bad token is forgiven — and a spent backup code is the cost. That is the
    // whole point of the assertion, so the fixture has to be a code that would
    // actually work on its own.
    const { user, plainCodes } = await enabled();
    await expect(
      verifyOTPOrBackupCode({ user, token: '000000', backupCode: plainCodes[0] }),
    ).resolves.toMatchObject({ verified: false, status: 401 });
  });
});
