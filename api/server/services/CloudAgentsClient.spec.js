jest.mock('@librechat/data-schemas', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  CloudAgentsClient,
  getCloudAgentsClient,
  _resetCloudAgentsClient,
  AGENT_NAME_RE,
  MAX_INPUT,
  MAX_RESPONSE,
} = require('./CloudAgentsClient');

/**
 * Build a fetch mock that captures the last request and returns a canned response.
 */
function mockFetch({ ok = true, status = 200, body = {} } = {}) {
  const calls = [];
  const fn = jest.fn(async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok,
      status,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  });
  fn.calls = calls;
  return fn;
}

describe('CloudAgentsClient', () => {
  const BEARER = 'header.payload.sig';

  afterEach(() => {
    _resetCloudAgentsClient();
    delete global.fetch;
  });

  describe('name validation (traversal / SSRF guard)', () => {
    const bad = ['', '.', '..', '../etc', 'a/b', 'name with space', 'a'.repeat(65), '-lead'];
    const good = ['researcher', 'a', 'A.b_c-1', '0abc'];

    it('rejects malformed names before any network call', async () => {
      const fetch = mockFetch();
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      for (const name of bad) {
        await expect(client.get(BEARER, name)).rejects.toMatchObject({ status: 400 });
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it('accepts valid handles matching cloud grammar', () => {
      for (const name of good) {
        expect(AGENT_NAME_RE.test(name)).toBe(true);
        expect(CloudAgentsClient.requireValidName(name)).toBe(name);
      }
    });
  });

  describe('bearer forwarding + tenant model', () => {
    it('forwards the user bearer and sends no org header when no active org is selected', async () => {
      const fetch = mockFetch({ body: { agents: [] } });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await client.list(BEARER);

      const { url, opts } = fetch.calls[0];
      expect(url).toBe('https://api.hanzo.ai/v1/agents');
      expect(opts.headers.Authorization).toBe(`Bearer ${BEARER}`);
      // No selection ⇒ no hint; cloud pins the tenant from the credential's home org.
      expect(opts.headers['X-Org-Id']).toBeUndefined();
      expect(opts.headers['X-Hanzo-Org']).toBeUndefined();
    });

    it('forwards X-Org-Id when the member has selected an active org', async () => {
      const fetch = mockFetch({ body: { agents: [] } });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      // list / get / run each thread the selected org through as `X-Org-Id`; the
      // gateway validates it against the bearer's membership (HIP-0026).
      await client.list(BEARER, 'acme');
      await client.get(BEARER, 'researcher', 'acme');
      await client.run(BEARER, 'researcher', 'hi', 'acme');

      for (const { opts } of fetch.calls) {
        expect(opts.headers.Authorization).toBe(`Bearer ${BEARER}`);
        expect(opts.headers['X-Org-Id']).toBe('acme');
      }
      expect(fetch.calls).toHaveLength(3);
    });

    it('fails secure (401) with no fallback credential when bearer is missing', async () => {
      const fetch = mockFetch();
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await expect(client.list('')).rejects.toMatchObject({ status: 401 });
      await expect(client.run('', 'researcher', 'x')).rejects.toMatchObject({ status: 401 });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('posts {input} to the run endpoint and returns the RunResult', async () => {
      const fetch = mockFetch({ body: { id: 'run_1', status: 'ok', output: 'hi' } });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai/' });
      const run = await client.run(BEARER, 'researcher', 'summarize');

      const { url, opts } = fetch.calls[0];
      expect(url).toBe('https://api.hanzo.ai/v1/agents/researcher/run');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ input: 'summarize' });
      expect(run).toEqual({ id: 'run_1', status: 'ok', output: 'hi' });
    });

    it('rejects oversized input locally (before the network)', async () => {
      const fetch = mockFetch();
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      const big = 'x'.repeat(128 * 1024 + 1);
      await expect(client.run(BEARER, 'researcher', big)).rejects.toMatchObject({ status: 400 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('surfaces an upstream failure body (cloud 502 error run) with its status', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 502,
        body: { id: 'run_2', status: 'error', error: 'model down' },
      });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await expect(client.run(BEARER, 'researcher', 'x')).rejects.toMatchObject({
        status: 502,
        body: { status: 'error', error: 'model down' },
      });
    });
  });

  describe('input byte cap', () => {
    it('rejects on UTF-8 BYTE length, not UTF-16 units (multibyte bypass)', async () => {
      const fetch = mockFetch();
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      // Half MAX_INPUT in .length, but 3 bytes/char in UTF-8 => 1.5x MAX_INPUT bytes.
      const multibyte = '你'.repeat(MAX_INPUT / 2);
      expect(multibyte.length).toBeLessThan(MAX_INPUT); // would pass a naive .length check
      expect(Buffer.byteLength(multibyte, 'utf8')).toBeGreaterThan(MAX_INPUT);
      await expect(client.run(BEARER, 'researcher', multibyte)).rejects.toMatchObject({
        status: 400,
      });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('response size cap (availability)', () => {
    it('rejects a declared-oversize body up front via Content-Length (502)', async () => {
      global.fetch = jest.fn(
        async () =>
          new Response('ok', {
            status: 200,
            headers: { 'content-length': String(MAX_RESPONSE + 1) },
          }),
      );
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await expect(client.list(BEARER)).rejects.toMatchObject({ status: 502 });
    });

    it('aborts a chunked stream once it exceeds the cap (502)', async () => {
      const oversize = new Uint8Array(MAX_RESPONSE + 16);
      global.fetch = jest.fn(async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(oversize);
            controller.close();
          },
        });
        return new Response(stream, { status: 200 }); // chunked: no content-length
      });
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await expect(client.list(BEARER)).rejects.toMatchObject({ status: 502 });
    });

    it('reads a normal small streamed body', async () => {
      global.fetch = jest.fn(
        async () => new Response(JSON.stringify({ agents: [] }), { status: 200 }),
      );
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      await expect(client.list(BEARER)).resolves.toEqual({ agents: [] });
    });
  });

  describe('concurrency cap (load shedding)', () => {
    it('sheds load with 503 once the in-flight ceiling is reached, before any fetch', async () => {
      const fetch = mockFetch({ body: { agents: [] } });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai', maxConcurrent: 2 });
      client._inFlight = 2; // simulate the ceiling being saturated
      await expect(client.list(BEARER)).rejects.toMatchObject({ status: 503 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('decrements in-flight after a call completes (no leak)', async () => {
      const fetch = mockFetch({ body: { agents: [] } });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai', maxConcurrent: 1 });
      await client.list(BEARER);
      expect(client._inFlight).toBe(0);
      await client.list(BEARER); // ceiling of 1 is reusable across sequential calls
      expect(client._inFlight).toBe(0);
    });
  });

  describe('endpoint normalization', () => {
    it('strips trailing slashes from the base URL', async () => {
      const fetch = mockFetch({ body: {} });
      global.fetch = fetch;
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai///' });
      await client.list(BEARER);
      expect(fetch.calls[0].url).toBe('https://api.hanzo.ai/v1/agents');
    });
  });

  describe('run timeout (headroom for long completions)', () => {
    it('defaults to 180s so a long run is not aborted mid-flight (the 30s -> 502 bug)', () => {
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai' });
      expect(client.timeout).toBe(180000);
    });

    it('honors an explicit constructor timeout', () => {
      const client = new CloudAgentsClient({ endpoint: 'https://api.hanzo.ai', timeout: 5000 });
      expect(client.timeout).toBe(5000);
    });

    it('is overridable via CLOUD_AGENT_TIMEOUT (mirrors CLOUD_AGENT_MAX_CONCURRENT)', () => {
      const saved = process.env.CLOUD_AGENT_TIMEOUT;
      process.env.CLOUD_AGENT_TIMEOUT = '90000';
      // DEFAULT_TIMEOUT is read at module load, so re-require in isolation.
      jest.resetModules();
      const { CloudAgentsClient: Fresh } = require('./CloudAgentsClient');
      try {
        expect(new Fresh({ endpoint: 'https://api.hanzo.ai' }).timeout).toBe(90000);
      } finally {
        if (saved === undefined) {
          delete process.env.CLOUD_AGENT_TIMEOUT;
        } else {
          process.env.CLOUD_AGENT_TIMEOUT = saved;
        }
        jest.resetModules();
      }
    });
  });

  describe('getCloudAgentsClient (env wiring)', () => {
    const saved = {};
    beforeEach(() => {
      saved.HANZO_CLOUD_URL = process.env.HANZO_CLOUD_URL;
      saved.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
      delete process.env.HANZO_CLOUD_URL;
      delete process.env.OPENAI_BASE_URL;
      _resetCloudAgentsClient();
    });
    afterEach(() => {
      process.env.HANZO_CLOUD_URL = saved.HANZO_CLOUD_URL;
      process.env.OPENAI_BASE_URL = saved.OPENAI_BASE_URL;
      if (saved.HANZO_CLOUD_URL === undefined) {
        delete process.env.HANZO_CLOUD_URL;
      }
      if (saved.OPENAI_BASE_URL === undefined) {
        delete process.env.OPENAI_BASE_URL;
      }
      _resetCloudAgentsClient();
    });

    it('returns null when unconfigured', () => {
      expect(getCloudAgentsClient()).toBeNull();
    });

    it('prefers HANZO_CLOUD_URL', () => {
      process.env.HANZO_CLOUD_URL = 'https://cloud.example';
      expect(getCloudAgentsClient().endpoint).toBe('https://cloud.example');
    });

    it('derives the host from OPENAI_BASE_URL by stripping /v1', () => {
      process.env.OPENAI_BASE_URL = 'https://api.hanzo.ai/v1';
      expect(getCloudAgentsClient().endpoint).toBe('https://api.hanzo.ai');
    });
  });
});
