import axios from 'axios';
import { sendRewardSignal } from './rewardSignal';

/**
 * `import.meta.env.VITE_*` is rewritten to `process.env.VITE_*` by
 * `babel-plugin-transform-vite-meta-env` (runtime read), so tests toggle env via `process.env`.
 */
describe('sendRewardSignal', () => {
  const BASE = 'https://api.hanzo.ai';
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(() => Promise.resolve({ ok: true } as Response));
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.VITE_HANZO_API_URL = BASE;
    delete process.env.VITE_HANZO_FEEDBACK;
    delete axios.defaults.headers.common['Authorization'];
  });

  afterEach(() => {
    delete process.env.VITE_HANZO_API_URL;
    delete process.env.VITE_HANZO_FEEDBACK;
    delete axios.defaults.headers.common['Authorization'];
  });

  const initOf = (call = 0) => fetchMock.mock.calls[call][1] as RequestInit;
  const urlOf = (call = 0) => fetchMock.mock.calls[call][0] as string;
  const bodyOf = (call = 0) => JSON.parse(initOf(call).body as string);

  it('POSTs to {base}/v1/ai/feedback with exactly {request_id, signal} for "up"', () => {
    sendRewardSignal('chatcmpl-up', 'up');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf()).toBe('https://api.hanzo.ai/v1/ai/feedback');
    const init = initOf();
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.keepalive).toBe(true);
    expect(bodyOf()).toEqual({ request_id: 'chatcmpl-up', signal: 'up' });
  });

  it('serializes each signal string exactly and never adds extra fields', () => {
    const signals = ['up', 'down', 'regenerate', 'switch', 'abandon', 'accept', 'revert'] as const;
    signals.forEach((signal, i) => sendRewardSignal(`id-${signal}-${i}`, signal));
    expect(fetchMock).toHaveBeenCalledTimes(signals.length);
    signals.forEach((signal, i) => {
      expect(bodyOf(i)).toEqual({ request_id: `id-${signal}-${i}`, signal });
      expect(bodyOf(i)).not.toHaveProperty('rating');
    });
  });

  it('includes rating ONLY when signal is "rating"', () => {
    sendRewardSignal('rate-1', 'rating', 3);
    expect(bodyOf()).toEqual({ request_id: 'rate-1', signal: 'rating', rating: 3 });
    expect(Object.keys(bodyOf()).sort()).toEqual(['rating', 'request_id', 'signal']);
  });

  it('omits rating for non-rating signals even when a rating arg is passed', () => {
    sendRewardSignal('up-with-rating', 'up', 2);
    expect(bodyOf()).toEqual({ request_id: 'up-with-rating', signal: 'up' });
    expect(bodyOf()).not.toHaveProperty('rating');
  });

  it('makes NO network call when requestId is missing', () => {
    sendRewardSignal(undefined, 'up');
    sendRewardSignal(null, 'down');
    sendRewardSignal('', 'regenerate');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes NO network call when the base URL is unset', () => {
    delete process.env.VITE_HANZO_API_URL;
    sendRewardSignal('no-base', 'up');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes NO network call when opted out via VITE_HANZO_FEEDBACK (0/false/off)', () => {
    ['0', 'false', 'off'].forEach((val) => {
      process.env.VITE_HANZO_FEEDBACK = val;
      sendRewardSignal(`opt-${val}`, 'up');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mirrors the Authorization bearer from axios defaults; always sends JSON content-type', () => {
    axios.defaults.headers.common['Authorization'] = 'Bearer end-user-token';
    sendRewardSignal('auth-1', 'up');
    const headers = initOf().headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer end-user-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends no Authorization header when no bearer is set', () => {
    sendRewardSignal('auth-2', 'up');
    const headers = initOf().headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('strips a trailing slash from the base URL', () => {
    process.env.VITE_HANZO_API_URL = 'https://api.hanzo.ai/';
    sendRewardSignal('slash-1', 'up');
    expect(urlOf()).toBe('https://api.hanzo.ai/v1/ai/feedback');
  });

  it('dedupes the same signal for the same request id', () => {
    sendRewardSignal('dupe-1', 'up');
    sendRewardSignal('dupe-1', 'up');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT dedupe different ratings for the same request id', () => {
    sendRewardSignal('rate-multi', 'rating', 1);
    sendRewardSignal('rate-multi', 'rating', 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never throws and swallows a rejected fetch (fire-and-forget)', () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    expect(() => sendRewardSignal('reject-1', 'up')).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
