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

  it('never touches a live SSE stream (text/event-stream)', async () => {
    const sse = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n';
    const passthrough = makeResponse(sse, { contentType: 'text/event-stream' });
    const cloneSpy = jest.spyOn(passthrough, 'clone');
    const wrapped = wrapHanzoGatewayFetch(async () => passthrough);

    const res = await wrapped('https://api.hanzo.ai/v1/chat/completions');
    expect(res).toBe(passthrough);
    expect(cloneSpy).not.toHaveBeenCalled();
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
});
