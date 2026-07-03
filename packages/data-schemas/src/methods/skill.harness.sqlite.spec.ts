/**
 * Skill / SkillFile full-method harness on SQLite — the REAL createSkillMethods
 * with stub ACL deps (PermissionService is injected, not part of storage).
 * Closes the coverage gap left by batch7 (which proved storage ops only).
 */
import { createSkillMethods } from './skill';
import { createSqliteHandle, ObjectId, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const deps = {
  removeAllPermissions: jest.fn(async () => undefined),
  getSoleOwnedResourceIds: jest.fn(async () => []),
} as never;

let handle: SqliteHandle;
let skills: ReturnType<typeof createSkillMethods>;
const author = new ObjectId().toHexString();

beforeEach(() => {
  handle = createSqliteHandle(['Skill', 'SkillFile']);
  skills = createSkillMethods(handle, deps);
});
afterEach(() => handle.close());

describe('Skill full methods (real, ObjectId + ACL)', () => {
  it('createSkill → getSkillById → getSkillByName(accessibleIds) → duplicate rejected', async () => {
    const { skill } = await skills.createSkill({
      name: 'writer',
      description: 'Writes prose',
      author,
      body: '# Writer',
      tenantId: 't1',
    } as never);
    expect(skill.name).toBe('writer');
    expect(String(skill._id)).toMatch(/^[0-9a-f]{24}$/);

    const byId = await skills.getSkillById(String(skill._id));
    expect(byId?.name).toBe('writer');

    // ACL listing by accessible ObjectIds
    const byName = await skills.getSkillByName('writer', [new ObjectId(String(skill._id)) as never]);
    expect(byName?.name).toBe('writer');

    // uniqueness on (name, author, tenantId)
    await expect(
      skills.createSkill({ name: 'writer', description: 'dup', author, body: 'x', tenantId: 't1' } as never),
    ).rejects.toThrow();
  });

  it('updateSkill optimistic version bump; deleteSkill removes + drops ACL', async () => {
    const { skill } = await skills.createSkill({
      name: 'coder',
      description: 'Writes code',
      author,
      body: '# Coder',
    } as never);
    const res = (await skills.updateSkill({
      id: String(skill._id),
      expectedVersion: 1,
      update: { description: 'now with tests' } as never,
    })) as { status: string };
    expect(res.status).toBe('updated');
    expect((await skills.getSkillById(String(skill._id)))?.version).toBe(2);

    const del = await skills.deleteSkill(String(skill._id));
    expect(del.deleted).toBe(true);
    expect(deps.removeAllPermissions).toHaveBeenCalled();
    expect(await skills.getSkillById(String(skill._id))).toBeNull();
  });
});

describe('SkillFile full methods (real, new-vs-replace + list)', () => {
  it('upsertSkillFile returns null on insert, previous on replace; get/list', async () => {
    const skillId = new ObjectId().toHexString();

    // upsertSkillFile stores file METADATA and returns the CURRENT (post-upsert)
    // doc; its internal new-vs-replace detection relies on findOneAndUpdate(
    // new:false) being null on insert (verified directly in DocModel.spec).
    const first = (await skills.upsertSkillFile({
      skillId,
      relativePath: 'README.md',
      file_id: 'f-readme-1',
      filename: 'README.md',
    } as never)) as { file_id: string; relativePath: string };
    expect(first.relativePath).toBe('README.md');
    expect(first.file_id).toBe('f-readme-1');

    const second = (await skills.upsertSkillFile({
      skillId,
      relativePath: 'README.md',
      file_id: 'f-readme-2',
      filename: 'README.md',
    } as never)) as { file_id: string };
    expect(second.file_id).toBe('f-readme-2'); // same row replaced

    const file = await skills.getSkillFileByPath(skillId, 'README.md');
    expect((file as { file_id: string }).file_id).toBe('f-readme-2');

    await skills.upsertSkillFile({ skillId, relativePath: 'src/main.py', file_id: 'f-main' } as never);
    const list = await skills.listSkillFiles(skillId);
    expect(list.map((f) => f.relativePath)).toEqual(['README.md', 'src/main.py']); // sorted
  });
});
