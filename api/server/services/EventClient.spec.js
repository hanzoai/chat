const { captureServerError, errorTelemetry, resetEventClient } = require('./EventClient');

/** The batch as the door received it. */
function sent() {
  return global.fetch.mock.calls.flatMap(([, init]) => JSON.parse(init.body).batch);
}

describe('EventClient', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    resetEventClient();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    process.env = env;
  });

  describe('without an ingest key', () => {
    it('is a no-op — no client, no request', () => {
      delete process.env.HANZO_INGEST_KEY;
      captureServerError(new Error('boom'));
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('with an ingest key', () => {
    beforeEach(() => {
      process.env.HANZO_INGEST_KEY = 'pk_test';
      delete process.env.HANZO_API_URL;
    });

    it('posts to the ONE front door, defaulting to the one edge', () => {
      captureServerError(new Error('boom'));

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toBe('https://api.hanzo.ai/v1/event');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer pk_test');
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('sends the SAME wire shape the browser sends, differing only in `source`', () => {
      captureServerError(new TypeError('undefined is not a function'), {
        handled: false,
        properties: { path: '/v1/chat/agents' },
      });

      expect(sent()[0]).toMatchObject({
        type: 'error',
        event: 'undefined is not a function',
        product: 'chat',
        library: '@hanzo/event',
        source: 'server',
        error: { type: 'TypeError', message: 'undefined is not a function', handled: false },
        properties: { path: '/v1/chat/agents' },
      });
      expect(sent()[0].messageId).toEqual(expect.any(String));
      expect(sent()[0].timestamp).toEqual(expect.any(String));
    });

    it('honors HANZO_API_URL, trailing slash and all', () => {
      process.env.HANZO_API_URL = 'https://api.hanzo.ai/';
      captureServerError(new Error('boom'));
      expect(global.fetch.mock.calls[0][0]).toBe('https://api.hanzo.ai/v1/event');
    });

    it('never throws, whatever was thrown at it', () => {
      const poisoned = {
        get message() {
          throw new Error('hostile getter');
        },
      };
      expect(() => captureServerError(poisoned)).not.toThrow();
      expect(() => captureServerError(undefined)).not.toThrow();
    });

    it('survives a door that is down', () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      expect(() => captureServerError(new Error('boom'))).not.toThrow();
    });
  });

  describe('errorTelemetry middleware', () => {
    beforeEach(() => {
      process.env.HANZO_INGEST_KEY = 'pk_test';
    });

    it('reports the request context and hands the error straight on', () => {
      const next = jest.fn();
      const err = Object.assign(new Error('nope'), { statusCode: 403 });
      const req = {
        method: 'POST',
        originalUrl: '/v1/chat/agents/chat/Hanzo?token=secret',
        user: { id: 'user_7' },
      };

      errorTelemetry(err, req, {}, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(sent()[0].properties).toEqual({
        method: 'POST',
        // Path only: a query string can carry tokens and PII.
        path: '/v1/chat/agents/chat/Hanzo',
        status: 403,
        userId: 'user_7',
      });
    });

    it('passes the error on even when telemetry is switched off', () => {
      delete process.env.HANZO_INGEST_KEY;
      resetEventClient();
      const next = jest.fn();
      const err = new Error('nope');

      errorTelemetry(err, { method: 'GET', originalUrl: '/v1/chat/health' }, {}, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
