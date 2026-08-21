const axios = require('axios');
const { logger } = require('@hanzochat/data-schemas');
const { resolveTenantBearer, resolveActiveOrg } = require('@hanzochat/api');

/**
 * The ONE RAG client. Every retrieval call chat makes goes through here.
 *
 * RAG is served by the unified Go backend (`hanzoai/ai`, mounted at
 * `api.hanzo.ai/v1`) — the SINGLE canonical RAG surface, whose own source
 * declares it "the consolidated home of the retired standalone chat-rag-api".
 * It runs on OUR stack end to end: our embeddings (`/v1/embeddings`, zen), our
 * vector store and our search index, over content in our S3. Nothing is sent to
 * a third-party embedding provider, and there is no second RAG service.
 *
 * Identity is the caller's own IAM bearer — the same credential the completion,
 * agent and usage paths already forward (`resolveTenantBearer`), with the
 * selected working org as `X-Org-Id`. The backend derives the owner from that
 * verified token (`requireIndexAuth`) and scopes every chunk to it, so a chat
 * user only ever reaches their own org's documents. Chat never mints its own
 * RAG identity and never asserts an owner.
 */

/** The cloud origin, resolved exactly as CloudAgentsClient does — one rule. */
function cloudOrigin() {
  const dedicated = (process.env.HANZO_CLOUD_URL || '').trim();
  if (dedicated) {
    return dedicated.replace(/\/+$/, '');
  }
  const base = (process.env.OPENAI_BASE_URL || '').trim();
  return base ? base.replace(/\/v1\/?$/, '').replace(/\/+$/, '') : '';
}

/** Whether native RAG is reachable — the guard call sites use before retrieving. */
function ragEnabled() {
  return Boolean(cloudOrigin());
}

/**
 * Headers for an on-behalf-of RAG call. Returns null when the request carries no
 * forwardable IAM token — callers MUST treat that as "no RAG", never as a reason
 * to fall back to some other credential (fail-secure: no token, no retrieval).
 */
function authHeaders(req) {
  const bearer = resolveTenantBearer(req);
  if (!bearer) {
    return null;
  }
  const org = resolveActiveOrg(req);
  return {
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
    accept: 'application/json',
    ...(org ? { 'X-Org-Id': org } : {}),
  };
}

/**
 * The backend answers in the standard envelope `{status, msg, data}`. Unwrap it
 * here — once — so callers only ever see the payload, and surface `status:error`
 * as a thrown error rather than a silently empty result.
 */
function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'status' in payload) {
    if (payload.status !== 'ok') {
      throw new Error(payload.msg || 'RAG request failed');
    }
    return payload.data;
  }
  return payload;
}

async function post(req, path, body) {
  const origin = cloudOrigin();
  const headers = authHeaders(req);
  if (!origin || !headers) {
    return null;
  }
  const { data } = await axios.post(`${origin}/v1/ai/rag${path}`, body, { headers });
  return unwrap(data);
}

/**
 * Ingest one file. `content` is the extracted text, or `url` a location the
 * backend can fetch and parse (our S3). Re-embedding the same file_id replaces
 * its chunks, so this is idempotent per file.
 */
async function embed(req, { file_id, filename, content, url, store, tag }) {
  return post(req, '/embed', { file_id, filename, content, url, store, tag });
}

/** Retrieve within one file, or across several when `file_ids` is given. */
async function query(req, { query: q, file_id, file_ids, k, store, mode }) {
  const many = Array.isArray(file_ids) && file_ids.length > 0;
  return post(req, many ? '/query-multiple' : '/query', {
    query: q,
    ...(many ? { file_ids } : { file_id }),
    k,
    store,
    mode,
  });
}

/** Drop a file's chunks. */
async function remove(req, { file_id, file_ids, store }) {
  return post(req, '/delete', { file_id, file_ids, store });
}

/** The stored context for a file (GET — no body). */
async function context(req, { file_id, store }) {
  const origin = cloudOrigin();
  const headers = authHeaders(req);
  if (!origin || !headers) {
    return null;
  }
  const { data } = await axios.get(`${origin}/v1/ai/rag/context`, {
    headers,
    params: { file_id, ...(store ? { store } : {}) },
  });
  return unwrap(data);
}

/** Log once at boot so a misconfigured origin is obvious in the pod logs. */
function logRagTarget() {
  const origin = cloudOrigin();
  if (origin) {
    logger.info(`[RagClient] native RAG via ${origin}/v1/ai/rag/* (own embeddings + vector + search)`);
  } else {
    logger.warn('[RagClient] no cloud origin resolved — file retrieval is disabled');
  }
}

module.exports = {
  cloudOrigin,
  ragEnabled,
  authHeaders,
  embed,
  query,
  remove,
  context,
  logRagTarget,
};
