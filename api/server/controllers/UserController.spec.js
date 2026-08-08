const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('@hanzochat/data-schemas', () => {
  const actual = jest.requireActual('@hanzochat/data-schemas');
  return {
    ...actual,
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
  };
});

jest.mock('~/server/services/iamBearerRefresh', () => ({
  currentBearer: jest.fn(),
}));

jest.mock('~/server/controllers/auth/iamSession', () => ({
  pictureFromUserinfo: jest.fn(),
}));

jest.mock('~/models', () => {
  const _mongoose = require('mongoose');
  return {
    deleteAllUserSessions: jest.fn().mockResolvedValue(undefined),
    deleteAllSharedLinks: jest.fn().mockResolvedValue(undefined),
    deleteAllAgentApiKeys: jest.fn().mockResolvedValue(undefined),
    deleteConversationTags: jest.fn().mockResolvedValue(undefined),
    deleteAllUserMemories: jest.fn().mockResolvedValue(undefined),
    deleteTransactions: jest.fn().mockResolvedValue(undefined),
    deleteAclEntries: jest.fn().mockResolvedValue(undefined),
    updateUserPlugins: jest.fn(),
    deleteAssistants: jest.fn().mockResolvedValue(undefined),
    deleteUserById: jest.fn().mockResolvedValue(undefined),
    deleteUserPrompts: jest.fn().mockResolvedValue(undefined),
    deleteUserSkills: jest.fn().mockResolvedValue(undefined),
    deleteMessages: jest.fn().mockResolvedValue(undefined),
    deleteBalances: jest.fn().mockResolvedValue(undefined),
    deleteActions: jest.fn().mockResolvedValue(undefined),
    deletePresets: jest.fn().mockResolvedValue(undefined),
    deleteUserKey: jest.fn().mockResolvedValue(undefined),
    deleteToolCalls: jest.fn().mockResolvedValue(undefined),
    deleteUserAgents: jest.fn().mockResolvedValue(undefined),
    deleteTokens: jest.fn().mockResolvedValue(undefined),
    deleteConvos: jest.fn().mockResolvedValue(undefined),
    deleteFiles: jest.fn().mockResolvedValue(undefined),
    updateUser: jest.fn(),
    getUserById: jest.fn().mockResolvedValue(null),
    findToken: jest.fn(),
    getFiles: jest.fn().mockResolvedValue([]),
    removeUserFromAllGroups: jest.fn().mockImplementation(async (userId) => {
      const Group = _mongoose.models.Group;
      await Group.updateMany({ memberIds: userId }, { $pullAll: { memberIds: [userId] } });
    }),
  };
});

jest.mock('~/server/services/PluginService', () => ({
  updateUserPluginAuth: jest.fn(),
  deleteUserPluginAuth: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('~/server/services/AuthService', () => ({
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));

jest.mock('sharp', () =>
  jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({}),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.alloc(0)),
  })),
);

jest.mock('@hanzochat/api', () => ({
  ...jest.requireActual('@hanzochat/api'),
  needsRefresh: jest.fn(),
  getNewS3URL: jest.fn(),
}));

jest.mock('~/server/services/Files/process', () => ({
  processDeleteRequest: jest.fn().mockResolvedValue({ deletedFileIds: [], failedFileIds: [] }),
}));

jest.mock('~/server/services/Config', () => ({
  getAppConfig: jest.fn().mockResolvedValue({}),
  getMCPManager: jest.fn(),
  getFlowStateManager: jest.fn(),
  getMCPServersRegistry: jest.fn(),
}));

