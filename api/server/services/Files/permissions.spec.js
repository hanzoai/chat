jest.mock('@hanzochat/data-schemas', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('~/server/services/PermissionService', () => ({
  checkPermission: jest.fn(),
}));

/**
 * `~/models/Agent`, not the `~/models` barrel — the subject imports the module
 * directly, so a barrel mock is a different object that nothing under test ever
 * calls. Both halves of this file were wrong before: it never loaded at all
 * (the real `~/models/Agent` pulls in `~/models/Project` → `db/models`, and
 * this file stubs `@hanzochat/data-schemas` down to a logger, so
 * `createModels` was undefined), and had it loaded, every
 * `expect(getAgent).not.toHaveBeenCalled()` would have passed against a mock
 * the subject cannot reach.
 *
 * `getFiles` moves with it, to `~/models/File`: the access check consults file
 * OWNERSHIP, so the mock has to be the one the subject reads.
 */
jest.mock('~/models/Agent', () => ({
  getAgent: jest.fn(),
}));

jest.mock('~/models/File', () => ({
  getFiles: jest.fn(),
}));

const { logger } = require('@hanzochat/data-schemas');
const { Constants, PermissionBits, ResourceType } = require('@hanzochat/data-provider');
const { checkPermission } = require('~/server/services/PermissionService');
const { getAgent } = require('~/models/Agent');
const { getFiles } = require('~/models/File');
const { filterFilesByAgentAccess, hasAccessToFilesViaAgent } = require('./permissions');

const AUTHOR_ID = 'author-user-id';
const USER_ID = 'viewer-user-id';
const AGENT_ID = 'agent_test-abc123';
const AGENT_MONGO_ID = 'mongo-agent-id';

function makeFile(file_id, user) {
  return { file_id, user, filename: `${file_id}.txt` };
}

function makeAgent(overrides = {}) {
  return {
    _id: AGENT_MONGO_ID,
    id: AGENT_ID,
    author: AUTHOR_ID,
    tool_resources: {
      file_search: { file_ids: ['attached-1', 'attached-2'] },
      execute_code: { file_ids: ['attached-3'] },
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getFiles.mockResolvedValue([
    makeFile('attached-1', AUTHOR_ID),
    makeFile('attached-2', AUTHOR_ID),
    makeFile('attached-3', AUTHOR_ID),
    makeFile('not-attached', AUTHOR_ID),
  ]);
});

describe('filterFilesByAgentAccess', () => {
  describe('early returns (no DB calls)', () => {
    /**
     * Upstream returns these UNFILTERED and this fork returns the caller's own
     * files, which is the one deliberate divergence in this module. `agentId`
     * comes off the request, so "an id that names no agent means no filtering"
     * lets any caller opt out by sending one. An id that cannot name a saved
     * agent grants nothing instead — same skipped lookup, opposite default.
     */
    it('grants nothing through an ephemeral agentId, without a lookup', async () => {
      const mine = makeFile('mine', USER_ID);
      const theirs = makeFile('f1', 'other-user');
      const result = await filterFilesByAgentAccess({
        files: [mine, theirs],
        userId: USER_ID,
        agentId: Constants.EPHEMERAL_AGENT_ID,
      });

      expect(result).toEqual([mine]);
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('grants nothing through an id that is not an agent id, without a lookup', async () => {
      const mine = makeFile('mine', USER_ID);
      const theirs = makeFile('f1', 'other-user');
      const result = await filterFilesByAgentAccess({
        files: [mine, theirs],
        userId: USER_ID,
        agentId: 'custom-memory-id',
      });

      expect(result).toEqual([mine]);
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('should return files when userId is missing', async () => {
      const files = [makeFile('f1', 'someone')];
      const result = await filterFilesByAgentAccess({
        files,
        userId: undefined,
        agentId: AGENT_ID,
      });

      expect(result).toBe(files);
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('should return files when agentId is missing', async () => {
      const files = [makeFile('f1', 'someone')];
      const result = await filterFilesByAgentAccess({
        files,
        userId: USER_ID,
        agentId: undefined,
      });

      expect(result).toBe(files);
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('should return empty array when files is empty', async () => {
      const result = await filterFilesByAgentAccess({
        files: [],
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual([]);
      expect(getAgent).not.toHaveBeenCalled();
    });

    it('should return undefined when files is nullish', async () => {
      const result = await filterFilesByAgentAccess({
        files: null,
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toBeNull();
      expect(getAgent).not.toHaveBeenCalled();
    });
  });

  describe('all files owned by userId', () => {
    it('should return all files without calling getAgent', async () => {
      const files = [makeFile('f1', USER_ID), makeFile('f2', USER_ID)];
      const result = await filterFilesByAgentAccess({
        files,
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual(files);
      expect(getAgent).not.toHaveBeenCalled();
    });
  });

  describe('mixed owned and non-owned files', () => {
    const ownedFile = makeFile('owned-1', USER_ID);
    const sharedFile = makeFile('attached-1', AUTHOR_ID);
    const unattachedFile = makeFile('not-attached', AUTHOR_ID);

    it('should return owned + accessible non-owned files when user has VIEW', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(true);

      const result = await filterFilesByAgentAccess({
        files: [ownedFile, sharedFile, unattachedFile],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.file_id)).toContain('owned-1');
      expect(result.map((f) => f.file_id)).toContain('attached-1');
      expect(result.map((f) => f.file_id)).not.toContain('not-attached');
    });

    it('should not return a file referenced from an agent that is not authored by the file owner', async () => {
      getAgent.mockResolvedValue(makeAgent({ author: USER_ID }));
      checkPermission.mockResolvedValue(true);

      const result = await filterFilesByAgentAccess({
        files: [sharedFile],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(result).toEqual([]);
    });

    it('should return only owned files when user lacks VIEW permission', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(false);

      const result = await filterFilesByAgentAccess({
        files: [ownedFile, sharedFile],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(result).toEqual([ownedFile]);
    });

    it('should return only owned files when agent is not found', async () => {
      getAgent.mockResolvedValue(null);

      const result = await filterFilesByAgentAccess({
        files: [ownedFile, sharedFile],
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual([ownedFile]);
    });

    it('should return only owned files on DB error (fail-closed)', async () => {
      getAgent.mockRejectedValue(new Error('DB connection lost'));

      const result = await filterFilesByAgentAccess({
        files: [ownedFile, sharedFile],
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual([ownedFile]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('file with no user field', () => {
    it('should exclude the file even when attached to the agent', async () => {
      const noUserFile = makeFile('attached-1', undefined);
      getAgent.mockResolvedValue(makeAgent());
      // The stored record is what ownership is read from, so it has to be the
      // ownerless one too — otherwise this asserts nothing about ownerless files.
      getFiles.mockResolvedValue([noUserFile]);
      checkPermission.mockResolvedValue(true);

      const result = await filterFilesByAgentAccess({
        files: [noUserFile],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(getAgent).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should exclude file with no user field when not attached to agent', async () => {
      const noUserFile = makeFile('not-attached', null);
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(true);

      const result = await filterFilesByAgentAccess({
        files: [noUserFile],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(result).toEqual([]);
    });
  });

  describe('no owned files (all non-owned)', () => {
    const file1 = makeFile('attached-1', AUTHOR_ID);
    const file2 = makeFile('not-attached', AUTHOR_ID);

    it('should return only attached files when user has VIEW', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(true);

      const result = await filterFilesByAgentAccess({
        files: [file1, file2],
        userId: USER_ID,
        role: 'USER',
        agentId: AGENT_ID,
      });

      expect(result).toEqual([file1]);
    });

    it('should return empty array when no VIEW permission', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(false);

      const result = await filterFilesByAgentAccess({
        files: [file1, file2],
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when agent not found', async () => {
      getAgent.mockResolvedValue(null);

      const result = await filterFilesByAgentAccess({
        files: [file1],
        userId: USER_ID,
        agentId: AGENT_ID,
      });

      expect(result).toEqual([]);
    });
  });
});

describe('hasAccessToFilesViaAgent', () => {
  describe('agent not found', () => {
    it('should return all-false map', async () => {
      getAgent.mockResolvedValue(null);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['f1', 'f2'],
        agentId: AGENT_ID,
      });

      expect(result.get('f1')).toBe(false);
      expect(result.get('f2')).toBe(false);
    });
  });

  describe('author path', () => {
    it('should grant access to attached files for the agent author', async () => {
      getAgent.mockResolvedValue(makeAgent());

      const result = await hasAccessToFilesViaAgent({
        userId: AUTHOR_ID,
        fileIds: ['attached-1', 'not-attached'],
        agentId: AGENT_ID,
      });

      expect(result.get('attached-1')).toBe(true);
      expect(result.get('not-attached')).toBe(false);
      expect(checkPermission).not.toHaveBeenCalled();
    });

    it('should deny attached files not owned by the agent author', async () => {
      getAgent.mockResolvedValue(makeAgent({ author: USER_ID }));
      getFiles.mockResolvedValue([makeFile('attached-1', AUTHOR_ID)]);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['attached-1'],
        agentId: AGENT_ID,
      });

      expect(result.get('attached-1')).toBe(false);
    });
  });

  describe('VIEW permission path', () => {
    it('should grant access to attached files for viewer with VIEW permission', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(true);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        role: 'USER',
        fileIds: ['attached-1', 'attached-3', 'not-attached'],
        agentId: AGENT_ID,
      });

      expect(result.get('attached-1')).toBe(true);
      expect(result.get('attached-3')).toBe(true);
      expect(result.get('not-attached')).toBe(false);

      expect(checkPermission).toHaveBeenCalledWith({
        userId: USER_ID,
        role: 'USER',
        resourceType: ResourceType.AGENT,
        resourceId: AGENT_MONGO_ID,
        requiredPermission: PermissionBits.VIEW,
      });
    });

    it('should deny all when VIEW permission is missing', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValue(false);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['attached-1'],
        agentId: AGENT_ID,
      });

      expect(result.get('attached-1')).toBe(false);
    });
  });

  describe('delete path (EDIT permission required)', () => {
    it('should grant access when both VIEW and EDIT pass', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['attached-1'],
        agentId: AGENT_ID,
        isDelete: true,
      });

      expect(result.get('attached-1')).toBe(true);
      expect(checkPermission).toHaveBeenCalledTimes(2);
      expect(checkPermission).toHaveBeenLastCalledWith(
        expect.objectContaining({ requiredPermission: PermissionBits.EDIT }),
      );
    });

    it('should deny all when VIEW passes but EDIT fails', async () => {
      getAgent.mockResolvedValue(makeAgent());
      checkPermission.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['attached-1'],
        agentId: AGENT_ID,
        isDelete: true,
      });

      expect(result.get('attached-1')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return all-false map on DB error (fail-closed)', async () => {
      getAgent.mockRejectedValue(new Error('connection refused'));

      const result = await hasAccessToFilesViaAgent({
        userId: USER_ID,
        fileIds: ['f1', 'f2'],
        agentId: AGENT_ID,
      });

      expect(result.get('f1')).toBe(false);
      expect(result.get('f2')).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        '[hasAccessToFilesViaAgent] Error checking file access:',
        expect.any(Error),
      );
    });
  });

  describe('agent with no tool_resources', () => {
    it('should deny all files even for the author', async () => {
      getAgent.mockResolvedValue(makeAgent({ tool_resources: undefined }));

      const result = await hasAccessToFilesViaAgent({
        userId: AUTHOR_ID,
        fileIds: ['f1'],
        agentId: AGENT_ID,
      });

      expect(result.get('f1')).toBe(false);
    });
  });
});
