/**
 * Batch 6 contract proof: SystemGrant on the tenant-aware SQLite store — the
 * REAL createSystemGrantMethods (capability grants / checks / revokes, platform
 * and tenant-scoped). Exercises DocModel.exists() and the tenantIsolated variant.
 */
import { PrincipalType } from 'librechat-data-provider';
import { SystemCapabilities } from '~/admin/capabilities';
import { createSystemGrantMethods } from './systemGrant';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let handle: SqliteHandle;
let grants: ReturnType<typeof createSystemGrantMethods>;

const principal = (principalId: string) => [{ principalType: PrincipalType.USER, principalId }];

beforeEach(() => {
  handle = createSqliteHandle(['SystemGrant']);
  grants = createSystemGrantMethods(handle);
});
afterEach(() => handle.close());

describe('SystemGrant on SQLite (real methods)', () => {
  it('grant → has (via exists) → revoke, and unrelated capability is not held', async () => {
    await grants.grantCapability({
      principalType: PrincipalType.USER,
      principalId: '507f1f77bcf86cd799439011',
      capability: SystemCapabilities.READ_USERS,
    });

    expect(
      await grants.hasCapabilityForPrincipals({
        principals: principal('507f1f77bcf86cd799439011'),
        capability: SystemCapabilities.READ_USERS,
      }),
    ).toBe(true);
    expect(
      await grants.hasCapabilityForPrincipals({
        principals: principal('507f1f77bcf86cd799439011'),
        capability: SystemCapabilities.READ_CONFIGS,
      }),
    ).toBe(false);

    await grants.revokeCapability({
      principalType: PrincipalType.USER,
      principalId: '507f1f77bcf86cd799439011',
      capability: SystemCapabilities.READ_USERS,
    });
    expect(
      await grants.hasCapabilityForPrincipals({
        principals: principal('507f1f77bcf86cd799439011'),
        capability: SystemCapabilities.READ_USERS,
      }),
    ).toBe(false);
  });

  it('grantCapability is idempotent (upsert, one row)', async () => {
    const params = {
      principalType: PrincipalType.USER,
      principalId: '507f1f77bcf86cd799439011',
      capability: SystemCapabilities.READ_USERS,
    };
    await grants.grantCapability(params);
    await grants.grantCapability(params);
    expect(await handle.models.SystemGrant.countDocuments({})).toBe(1);
  });

  it('tenant-scoped grants isolate across tenants (platform-vs-tenant)', async () => {
    await grants.grantCapability({
      principalType: PrincipalType.USER,
      principalId: '507f1f77bcf86cd799439011',
      capability: SystemCapabilities.READ_USERS,
      tenantId: 'tenantA',
    });
    expect(
      await grants.hasCapabilityForPrincipals({
        principals: principal('507f1f77bcf86cd799439011'),
        capability: SystemCapabilities.READ_USERS,
        tenantId: 'tenantA',
      }),
    ).toBe(true);
    // tenant B does not inherit tenant A's grant
    expect(
      await grants.hasCapabilityForPrincipals({
        principals: principal('507f1f77bcf86cd799439011'),
        capability: SystemCapabilities.READ_USERS,
        tenantId: 'tenantB',
      }),
    ).toBe(false);
  });
});
