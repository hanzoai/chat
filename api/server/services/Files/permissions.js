const { logger } = require('@hanzochat/data-schemas');
const { Constants, PermissionBits, ResourceType } = require('@hanzochat/data-provider');
const { checkPermission } = require('~/server/services/PermissionService');
const { getAgent } = require('~/models/Agent');
const { getFiles } = require('~/models/File');

/**
 * Checks if a user has access to multiple files through a shared agent (batch operation)
 * @param {Object} params - Parameters object
 * @param {string} params.userId - The user ID to check access for
 * @param {string} [params.role] - Optional user role to avoid DB query
 * @param {string[]} params.fileIds - Array of file IDs to check
 * @param {string} params.agentId - The agent ID that might grant access
 * @param {boolean} [params.isDelete] - Whether the operation is a delete operation
 * @returns {Promise<Map<string, boolean>>} Map of fileId to access status
 */
const hasAccessToFilesViaAgent = async ({ userId, role, fileIds, agentId, isDelete }) => {
  const accessMap = new Map(fileIds.map((fileId) => [fileId, false]));

  try {
    const agent = await getAgent({ id: agentId });

    if (!agent) {
      return accessMap;
    }

    /**
     * Only files this agent carries are ever in play, and asking that first is
     * both cheaper and safer than asking it last.
     *
     * The author branch used to sit above this and read
     * `fileIds.forEach((id) => accessMap.set(id, true))` — every id the CALLER
     * named, attached or not, owned or not. Since the caller names the ids and
     * anyone can create an agent, that granted the author of any agent access
     * to any file in the system by id. On `DELETE /v1/chat/files` it also
     * returned before the `isDelete` EDIT check, so the same request deleted
     * the file.
     */
    const attached = new Set();
    for (const resource of Object.values(agent.tool_resources ?? {})) {
      for (const fileId of resource?.file_ids ?? []) {
        attached.add(fileId);
      }
    }
    const candidates = fileIds.filter((fileId) => attached.has(fileId));
    if (candidates.length === 0) {
      return accessMap;
    }

    if (agent.author?.toString() !== userId.toString()) {
      const canView = await checkPermission({
        userId,
        role,
        resourceType: ResourceType.AGENT,
        resourceId: agent._id,
        requiredPermission: PermissionBits.VIEW,
      });

      if (!canView) {
        return accessMap;
      }

      if (isDelete) {
        /** Reading a shared agent's files is VIEW; removing them is EDIT. */
        const canEdit = await checkPermission({
          userId,
          role,
          resourceType: ResourceType.AGENT,
          resourceId: agent._id,
          requiredPermission: PermissionBits.EDIT,
        });

        if (!canEdit) {
          return accessMap;
        }
      }
    }

    /**
     * An agent lends out its AUTHOR's files and nothing else. `tool_resources`
     * is written by whoever edits the agent, so without this an id is a claim
     * rather than a fact: attach a file you do not own and the agent hands it
     * to you. A file with no owner recorded matches nobody and stays denied.
     */
    const wanted = new Set(candidates);
    const files = await getFiles({ file_id: { $in: candidates } });
    for (const file of files) {
      // `wanted` again rather than trusting the filter to have been applied:
      // the store answers the query, and a grant should not rest on that.
      if (wanted.has(file.file_id) && file.user?.toString() === agent.author?.toString()) {
        accessMap.set(file.file_id, true);
      }
    }

    return accessMap;
  } catch (error) {
    logger.error('[hasAccessToFilesViaAgent] Error checking file access:', error);
    return accessMap;
  }
};

/**
 * Filter files based on user access through agents
 * @param {Object} params - Parameters object
 * @param {Array<MongoFile>} params.files - Array of file documents
 * @param {string} params.userId - User ID for access control
 * @param {string} [params.role] - Optional user role to avoid DB query
 * @param {string} params.agentId - Agent ID that might grant access to files
 * @returns {Promise<Array<MongoFile>>} Filtered array of accessible files
 */
const filterFilesByAgentAccess = async ({ files, userId, role, agentId }) => {
  if (!userId || !agentId || !files || files.length === 0) {
    return files;
  }

  // Separate owned files from files that need access check
  const filesToCheck = [];
  const ownedFiles = [];

  for (const file of files) {
    if (file.user && file.user.toString() === userId.toString()) {
      ownedFiles.push(file);
    } else {
      filesToCheck.push(file);
    }
  }

  if (filesToCheck.length === 0) {
    return ownedFiles;
  }

  /**
   * An id that cannot name a saved agent grants nothing, so there is no lookup
   * to make — the ephemeral agent is the plain-chat path, where a file is
   * reachable by owning it and by nothing else.
   *
   * Upstream returns `files` UNFILTERED here, and that is the one place this
   * fork deliberately differs. `agentId` arrives from the request, so returning
   * everything for an id of the wrong shape means any caller can skip the
   * filter by naming one. Same saved round trip, opposite default.
   */
  if (agentId === Constants.EPHEMERAL_AGENT_ID || !agentId.startsWith('agent_')) {
    return ownedFiles;
  }

  // Batch check access for all non-owned files
  const fileIds = filesToCheck.map((f) => f.file_id);
  const accessMap = await hasAccessToFilesViaAgent({ userId, role, fileIds, agentId });

  // Filter files based on access
  const accessibleFiles = filesToCheck.filter((file) => accessMap.get(file.file_id));

  return [...ownedFiles, ...accessibleFiles];
};

module.exports = {
  hasAccessToFilesViaAgent,
  filterFilesByAgentAccess,
};
