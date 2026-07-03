/**
 * Batch 7 contract proof: ObjectId-coupled domains on the SQLite store, using
 * the handle.Types.ObjectId shim + engine coerceId.
 *
 * - MCPServer: full real-method spec (create/find/findById/author/update/delete)
 *   — exercises DocModel.findById + ObjectId author fields.
 * - Skill/SkillFile: storage-level proof of the operations their methods perform
 *   (tenant-isolated compound-unique, `_id: { $in: accessibleIds }` ObjectId ACL
 *   filtering via coercion, SkillFile compound-unique upsert). The 800-line Skill
 *   method layer (ACL-injected deps + frontmatter validation) rides on exactly
 *   these store ops; a full real-method harness for it is a follow-up.
 */
import { createMCPServerMethods } from './mcpServer';
import { createSqliteHandle, ObjectId, type SqliteHandle } from '~/stores/sqlite';
import type { DocModel } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('MCPServer on SQLite (real methods, ObjectId author + findById)', () => {
  let handle: SqliteHandle;
  let mcp: ReturnType<typeof createMCPServerMethods>;

  beforeEach(() => {
    handle = createSqliteHandle(['MCPServer']);
    mcp = createMCPServerMethods(handle);
  });
  afterEach(() => handle.close());

  it('create → findByServerName → findByObjectId → byAuthor → update → delete', async () => {
    const author = new ObjectId().toHexString();
    const created = await mcp.createMCPServer({
      config: { title: 'My Server' } as never,
      author,
    });
    expect(created.serverName).toBeTruthy();
    expect(created._id).toMatch(/^[0-9a-f]{24}$/);

    const byName = await mcp.findMCPServerByServerName(created.serverName);
    expect(byName?._id).toBe(created._id);

    // findById via ObjectId string — coerceId matches the stored hex _id
    const byId = await mcp.findMCPServerByObjectId(created._id);
    expect(byId?.serverName).toBe(created.serverName);
    // findById via an ObjectId instance operand — coercion path
    const byIdObj = await mcp.findMCPServerByObjectId(new ObjectId(created._id) as never);
    expect(byIdObj?.serverName).toBe(created.serverName);

    const byAuthor = await mcp.findMCPServersByAuthor(author);
    expect(byAuthor).toHaveLength(1);

    await mcp.updateMCPServer(created.serverName, { config: { title: 'Renamed' } as never });
    const updated = await mcp.findMCPServerByServerName(created.serverName);
    expect((updated?.config as { title: string }).title).toBe('Renamed');

    await mcp.deleteMCPServer(created.serverName);
    expect(await mcp.findMCPServerByServerName(created.serverName)).toBeNull();
  });

  it('serverName is unique (create generates a distinct name each time)', async () => {
    const author = new ObjectId().toHexString();
    const a = await mcp.createMCPServer({ config: { title: 'Dup' } as never, author });
    const b = await mcp.createMCPServer({ config: { title: 'Dup' } as never, author });
    expect(a.serverName).not.toBe(b.serverName); // findNextAvailableServerName dedupes
    expect(await handle.models.MCPServer.countDocuments({})).toBe(2);
  });
});

describe('Skill / SkillFile storage ops (tenant-isolated, ObjectId ACL)', () => {
  let handle: SqliteHandle;
  let Skill: DocModel;
  let SkillFile: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['Skill', 'SkillFile']);
    Skill = handle.models.Skill;
    SkillFile = handle.models.SkillFile;
  });
  afterEach(() => handle.close());

  it('Skill compound unique {name,author,tenantId}; ACL `_id: {$in}` filters by ObjectId', async () => {
    const author = new ObjectId().toHexString();
    const s1 = (await Skill.create({ name: 'writer', author, tenantId: 't1', body: 'x' })) as {
      _id: string;
    };
    // same name+author, different tenant => allowed
    await Skill.create({ name: 'writer', author, tenantId: 't2', body: 'y' });
    // same name+author+tenant => rejected
    await expect(Skill.create({ name: 'writer', author, tenantId: 't1' })).rejects.toThrow();

    // ACL-style listing: `_id: { $in: accessibleIds }` where ids are ObjectIds
    const rows = (await Skill.find({ _id: { $in: [new ObjectId(s1._id)] } }).lean()) as unknown[];
    expect(rows).toHaveLength(1);
  });

  it('SkillFile compound unique {skillId,relativePath} upsert', async () => {
    const skillId = new ObjectId().toHexString();
    await SkillFile.findOneAndUpdate(
      { skillId, relativePath: 'README.md' },
      { $set: { content: 'v1' } },
      { upsert: true, new: true },
    );
    await SkillFile.findOneAndUpdate(
      { skillId, relativePath: 'README.md' },
      { $set: { content: 'v2' } },
      { upsert: true, new: true },
    );
    expect(await SkillFile.countDocuments({ skillId })).toBe(1); // upsert, not dup
    const f = (await SkillFile.findOne({ skillId, relativePath: 'README.md' }).lean()) as {
      content: string;
    };
    expect(f.content).toBe('v2');
  });
});
