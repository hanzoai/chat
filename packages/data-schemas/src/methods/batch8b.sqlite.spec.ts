/**
 * Batch 8b contract proof: the ObjectId/aggregate/ACL chat-native domains —
 * Agent, AgentCategory (aggregate $group), AclEntry, Group — real methods on
 * the SQLite store. Exercises the ObjectId shim + the new $group primitive.
 */
import { createAgentMethods } from './agent';
import { createAgentCategoryMethods } from './agentCategory';
import { createAclEntryMethods } from './aclEntry';
import { createUserGroupMethods } from './userGroup';
import { createSqliteHandle, ObjectId, CHAT_COLLECTION_SPECS, type SqliteHandle } from '~/stores/sqlite';

// User is identity (held from the registry); provide a minimal spec inline so
// Group.addUserToGroup can resolve it in this test without flipping identity.
const specs = {
  ...CHAT_COLLECTION_SPECS,
  User: { name: 'User', index: ['idOnTheSource', 'email'], dateFields: ['createdAt', 'updatedAt'] },
};

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const agentDeps = {
  removeAllPermissions: jest.fn(async () => undefined),
  getActions: jest.fn(async () => []),
  getSoleOwnedResourceIds: jest.fn(async () => []),
} as never;

let handle: SqliteHandle;

beforeEach(() => {
  handle = createSqliteHandle(['Agent', 'AgentCategory', 'AclEntry', 'Group', 'User'], { specs });
});
afterEach(() => handle.close());

describe('Agent (real methods, ObjectId versions)', () => {
  it('createAgent → getAgent → updateAgent → deleteAgent', async () => {
    const a = createAgentMethods(handle, agentDeps);
    const author = new ObjectId().toHexString();
    await a.createAgent({ id: 'agent_x', name: 'Helper', author, provider: 'openai', model: 'gpt-4' });
    expect((await a.getAgent({ id: 'agent_x' }))?.name).toBe('Helper');

    await a.updateAgent({ id: 'agent_x' }, { name: 'Helper v2' }, { updatingUserId: author });
    expect((await a.getAgent({ id: 'agent_x' }))?.name).toBe('Helper v2');

    await a.deleteAgent({ id: 'agent_x' });
    expect(await a.getAgent({ id: 'agent_x' })).toBeNull();
    expect(agentDeps.removeAllPermissions).toHaveBeenCalled();
  });
});

describe('AgentCategory (real methods, aggregate $group)', () => {
  it('getCategoriesWithCounts groups agents by category via $group', async () => {
    const cat = createAgentCategoryMethods(handle);
    await cat.createCategory({ value: 'coding', label: 'Coding', isActive: true, order: 1 } as never);
    await cat.createCategory({ value: 'writing', label: 'Writing', isActive: true, order: 2 } as never);

    const author = new ObjectId().toHexString();
    await handle.models.Agent.create({ id: 'a1', name: 'A1', author, category: 'coding' });
    await handle.models.Agent.create({ id: 'a2', name: 'A2', author, category: 'coding' });
    await handle.models.Agent.create({ id: 'a3', name: 'A3', author, category: 'writing' });

    const withCounts = (await cat.getCategoriesWithCounts()) as Array<{
      value: string;
      agentCount: number;
    }>;
    const coding = withCounts.find((c) => c.value === 'coding');
    const writing = withCounts.find((c) => c.value === 'writing');
    expect(coding?.agentCount).toBe(2); // $group { _id: '$category', count: { $sum: 1 } }
    expect(writing?.agentCount).toBe(1);
  });
});

describe('AclEntry (real methods, ObjectId principals/resources)', () => {
  it('grantPermission → hasPermission → revokePermission', async () => {
    const acl = createAclEntryMethods(handle);
    const principalId = new ObjectId().toHexString();
    const resourceId = new ObjectId().toHexString();
    const grantedBy = new ObjectId().toHexString();

    await acl.grantPermission('user', principalId, 'agent', resourceId, 15, grantedBy);
    expect(
      await acl.hasPermission([{ principalType: 'user', principalId }], 'agent', resourceId, 1),
    ).toBe(true);

    await acl.revokePermission('user', principalId, 'agent', resourceId);
    expect(
      await acl.hasPermission([{ principalType: 'user', principalId }], 'agent', resourceId, 1),
    ).toBe(false);
  });
});

describe('Group (real methods, ObjectId members)', () => {
  it('createGroup → findGroupById → addUserToGroup → getUserGroups', async () => {
    const g = createUserGroupMethods(handle);
    const created = (await g.createGroup({ name: 'devs' } as never)) as { _id: string };
    expect((await g.findGroupById(created._id as never))?.name).toBe('devs');

    const userId = new ObjectId().toHexString();
    await handle.models.User.create({ _id: userId, email: 'dev@x.io' });
    await g.addUserToGroup(userId as never, created._id as never);

    // write landed: userId is a member of the group
    const stored = (await handle.models.Group.findById(created._id).lean()) as { memberIds: string[] };
    expect(stored.memberIds).toContain(userId);

    // read path: getUserGroups resolves the group by member id
    const groups = (await g.getUserGroups(userId as never)) as Array<{ name: string }>;
    expect(groups.some((x) => x.name === 'devs')).toBe(true);
  });
});
