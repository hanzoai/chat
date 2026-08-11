import { wrapHanzoGatewayFetch } from './hanzoGatewayFetch';

/** Build a minimal Response-like stub the wrapper can clone()/json()/read headers on. */
const makeResponse = (
  body: string,
  { contentType = 'application/json', status = 200 }: { contentType?: string; status?: number } = {},
): Response =>
  new Response(body, {
    status,
    headers: contentType ? { 'content-type': contentType } : {},
  });

/** Build a text/event-stream Response whose body emits `chunks` in order. */
const makeStream = (chunks: string[]): Response => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
};

describe('wrapHanzoGatewayFetch', () => {
  it('rewrites the gateway 200 error envelope into a 402 carrying the actionable msg', async () => {
    const envelope = JSON.stringify({
      status: 'error',
      msg: 'model "zen5-mini" is a premium model requiring a paid balance. Add funds at https://hanzo.ai/billing',
      data: null,
    });
    const wrapped = wrapHanzoGatewayFetch(async () => makeResponse(envelope));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(402);
    const parsed = (await res.json()) as { error?: { message?: string; code?: string } };
    expect(parsed.error?.message).toContain('premium model requiring a paid balance');
    expect(parsed.error?.code).toBe('insufficient_quota');
  });

  it('also catches the envelope when the gateway labels it text/plain', async () => {
    const wrapped = wrapHanzoGatewayFetch(async () =>
      makeResponse(JSON.stringify({ status: 'error', msg: 'nope' }), { contentType: 'text/plain' }),
    );
    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(402);
  });

  it('passes a successful completion through untouched (choices present)', async () => {
    const body = JSON.stringify({
      id: 'chatcmpl-1',
      choices: [{ index: 0, message: { role: 'assistant', content: 'hi there' } }],
    });
    const wrapped = wrapHanzoGatewayFetch(async () => makeResponse(body));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(200);
    const parsed = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    expect(parsed.choices[0].message.content).toBe('hi there');
  });

  it('forwards a successful SSE stream byte-for-byte (choices present)', async () => {
    const sse =
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n' +
      'data: {"choices":[{"delta":{"reasoning":"thinking"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"hi there"}}]}\n\n' +
      'data: [DONE]\n\n';
    // split mid-event to exercise the cross-chunk buffer
    const wrapped = wrapHanzoGatewayFetch(async () => makeStream([sse.slice(0, 40), sse.slice(40)]));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(await res.text()).toBe(sse);
  });

  it('surfaces a MID-STREAM error envelope as a standard error event, keeping prior events', async () => {
    // The gateway commits to text/event-stream, streams a reasoning model's
    // thinking, THEN an upstream route drops and it emits {status:"error"}.
    const sse =
      'data: {"choices":[{"delta":{"reasoning":"weighing options"}}]}\n\n' +
      'data: {"status":"error","msg":"upstream route closed"}\n\n';
    const wrapped = wrapHanzoGatewayFetch(async () => makeStream([sse]));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    const text = await res.text();
    // the reasoning that already streamed is preserved
    expect(text).toContain('"reasoning":"weighing options"');
    // the crash-shaped envelope is gone, replaced by an OpenAI error event
    expect(text).not.toContain('"status":"error"');
    expect(text).toContain('"error":{"message":"upstream route closed"');
    expect(text).toContain('"code":"insufficient_quota"');
  });

  it('surfaces an error envelope split across chunk boundaries', async () => {
    const evt = 'data: {"status":"error","msg":"insufficient credits"}\n\n';
    const wrapped = wrapHanzoGatewayFetch(async () => makeStream([evt.slice(0, 20), evt.slice(20)]));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    const text = await res.text();
    expect(text).toContain('"error":{"message":"insufficient credits"');
    expect(text).not.toContain('"status":"error"');
  });

  it('surfaces a trailing error envelope that has no final blank line', async () => {
    const wrapped = wrapHanzoGatewayFetch(async () =>
      makeStream(['data: {"status":"error","msg":"dead key"}']),
    );

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(await res.text()).toContain('"error":{"message":"dead key"');
  });

  it('leaves a standard OpenAI SSE error event untouched (the SDK already handles it)', async () => {
    const sse = 'data: {"error":{"message":"rate limited","type":"rate_limit"}}\n\n';
    const wrapped = wrapHanzoGatewayFetch(async () => makeStream([sse]));

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(await res.text()).toBe(sse);
  });

  it('passes non-JSON bodies through without throwing', async () => {
    const wrapped = wrapHanzoGatewayFetch(async () =>
      makeResponse('not json at all', { contentType: 'text/plain' }),
    );
    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('not json at all');
  });

  it('falls back to the global fetch when no base fetch is provided', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(makeResponse(JSON.stringify({ choices: [] })));
    try {
      const wrapped = wrapHanzoGatewayFetch();
      const res = await wrapped('https://api.hanzo.ai/v1/models');
      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(200);
    } finally {
      spy.mockRestore();
    }
  });

  it('is idempotent under double-wrapping (title path re-wraps the agent-run fetch)', async () => {
    // #titleConvo re-applies the wrapper on top of the fetch initializeCustom
    // already wrapped for agent runs. The second pass must not corrupt the result:
    // it sees the inner pass's 402 `{error:{...}}` (no top-level `status:"error"`),
    // so it passes through unchanged.
    const envelope = JSON.stringify({ status: 'error', msg: 'invalid API key', data: null });
    const doubleWrapped = wrapHanzoGatewayFetch(
      wrapHanzoGatewayFetch(async () => makeResponse(envelope)),
    );
    const res = await doubleWrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res.status).toBe(402);
    const parsed = (await res.json()) as { error?: { message?: string; code?: string } };
    expect(parsed.error?.message).toContain('invalid API key');
    expect(parsed.error?.code).toBe('insufficient_quota');
  });
});