jest.mock('~/cache', () => ({
  getLogStores: jest.fn(),
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const { deleteUserController, getUserController } = require('./UserController');
const { Group } = require('~/db/models');
const { deleteConvos } = require('~/models');

describe('getUserController', () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should only expose public user response fields from the request user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const req = {
      config: {},
      user: {
        id: 'user-id',
        _id: 'user-id',
        name: 'OpenID User',
        username: 'openid-user',
        email: 'openid@test.com',
        emailVerified: true,
        avatar: '/avatars/user-id.png',
        provider: 'openid',
        role: 'USER',
        plugins: ['web_search'],
        twoFactorEnabled: true,
        termsAccepted: true,
        personalization: { memories: false },
        favorites: [{ model: 'gpt-5', endpoint: 'openAI' }],
        skillStates: { skill_one: true },
        createdAt,
        updatedAt,
        tenantId: 'tenant-id',
        password: 'hashed-password',
        __v: 1,
        totpSecret: 'totp-secret',
        backupCodes: [{ codeHash: 'backup-code' }],
        pendingTotpSecret: 'pending-totp-secret',
        pendingBackupCodes: [{ codeHash: 'pending-backup-code' }],
        refreshToken: [{ refreshToken: 'legacy-refresh-token' }],
        googleId: 'google-id',
        openidId: 'openid-id',
        openidIssuer: 'openid-issuer',
        idOnTheSource: 'external-source-id',
        federatedTokens: {
          access_token: 'access-token',
          id_token: 'id-token',
          refresh_token: 'refresh-token',
        },
        openidTokens: {
          access_token: 'openid-access-token',
          refresh_token: 'openid-refresh-token',
        },
        tokenset: {
          access_token: 'tokenset-access-token',
          refresh_token: 'tokenset-refresh-token',
        },
        safeLookingRuntimeField: 'internal-value',
      },
    };

    await getUserController(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const sentUser = mockRes.send.mock.calls[0][0];
    expect(sentUser).toMatchObject({
      id: 'user-id',
      _id: 'user-id',
      name: 'OpenID User',
      username: 'openid-user',
      email: 'openid@test.com',
      emailVerified: true,
      avatar: '/avatars/user-id.png',
      provider: 'openid',
      role: 'USER',
      plugins: ['web_search'],
      twoFactorEnabled: true,
      termsAccepted: true,
      personalization: { memories: false },
      favorites: [{ model: 'gpt-5', endpoint: 'openAI' }],
      skillStates: { skill_one: true },
      createdAt,
      updatedAt,
      tenantId: 'tenant-id',
    });
    expect(sentUser).not.toHaveProperty('password');
    expect(sentUser).not.toHaveProperty('__v');
    expect(sentUser).not.toHaveProperty('totpSecret');
    expect(sentUser).not.toHaveProperty('backupCodes');
    expect(sentUser).not.toHaveProperty('pendingTotpSecret');
    expect(sentUser).not.toHaveProperty('pendingBackupCodes');
    expect(sentUser).not.toHaveProperty('refreshToken');
    expect(sentUser).not.toHaveProperty('googleId');
    expect(sentUser).not.toHaveProperty('openidId');
    expect(sentUser).not.toHaveProperty('openidIssuer');
    expect(sentUser).not.toHaveProperty('idOnTheSource');
    expect(sentUser).not.toHaveProperty('federatedTokens');
    expect(sentUser).not.toHaveProperty('openidTokens');
    expect(sentUser).not.toHaveProperty('tokenset');
    expect(sentUser).not.toHaveProperty('safeLookingRuntimeField');
  });
  /**
   * The photo, for a session that already existed.
   *
   * Reconciling at login covers everyone who signs in from now on and nobody who
   * was already signed in — they would have had to sign out and back in to
   * collect a photo hanzo.id already holds. These pin the three properties that
   * make adopting it on an ordinary identity read safe rather than merely
   * possible: it never overwrites, it asks at most once per session, and it
   * cannot take the read down with it.
   */
  describe('the hanzo.id photo', () => {
    const { currentBearer } = require('~/server/services/iamBearerRefresh');
    const { pictureFromUserinfo } = require('~/server/controllers/auth/iamSession');
    const { updateUser } = require('~/models');

    const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const reqFor = (user, session = {}) => ({ config: {}, user, session });
    const sent = () => mockRes.send.mock.calls[0][0];

    it('adopts it when the record carries none', async () => {
      currentBearer.mockResolvedValue('bearer-token');
      pictureFromUserinfo.mockResolvedValue(PHOTO);

      await getUserController(reqFor({ id: 'u1', email: 'a@hanzo.ai' }), mockRes);

      expect(pictureFromUserinfo).toHaveBeenCalledWith('bearer-token');
      expect(sent().avatar).toBe(PHOTO);
      // Persisted, so the next read costs nothing.
      expect(updateUser).toHaveBeenCalledWith('u1', { avatar: PHOTO });
    });

    it('never overwrites an avatar the visitor already has', async () => {
      currentBearer.mockResolvedValue('bearer-token');
      pictureFromUserinfo.mockResolvedValue(PHOTO);

      await getUserController(
        reqFor({ id: 'u1', email: 'a@hanzo.ai', avatar: '/avatars/mine.png' }),
        mockRes,
      );

      expect(pictureFromUserinfo).not.toHaveBeenCalled();
      expect(sent().avatar).toBe('/avatars/mine.png');
    });

    it('asks once per session, even when hanzo.id has no photo', async () => {
      currentBearer.mockResolvedValue('bearer-token');
      pictureFromUserinfo.mockResolvedValue('');
      const session = {};

      await getUserController(reqFor({ id: 'u1' }, session), mockRes);
      await getUserController(reqFor({ id: 'u1' }, session), mockRes);

      // Without the mark, an account with no picture pays two round-trips on
      // EVERY identity read, forever, to be told "still none".
      expect(pictureFromUserinfo).toHaveBeenCalledTimes(1);
    });

    it('leaves a local login alone — there is no bearer to ask with', async () => {
      currentBearer.mockResolvedValue(null);

      await getUserController(reqFor({ id: 'u1', provider: 'local' }), mockRes);

      expect(pictureFromUserinfo).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('still answers the read when the photo lookup throws', async () => {
      currentBearer.mockResolvedValue('bearer-token');
      pictureFromUserinfo.mockRejectedValue(new Error('hanzo.id unreachable'));

      await getUserController(reqFor({ id: 'u1', email: 'a@hanzo.ai' }), mockRes);

      // A photo is garnish. It must never cost the visitor their identity read.
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(sent().email).toBe('a@hanzo.ai');
      expect(sent().avatar).toBeUndefined();
    });
  });

});

describe('deleteUserController', () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 on successful deletion', async () => {
    const userId = new mongoose.Types.ObjectId();
    const req = { user: { id: userId.toString(), _id: userId, email: 'test@test.com' } };

    await deleteUserController(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({ message: 'User deleted' });
  });

  it('should remove the user from all groups via $pullAll', async () => {
    const userId = new mongoose.Types.ObjectId();
    const userIdStr = userId.toString();
    const otherUser = new mongoose.Types.ObjectId().toString();

    await Group.create([
      { name: 'Group A', memberIds: [userIdStr, otherUser], source: 'local' },
      { name: 'Group B', memberIds: [userIdStr], source: 'local' },
      { name: 'Group C', memberIds: [otherUser], source: 'local' },
    ]);

    const req = { user: { id: userIdStr, _id: userId, email: 'del@test.com' } };
    await deleteUserController(req, mockRes);

    const groups = await Group.find({}).sort({ name: 1 }).lean();
    expect(groups[0].memberIds).toEqual([otherUser]);
    expect(groups[1].memberIds).toEqual([]);
    expect(groups[2].memberIds).toEqual([otherUser]);
  });

  it('should handle user that exists in no groups', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Group.create({ name: 'Empty', memberIds: ['someone-else'], source: 'local' });

    const req = { user: { id: userId.toString(), _id: userId, email: 'no-groups@test.com' } };
    await deleteUserController(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const group = await Group.findOne({ name: 'Empty' }).lean();
    expect(group.memberIds).toEqual(['someone-else']);
  });

  it('should remove duplicate memberIds if the user appears more than once', async () => {
    const userId = new mongoose.Types.ObjectId();
    const userIdStr = userId.toString();

    await Group.create({
      name: 'Dupes',
      memberIds: [userIdStr, 'other', userIdStr],
      source: 'local',
    });

    const req = { user: { id: userIdStr, _id: userId, email: 'dupe@test.com' } };
    await deleteUserController(req, mockRes);

    const group = await Group.findOne({ name: 'Dupes' }).lean();
    expect(group.memberIds).toEqual(['other']);
  });

  it('should still succeed when deleteConvos throws', async () => {
    const userId = new mongoose.Types.ObjectId();
    deleteConvos.mockRejectedValueOnce(new Error('no convos'));

    const req = { user: { id: userId.toString(), _id: userId, email: 'convos@test.com' } };
    await deleteUserController(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({ message: 'User deleted' });
  });

  it('should return 500 when a critical operation fails', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { deleteMessages } = require('~/models');
    deleteMessages.mockRejectedValueOnce(new Error('db down'));

    const req = { user: { id: userId.toString(), _id: userId, email: 'fail@test.com' } };
    await deleteUserController(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Something went wrong.' });
  });

  it('should use string user.id (not ObjectId user._id) for memberIds removal', async () => {
    const userId = new mongoose.Types.ObjectId();
    const userIdStr = userId.toString();
    const otherUser = 'other-user-id';

    await Group.create({
      name: 'StringCheck',
      memberIds: [userIdStr, otherUser],
      source: 'local',
    });

    const req = { user: { id: userIdStr, _id: userId, email: 'stringcheck@test.com' } };
    await deleteUserController(req, mockRes);

    const group = await Group.findOne({ name: 'StringCheck' }).lean();
    expect(group.memberIds).toEqual([otherUser]);
    expect(group.memberIds).not.toContain(userIdStr);
  });
});
