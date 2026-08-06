const { Readable } = require('stream');
const { logger } = require('@hanzochat/data-schemas');
const {
  sandboxForRequest,
  SANDBOX_ID_RE,
  ARTIFACT_NAME_RE,
} = require('@hanzochat/api');

/**
 * Files in and out of the code environment, which is a sandbox.
 *
 * There is no second protocol and no second credential. `POST /:id/fs?path=`
 * writes a file, `GET /:id/fs?path=` reads it, and the sandbox is leased under the
 * caller's own IAM bearer — so a file belongs to the org that uploaded it because
 * that is the only org the call could have reached.
 *
 * The `fileIdentifier` chat stores against a file is `"<sandbox id>/<name>"`, the
 * same two-segment shape as before. Its halves just mean something now: the first
 * is a sandbox that can be asked whether it is still alive, the second is a path
 * in it. Previously they were opaque ids in a service nothing could see into.
 */

/** Refuse a file whose name cannot survive being a URL segment and half of a
 *  `session/name` identifier. Checked at the boundary, once. */
function artifactName(name) {
  const clean = String(name ?? '').trim();
  if (!ARTIFACT_NAME_RE.test(clean)) {
    throw new Error(`Unsupported filename for the code environment: ${JSON.stringify(name)}`);
  }
  return clean;
}

const MAX_FILE_SIZE = 150 * 1024 * 1024;

/**
 * Read one artifact back out of the sandbox that holds it.
 *
 * Answers the axios-ish shape the download route already pipes — headers plus a
 * readable — because the route's job is to stream bytes and that has not changed.
 *
 * @param {string} fileIdentifier - `"<sandbox id>/<name>"`.
 * @param {ServerRequest} req - The caller, whose IAM bearer authorizes the read.
 * @returns {Promise<{ headers: Record<string,string>, data: import('stream').Readable }>}
 */
async function getCodeOutputDownloadStream(fileIdentifier, req) {
  const [pathPart] = String(fileIdentifier ?? '').split('?');
  const [session_id, ...rest] = pathPart.split('/');
  const name = artifactName(rest.join('/'));
  if (!SANDBOX_ID_RE.test(session_id)) {
    throw new Error(`Invalid code environment session: ${session_id}`);
  }

  const sandbox = await sandboxForRequest(req, session_id);
  if (sandbox.id !== session_id) {
    /* The lease behind this file is gone and a fresh sandbox is empty, so the
     * bytes are genuinely not retrievable here. Saying so beats streaming an
     * empty file that looks like a successful download of nothing. */
    throw new Error(`Code environment session ${session_id} has expired`);
  }
  const buffer = await sandbox.readBuffer(name);
  if (buffer == null) {
    throw new Error(`No such file in session ${session_id}: ${name}`);
  }
  return {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${name.replace(/"/g, '')}"`,
    },
    data: Readable.from(buffer),
  };
}

/**
 * Put a file into the code environment.
 *
 * @param {Object} params
 * @param {ServerRequest} params.req
 * @param {import('stream').Readable} params.stream
 * @param {string} params.filename
 * @param {string} [params.session_id] - Write into this sandbox when it is still
 *   leased; otherwise a fresh one is taken and its id comes back in the identifier.
 * @param {string} [params.entity_id]
 * @returns {Promise<string>} `"<sandbox id>/<name>"`, plus `?entity_id=` when given.
 */
async function uploadCodeEnvFile({ req, stream, filename, session_id, entity_id = '' }) {
  const name = artifactName(filename);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > MAX_FILE_SIZE) {
      throw new Error(`File ${name} exceeds the ${MAX_FILE_SIZE} byte code environment limit`);
    }
    chunks.push(chunk);
  }

  const sandbox = await sandboxForRequest(req, session_id);
  await sandbox.write(name, Buffer.concat(chunks));
  logger.debug('[uploadCodeEnvFile] wrote to sandbox', { sandbox: sandbox.id, name, bytes });

  const fileIdentifier = `${sandbox.id}/${name}`;
  return entity_id.length === 0 ? fileIdentifier : `${fileIdentifier}?entity_id=${entity_id}`;
}

module.exports = { getCodeOutputDownloadStream, uploadCodeEnvFile };
