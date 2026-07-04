import { createSqliteHandle, type SqliteHandle } from './index';
import type { DocModel } from './DocModel';

/**
 * `select:false` secret exclusion (the #48 review gap): the SQLite store must NOT
 * return schema-hidden fields on projection-less reads, matching the hiding
 * mongoose does at the schema layer. Secrets: `User.totpSecret`/`backupCodes`,
 * `AgentApiKey.keyHash`; internal flag: `Message._meiliIndex`. Native-driver spec
 * → runs one-file-per-process (see test/ci.mjs).
 */
describe('DocModel — select:false deselection', () => {
  let handle: SqliteHandle;
  let User: DocModel;
  let AgentApiKey: DocModel;
  let Message: DocModel;
  let SharedLink: DocModel;

  beforeEach(() => {
    handle = createSqliteHandle(['User', 'AgentApiKey', 'Message', 'SharedLink']);
    User = handle.models.User;
    AgentApiKey = handle.models.AgentApiKey;
    Message = handle.models.Message;
    SharedLink = handle.models.SharedLink;
  });
  afterEach(() => handle.close());

  async function seedUser() {
    return (await User.create({
      email: 'a@b.co',
      username: 'ab',
      totpSecret: 'TOTP-SECRET-XYZ',
      backupCodes: [{ codeHash: 'h1', used: false }],
    })) as { _id: string };
  }

  it('projection-less findById / findOne / find OMIT totpSecret + backupCodes', async () => {
    const u = await seedUser();

    const byId = (await User.findById(u._id).lean()) as Record<string, unknown>;
    expect(byId.email).toBe('a@b.co'); // normal field present
    expect(byId).not.toHaveProperty('totpSecret');
    expect(byId).not.toHaveProperty('backupCodes');

    const one = (await User.findOne({ email: 'a@b.co' }).lean()) as Record<string, unknown>;
    expect(one).not.toHaveProperty('totpSecret');
    expect(one).not.toHaveProperty('backupCodes');

    const many = (await User.find({ email: 'a@b.co' }).lean()) as Array<Record<string, unknown>>;
    expect(many[0]).not.toHaveProperty('totpSecret');
    expect(many[0]).not.toHaveProperty('backupCodes');
  });

  it('a `+field` projection re-includes ONLY the requested deselected field', async () => {
    const u = await seedUser();

    // Mirrors getUserById(id, '+totpSecret +backupCodes') and single-field asks.
    const only = (await User.findById(u._id).select('+totpSecret').lean()) as Record<string, unknown>;
    expect(only.totpSecret).toBe('TOTP-SECRET-XYZ');
    expect(only).not.toHaveProperty('backupCodes'); // NOT requested → still hidden
    expect(only.email).toBe('a@b.co'); // full doc otherwise

    const both = (await User.findById(u._id).select('+totpSecret +backupCodes').lean()) as Record<
      string,
      unknown
    >;
    expect(both.totpSecret).toBe('TOTP-SECRET-XYZ');
    expect(both.backupCodes).toBeDefined();

    // Array form (mongoose accepts `['+totpSecret']`).
    const arr = (await User.findById(u._id).select(['+totpSecret']).lean()) as Record<string, unknown>;
    expect(arr.totpSecret).toBe('TOTP-SECRET-XYZ');
  });

  it('an inclusion projection of the field returns it; exclusion still hides it', async () => {
    const u = await seedUser();

    const incl = (await User.findById(u._id).select({ totpSecret: 1 }).lean()) as Record<string, unknown>;
    expect(incl.totpSecret).toBe('TOTP-SECRET-XYZ');
    expect(incl._id).toBeDefined();
    expect(incl).not.toHaveProperty('email'); // pure inclusion

    // Exclusion projection of an unrelated field must NOT re-expose the secret.
    const excl = (await User.findById(u._id).select('-username').lean()) as Record<string, unknown>;
    expect(excl).not.toHaveProperty('totpSecret');
    expect(excl).not.toHaveProperty('username');
    expect(excl.email).toBe('a@b.co');
  });

  it('AgentApiKey.keyHash: filterable by value, hidden in the result unless +keyHash', async () => {
    await AgentApiKey.create({ userId: 'u1', name: 'k', keyHash: 'HASH-SECRET', keyPrefix: 'ak_abc' });

    // The FILTER on keyHash still matches (deselection is a read-projection concern).
    const found = (await AgentApiKey.findOne({ keyHash: 'HASH-SECRET' }).lean()) as Record<string, unknown>;
    expect(found).toBeTruthy();
    expect(found.keyPrefix).toBe('ak_abc');
    expect(found).not.toHaveProperty('keyHash'); // secret not returned

    const withHash = (await AgentApiKey.findOne({ keyHash: 'HASH-SECRET' })
      .select('+keyHash')
      .lean()) as Record<string, unknown>;
    expect(withHash.keyHash).toBe('HASH-SECRET');
  });

  it('Message._meiliIndex is hidden by default, on reads AND aggregation, and in populate', async () => {
    const m1 = (await Message.create({
      messageId: 'm1',
      conversationId: 'c1',
      user: 'u1',
      text: 'A',
      _meiliIndex: true,
    })) as { _id: string };

    const read = (await Message.findOne({ messageId: 'm1' }).lean()) as Record<string, unknown>;
    expect(read.text).toBe('A');
    expect(read).not.toHaveProperty('_meiliIndex');

    // Aggregation is fail-secure too (stricter than mongoose, which bypasses select:false).
    const agg = await Message.aggregate([{ $match: { conversationId: 'c1' } }]);
    expect(agg[0]).not.toHaveProperty('_meiliIndex');

    // Populate: the populated Message sub-docs must also hide the internal flag.
    await SharedLink.create({ shareId: 's1', conversationId: 'c1', user: 'u1', messages: [{ _id: m1._id }] });
    const populated = (await SharedLink.findOne({ shareId: 's1' })
      .populate({ path: 'messages' })
      .lean()) as { messages: Array<Record<string, unknown>> };
    expect(populated.messages[0].text).toBe('A');
    expect(populated.messages[0]).not.toHaveProperty('_meiliIndex');
  });
});
