import mongoose from 'mongoose';
import { createModels } from './index';

describe('createModels — per-domain store registry', () => {
  afterEach(() => {
    delete process.env.CHAT_STORE_SQLITE;
  });

  it('defaults to mongoose for every collection (live path unchanged)', () => {
    const models = createModels(mongoose);
    expect(models.Conversation.constructor.name).not.toBe('DocModel');
    expect(models.Message.constructor.name).not.toBe('DocModel');
  });

  it('overrides only the listed collections with the SQLite DocModel', () => {
    process.env.CHAT_STORE_SQLITE =
      'Conversation,Message,Preset,ConversationTag,SharedLink,Project';
    const models = createModels(mongoose);
    expect(models.Conversation.constructor.name).toBe('DocModel');
    expect(models.Message.constructor.name).toBe('DocModel');
    expect(models.Preset.constructor.name).toBe('DocModel');
    expect(models.ConversationTag.constructor.name).toBe('DocModel');
    expect(models.SharedLink.constructor.name).toBe('DocModel');
    expect(models.Project.constructor.name).toBe('DocModel');
    // A non-migrated collection stays on mongoose
    expect(models.User.constructor.name).not.toBe('DocModel');
  });

  it('ignores unknown / not-yet-migrated collection names (fails closed)', () => {
    process.env.CHAT_STORE_SQLITE = 'Conversation,DoesNotExist';
    const models = createModels(mongoose);
    expect(models.Conversation.constructor.name).toBe('DocModel');
  });
});
