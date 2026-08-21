const axios = require('axios');

jest.mock('axios');
jest.mock('@hanzochat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@hanzochat/api', () => ({
  resolveTenantBearer: jest.fn(),
  resolveActiveOrg: jest.fn(),
}));

const { resolveTenantBearer, resolveActiveOrg } = require('@hanzochat/api');
const rag = require('./RagClient');

/**
 * RAG is one surface on our own stack, reached with the caller's own IAM bearer.
 * These lock in the two things that make that true: the URL is always the unified
 * backend's /v1/ai/rag/*, and identity is always the forwarded IAM token — never a
 * chat-minted credential, and never a call at all when there is no token.
 */
describe('RagClient — the one RAG surface', () => {
  const req = { headers: { cookie: '' }, user: { id: 'u1', organization: 'acme' } };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HANZO_CLOUD_URL = 'https://api.hanzo.ai';
    resolveTenantBearer.mockReturnValue('iam-token');
    resolveActiveOrg.mockReturnValue(null);
    axios.post.mockResolvedValue({ data: { ok: true } });
    axios.get.mockResolvedValue({ data: { ok: true } });
  });

  it('embeds against the unified backend with the IAM bearer', async () => {
    await rag.embed(req, { file_id: 'f1', filename: 'a.pdf', content: 'hello' });

    const [url, body, cfg] = axios.post.mock.calls[0];
    expect(url).toBe('https://api.hanzo.ai/v1/ai/rag/embed');
    expect(body).toMatchObject({ file_id: 'f1', filename: 'a.pdf', content: 'hello' });
    expect(cfg.headers.Authorization).toBe('Bearer iam-token');
  });

  it('forwards the selected working org so the backend scopes to it', async () => {
    resolveActiveOrg.mockReturnValue('globex');
    await rag.query(req, { query: 'q', file_id: 'f1' });
    expect(axios.post.mock.calls[0][2].headers['X-Org-Id']).toBe('globex');
  });

  it('routes multi-file retrieval to query-multiple', async () => {
    await rag.query(req, { query: 'q', file_ids: ['a', 'b'] });
    expect(axios.post.mock.calls[0][0]).toBe('https://api.hanzo.ai/v1/ai/rag/query-multiple');
    expect(axios.post.mock.calls[0][1].file_ids).toEqual(['a', 'b']);
  });

  it('deletes and reads context on the same surface', async () => {
    await rag.remove(req, { file_id: 'f1' });
    expect(axios.post.mock.calls[0][0]).toBe('https://api.hanzo.ai/v1/ai/rag/delete');

    await rag.context(req, { file_id: 'f1' });
    expect(axios.get.mock.calls[0][0]).toBe('https://api.hanzo.ai/v1/ai/rag/context');
  });

  it('makes NO call when the request carries no IAM token — fail-secure', async () => {
    resolveTenantBearer.mockReturnValue(null);
    expect(await rag.embed(req, { file_id: 'f1', content: 'x' })).toBeNull();
    expect(await rag.query(req, { query: 'q', file_id: 'f1' })).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('derives the origin from OPENAI_BASE_URL when no dedicated var is set', () => {
    delete process.env.HANZO_CLOUD_URL;
    process.env.OPENAI_BASE_URL = 'https://api.hanzo.ai/v1';
    expect(rag.cloudOrigin()).toBe('https://api.hanzo.ai');
    expect(rag.ragEnabled()).toBe(true);
  });

  it('is disabled — not fatal — when no origin resolves', () => {
    delete process.env.HANZO_CLOUD_URL;
    delete process.env.OPENAI_BASE_URL;
    expect(rag.ragEnabled()).toBe(false);
  });
});
