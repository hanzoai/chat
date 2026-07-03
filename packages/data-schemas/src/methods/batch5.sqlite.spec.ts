/**
 * Batch 5 contract proof: Config on the tenant-aware SQLite document store.
 *
 * Config carries the mongoose `applyTenantIsolation` plugin upstream. This proves
 * the DocModel `tenantIsolated` variant reproduces it: filters are scoped to the
 * active tenant, inserts are stamped with tenantId, and one tenant cannot see or
 * delete another's rows — running the REAL createConfigMethods.
 */
import { createConfigMethods } from './config';
import { createSqliteHandle, type SqliteHandle } from '~/stores/sqlite';
import { tenantStorage } from '~/config/tenantContext';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let handle: SqliteHandle;
let config: ReturnType<typeof createConfigMethods>;

const asTenant = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> =>
  tenantStorage.run({ tenantId }, fn);

beforeEach(() => {
  handle = createSqliteHandle(['Config']);
  config = createConfigMethods(handle);
});
afterEach(() => handle.close());

describe('Config on SQLite (tenant-isolated, real methods)', () => {
  it('stamps tenantId on insert and isolates identical principals per tenant', async () => {
    await asTenant('tenantA', () =>
      config.upsertConfig('user', 'p1', 'User', { theme: 'dark' }, 10),
    );
    await asTenant('tenantB', () =>
      config.upsertConfig('user', 'p1', 'User', { theme: 'light' }, 10),
    );

    // Same principal (user/p1) in two tenants => two distinct rows.
    expect(await handle.models.Config.countDocuments({})).toBe(2);

    const a = (await asTenant('tenantA', () =>
      config.findConfigByPrincipal('user', 'p1'),
    )) as { overrides: { theme: string }; tenantId: string } | null;
    const b = (await asTenant('tenantB', () =>
      config.findConfigByPrincipal('user', 'p1'),
    )) as { overrides: { theme: string }; tenantId: string } | null;

    expect(a?.overrides.theme).toBe('dark');
    expect(a?.tenantId).toBe('tenantA');
    expect(b?.overrides.theme).toBe('light'); // tenant B sees its OWN row, not A's
    expect(b?.tenantId).toBe('tenantB');
  });

  it('re-upsert within a tenant updates the same row (no duplicate)', async () => {
    await asTenant('A', () => config.upsertConfig('user', 'p1', 'User', { v: 1 }, 5));
    await asTenant('A', () => config.upsertConfig('user', 'p1', 'User', { v: 2 }, 5));
    expect(await handle.models.Config.countDocuments({})).toBe(1);
    const c = (await asTenant('A', () => config.findConfigByPrincipal('user', 'p1'))) as {
      overrides: { v: number };
    } | null;
    expect(c?.overrides.v).toBe(2);
  });

  it('listAllConfigs and findConfigByPrincipal are tenant-scoped', async () => {
    await asTenant('A', () => config.upsertConfig('user', 'p1', 'User', {}, 1));
    await asTenant('B', () => config.upsertConfig('user', 'p2', 'User', {}, 1));

    const listA = (await asTenant('A', () => config.listAllConfigs())) as Array<{
      tenantId: string;
    }>;
    expect(listA).toHaveLength(1);
    expect(listA[0].tenantId).toBe('A');

    // Tenant B cannot see tenant A's principal p1.
    expect(await asTenant('B', () => config.findConfigByPrincipal('user', 'p1'))).toBeNull();
  });

  it('a tenant cannot delete another tenant’s config', async () => {
    await asTenant('A', () => config.upsertConfig('user', 'p1', 'User', {}, 1));
    await asTenant('B', () => config.deleteConfig('user', 'p1')); // scoped to B => no-op on A
    // A's row still resolves for A
    expect(await asTenant('A', () => config.findConfigByPrincipal('user', 'p1'))).not.toBeNull();
  });
});
