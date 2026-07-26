const fs = require('fs');
const { logAxiosError } = require('@hanzochat/api');
const { logger } = require('@hanzochat/data-schemas');
const ragClient = require('~/server/services/RagClient');
const { FileSources } = require('@hanzochat/data-provider');

/**
 * Deletes a file from the vector database. This function takes a file object, constructs the full path, and
 * verifies the path's validity before deleting the file. If the path is invalid, an error is thrown.
 *
 * @param {ServerRequest} req - The request object from Express.
 * @param {MongoFile} file - The file object to be deleted. It should have a `filepath` property that is
 *                           a string representing the path of the file relative to the publicPath.
 *
 * @returns {Promise<void>}
 *          A promise that resolves when the file has been successfully deleted, or throws an error if the
 *          file path is invalid or if there is an error in deletion.
 */
const deleteVectors = async (req, file) => {
  if (!file.embedded || !ragClient.ragEnabled()) {
    return;
  }
  try {
    // One RAG surface: the unified backend, reached with the caller's own IAM
    // bearer (see services/RagClient).
    return await ragClient.remove(req, { file_id: file.file_id });
  } catch (error) {
    logAxiosError({
      error,
      message: 'Error deleting vectors',
    });
    if (
      error.response &&
      error.response.status !== 404 &&
      (error.response.status < 200 || error.response.status >= 300)
    ) {
      logger.warn('Error deleting vectors, file will not be deleted');
      throw new Error(error.message || 'An error occurred during file deletion.');
    }
  }
};

/**
 * Uploads a file to the configured Vector database
 *
 * @param {Object} params - The params object.
 * @param {Object} params.req - The request object from Express. It should have a `user` property with an `id` representing the user
 * @param {Express.Multer.File} params.file - The file object, which is part of the request. The file object should
 *                                     have a `path` property that points to the location of the uploaded file.
 * @param {string} params.file_id - The file ID.
 * @param {string} [params.entity_id] - The entity ID for shared resources.
 * @param {Object} [params.storageMetadata] - Storage metadata for dual storage pattern.
 *
 * @returns {Promise<{ filepath: string, bytes: number }>}
 *          A promise that resolves to an object containing:
 *            - filepath: The path where the file is saved.
 *            - bytes: The size of the file in bytes.
 */
async function uploadVectors({ req, file, file_id, entity_id }) {
  if (!ragClient.ragEnabled()) {
    throw new Error('RAG is not configured (no cloud origin)');
  }

  try {
    // The unified backend parses and chunks the file itself, so it needs the text
    // (or a location it can fetch). `entity_id` becomes the store — a shared
    // resource keeps its own store — and ownership comes from the IAM bearer, so
    // it is never sent as a field.
    const responseData = await ragClient.embed(req, {
      file_id,
      filename: file.originalname,
      content: fs.readFileSync(file.path, 'utf8'),
      ...(entity_id ? { store: entity_id } : {}),
    });

    if (responseData == null) {
      throw new Error('File embedding failed: no forwardable IAM token on the request.');
    }
    logger.debug('Response from embedding file', responseData);

    // Native result: { file_id, filename, store, index_name, chunks }. Zero
    // chunks means nothing was indexed — the file produced no retrievable text.
    if (!responseData.chunks) {
      throw new Error(
        `File embedding produced no chunks (filetype ${file.mimetype} may be unsupported).`,
      );
    }

    return {
      bytes: file.size,
      filename: file.originalname,
      filepath: FileSources.vectordb,
      embedded: responseData.chunks > 0,
    };
  } catch (error) {
    logAxiosError({
      error,
      message: 'Error uploading vectors',
    });
    throw new Error(error.message || 'An error occurred during file upload.');
  }
}

module.exports = {
  deleteVectors,
  uploadVectors,
};
