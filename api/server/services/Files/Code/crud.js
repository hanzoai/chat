const FormData = require('form-data');
const { getCodeBaseURL } = require('@hanzochat/agents');
const { createAxiosInstance, logAxiosError, resolveTenantBearer } = require('@hanzochat/api');

const axios = createAxiosInstance();

/**
 * Headers for a code-environment call: the S2S key, plus the end user's validated
 * Hanzo IAM bearer when one is resolvable.
 *
 * The X-API-Key authenticates chat->cloud (service to service). It carries NO
 * tenant, so cloud cannot tell which org a sandbox session belongs to — every
 * exec, upload and download looks identical. Forwarding the user's IAM bearer
 * (the SAME canonical resolver the cloud-agents path uses, so there is one way to
 * do this) lets cloud derive the org from a validated principal and scope the
 * sandbox to it.
 *
 * Additive and fail-open by design: with no resolvable bearer the request is
 * byte-identical to before, so this cannot break the current path. Cloud decides
 * whether to REQUIRE the principal.
 *
 * @param {string} apiKey - The code-environment service key.
 * @param {ServerRequest} [req] - The request, when the caller has one.
 * @returns {Record<string, string>} The header bag.
 */
function codeAuthHeaders(apiKey, req) {
  const headers = {
    'User-Agent': 'HanzoChat/1.0',
    'X-API-Key': apiKey,
  };
  const bearer = req ? resolveTenantBearer(req) : null;
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  return headers;
}

const MAX_FILE_SIZE = 150 * 1024 * 1024;

/**
 * Retrieves a download stream for a specified file.
 * @param {string} fileIdentifier - The identifier for the file (e.g., "session_id/fileId").
 * @param {string} apiKey - The API key for authentication.
 * @param {ServerRequest} [req] - The request, so the user's IAM bearer can be forwarded.
 * @returns {Promise<AxiosResponse>} A promise that resolves to a readable stream of the file content.
 * @throws {Error} If there's an error during the download process.
 */
async function getCodeOutputDownloadStream(fileIdentifier, apiKey, req) {
  try {
    const baseURL = getCodeBaseURL();
    /** @type {import('axios').AxiosRequestConfig} */
    const options = {
      method: 'get',
      url: `${baseURL}/download/${fileIdentifier}`,
      responseType: 'stream',
      headers: codeAuthHeaders(apiKey, req),
      timeout: 15000,
    };

    const response = await axios(options);
    return response;
  } catch (error) {
    throw new Error(
      logAxiosError({
        message: `Error downloading code environment file stream: ${error.message}`,
        error,
      }),
    );
  }
}

/**
 * Uploads a file to the Code Environment server.
 * @param {Object} params - The params object.
 * @param {ServerRequest} params.req - The request object from Express. It should have a `user` property with an `id` representing the user
 * @param {import('fs').ReadStream | import('stream').Readable} params.stream - The read stream for the file.
 * @param {string} params.filename - The name of the file.
 * @param {string} params.apiKey - The API key for authentication.
 * @param {string} [params.entity_id] - Optional entity ID for the file.
 * @returns {Promise<string>}
 * @throws {Error} If there's an error during the upload process.
 */
async function uploadCodeEnvFile({ req, stream, filename, apiKey, entity_id = '' }) {
  try {
    const form = new FormData();
    if (entity_id.length > 0) {
      form.append('entity_id', entity_id);
    }
    form.append('file', stream, filename);

    const baseURL = getCodeBaseURL();
    /** @type {import('axios').AxiosRequestConfig} */
    const options = {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data',
        'User-Id': req.user.id,
        ...codeAuthHeaders(apiKey, req),
      },
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE,
    };

    const response = await axios.post(`${baseURL}/upload`, form, options);

    /** @type {{ message: string; session_id: string; files: Array<{ fileId: string; filename: string }> }} */
    const result = response.data;
    if (result.message !== 'success') {
      throw new Error(`Error uploading file: ${result.message}`);
    }

    const fileIdentifier = `${result.session_id}/${result.files[0].fileId}`;
    if (entity_id.length === 0) {
      return fileIdentifier;
    }

    return `${fileIdentifier}?entity_id=${entity_id}`;
  } catch (error) {
    throw new Error(
      logAxiosError({
        message: `Error uploading code environment file: ${error.message}`,
        error,
      }),
    );
  }
}

module.exports = { getCodeOutputDownloadStream, uploadCodeEnvFile };
