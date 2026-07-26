// getS3Key is a pure function; stub the heavy transitive deps crud.js pulls in at
// require time (the SDK clients and the built @hanzochat/api bundle) so the key
// convention can be asserted without booting S3 or the agents runtime.
jest.mock('@hanzochat/api', () => ({
  initializeS3: jest.fn(),
  deleteRagFile: jest.fn(),
  isEnabled: () => false,
  resolveRequestOrg: jest.fn(),
}));
jest.mock('@hanzochat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@hanzochat/data-provider', () => ({ FileSources: { s3: 's3' } }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

const { getS3Key } = require('./crud');

/**
 * File storage is org-scoped in the shared bucket: the key carries the IAM org so
 * one org's objects live in their own subtree. Pre-tenancy objects (and callers
 * IAM gives no org) keep the historical flat key, which is why reads of existing
 * files keep working.
 */
describe('getS3Key — IAM org scoping of the shared bucket', () => {
  it('prefixes t/<org>/ when the request has an IAM org', () => {
    expect(getS3Key('images', 'user1', 'a.png', 'acme')).toBe('t/acme/images/user1/a.png');
  });

  it('keeps the historical flat key when there is no org', () => {
    expect(getS3Key('images', 'user1', 'a.png')).toBe('images/user1/a.png');
    expect(getS3Key('images', 'user1', 'a.png', null)).toBe('images/user1/a.png');
    expect(getS3Key('images', 'user1', 'a.png', '')).toBe('images/user1/a.png');
  });

  it('separates orgs — the whole point of the prefix', () => {
    const a = getS3Key('images', 'user1', 'a.png', 'acme');
    const b = getS3Key('images', 'user1', 'a.png', 'globex');
    expect(a).not.toBe(b);
    expect(a.startsWith('t/acme/')).toBe(true);
    expect(b.startsWith('t/globex/')).toBe(true);
  });

  it('refuses an org that would escape its prefix', () => {
    expect(() => getS3Key('images', 'user1', 'a.png', '../evil')).toThrow(/invalid tenantId/);
    expect(() => getS3Key('images', 'user1', 'a.png', '..')).toThrow(/invalid tenantId/);
    expect(() => getS3Key('images', 'user1', 'a.png', 'a/b')).toThrow(/invalid tenantId/);
  });
});
