/**
 * Batch 8a contract proof: seven chat-native domains with no external subsystem
 * owner, running the REAL production methods against the SQLite store.
 * MemoryEntry, ToolCall, Assistant, Action, AccessRole, Role, AgentApiKey.
 */
import { createMemoryMethods } from './memory';
import { createToolCallMethods } from './toolCall';
import { createAssistantMethods } from './assistant';
import { createActionMethods } from './action';
import { createAccessRoleMethods } from './accessRole';
import { createRoleMethods } from './role';
import { createAgentApiKeyMethods } from './agentApiKey';
import { createSqliteHandle, ObjectId, type SqliteHandle } from '~/stores/sqlite';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let handle: SqliteHandle;

beforeEach(() => {
  handle = createSqliteHandle([
    'MemoryEntry',
    'ToolCall',
    'Assistant',
    'Action',
    'AccessRole',
    'Role',
    'AgentApiKey',
  ]);
});
afterEach(() => handle.close());

describe('MemoryEntry (real methods)', () => {
  it('setMemory upserts; getAllUserMemories lists; createMemory rejects dup; delete', async () => {
    const m = createMemoryMethods(handle);
    await m.setMemory({ userId: 'u1', key: 'likes', value: 'coffee' } as never);
    await m.setMemory({ userId: 'u1', key: 'likes', value: 'tea' } as never); // upsert same row
    const all = (await m.getAllUserMemories('u1' as never)) as Array<{ key: string; value: string }>;
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe('tea');

    await expect(m.createMemory({ userId: 'u1', key: 'likes', value: 'x' } as never)).rejects.toThrow(/already exists/);
    await m.deleteMemory({ userId: 'u1', key: 'likes' } as never);
    expect(await m.getAllUserMemories('u1' as never)).toHaveLength(0);
  });
});

describe('ToolCall (real methods)', () => {
  it('create → getById → getByConvo → deleteToolCalls', async () => {
    const tc = createToolCallMethods(handle);
    const created = (await tc.createToolCall({
      conversationId: 'c1',
      messageId: 'm1',
      toolId: 'search',
      user: 'u1',
      result: { ok: 1 },
    } as never)) as { _id: string };
    expect((await tc.getToolCallById(created._id))?.toolId).toBe('search');
    expect(await tc.getToolCallsByConvo('c1', 'u1')).toHaveLength(1);
    await tc.deleteToolCalls('u1', 'c1');
    expect(await tc.getToolCallsByConvo('c1', 'u1')).toHaveLength(0);
  });
});

describe('Assistant (real methods)', () => {
  it('updateAssistantDoc upsert → getAssistant → deleteAssistant', async () => {
    const a = createAssistantMethods(handle);
    await a.updateAssistantDoc(
      { assistant_id: 'as1', user: 'u1' } as never,
      { avatar: { filepath: '/a' } } as never,
      { upsert: true, new: true } as never,
    );
    expect((await a.getAssistant({ assistant_id: 'as1' } as never))?.user).toBe('u1');
    await a.deleteAssistant({ assistant_id: 'as1' } as never);
    expect(await a.getAssistant({ assistant_id: 'as1' } as never)).toBeNull();
  });
});

describe('Action (real methods)', () => {
  it('updateAction upsert → getActions → deleteAction', async () => {
    const ac = createActionMethods(handle);
    await ac.updateAction(
      { action_id: 'act1', user: 'u1' } as never,
      { type: 'action', metadata: { domain: 'example.com' } } as never,
      { upsert: true, new: true } as never,
    );
    const list = (await ac.getActions({ user: 'u1' } as never)) as unknown[];
    expect(list).toHaveLength(1);
    await ac.deleteAction({ action_id: 'act1' } as never);
    expect(await ac.getActions({ user: 'u1' } as never)).toHaveLength(0);
  });
});

describe('AccessRole (real methods)', () => {
  it('createRole → findRoleByIdentifier → getAllRoles → deleteRole', async () => {
    const ar = createAccessRoleMethods(handle);
    await ar.createRole({
      accessRoleId: 'owner',
      name: 'Owner',
      resourceType: 'agent',
      permBits: 7,
    } as never);
    expect((await ar.findRoleByIdentifier('owner' as never))?.name).toBe('Owner');
    expect(await ar.getAllRoles()).toHaveLength(1);
    await ar.deleteRole('owner' as never);
    expect(await ar.findRoleByIdentifier('owner' as never)).toBeNull();
  });
});

describe('Role (real methods)', () => {
  it('initializeRoles seeds defaults; listRoles returns them', async () => {
    const r = createRoleMethods(handle);
    await r.initializeRoles();
    const roles = (await r.listRoles()) as Array<{ name: string }>;
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.every((x) => typeof x.name === 'string')).toBe(true);
  });
});

describe('AgentApiKey (real methods)', () => {
  it('createAgentApiKey → validateAgentApiKey → list → delete', async () => {
    const k = createAgentApiKeyMethods(handle);
    const userId = new ObjectId().toHexString();
    const created = (await k.createAgentApiKey({ userId, name: 'ci' } as never)) as { key: string };
    expect(created.key).toBeTruthy();

    const valid = await k.validateAgentApiKey(created.key as never);
    expect(String(valid?.userId)).toBe(userId);

    expect(await k.listAgentApiKeys(userId as never)).toHaveLength(1);
    expect(await k.validateAgentApiKey('wrong-key' as never)).toBeNull();
  });
});
