import mongoose from 'mongoose';
import { createModels, closeSharedSqliteHandle } from './index';

describe('createModels — per-domain store registry', () => {
  afterEach(() => {
    delete process.env.CHAT_STORE_SQLITE;
    // Rekeying createModels opens the shared native handle; close it so no open
    // SQLite connection leaks into a sibling spec sharing this jest worker.
    closeSharedSqliteHandle();
  });

  it('defaults to mongoose for every collection (live path unchanged)', () => {
    const models = createModels(mongoose);
    expect(models.Conversation.constructor.name).not.toBe('DocModel');
    expect(models.Message.constructor.name).not.toBe('DocModel');
  });

  it('overrides only the listed collections with the SQLite DocModel', () => {
    process.env.CHAT_STORE_SQLITE =
      'Conversation,Message,Preset,ConversationTag,SharedLink,Project,File,Key,PluginAuth,Banner,Config,SystemGrant,MCPServer,Skill,SkillFile,Prompt,PromptGroup,Agent,AgentCategory,AclEntry,Group,MemoryEntry,ToolCall,Assistant,Action,AccessRole,Role,AgentApiKey';
    const models = createModels(mongoose);
    for (const name of [
      'Conversation',
      'Message',
      'Preset',
      'ConversationTag',
      'SharedLink',
      'Project',
      'File',
      'Key',
      'PluginAuth',
      'Banner',
      'Config',
      'SystemGrant',
      'MCPServer',
      'Skill',
      'SkillFile',
      'Prompt',
      'PromptGroup',
      'Agent',
      'AgentCategory',
      'AclEntry',
      'Group',
      'MemoryEntry',
      'ToolCall',
      'Assistant',
      'Action',
      'AccessRole',
      'Role',
      'AgentApiKey',
    ] as const) {
      expect(models[name].constructor.name).toBe('DocModel');
    }
    // A non-migrated collection stays on mongoose
    expect(models.User.constructor.name).not.toBe('DocModel');
  });

  it('ignores unknown / not-yet-migrated collection names (fails closed)', () => {
    process.env.CHAT_STORE_SQLITE = 'Conversation,DoesNotExist';
    const models = createModels(mongoose);
    expect(models.Conversation.constructor.name).toBe('DocModel');
  });
});
