/**
 * Making a run watchable.
 *
 * Four decisions live in `watch.js` and none of them is visible from outside, so
 * they are asserted here rather than trusted:
 *
 *   (1) The two ids reach the browser BEFORE the command starts. Afterwards is
 *       useless — the whole point is watching work that is still happening.
 *   (2) The delta carries `args: ''`. The client CONCATENATES a delta's args
 *       onto what it already has, so anything else corrupts the command the
 *       model streamed. This is the subtlest thing in the file.
 *   (3) It fails soft, always. Watching is how a run is READ, never how it is
 *       run: a registry that is down must cost the live view and nothing else.
 *   (4) The session is closed with its real verdict, so a fleet row does not sit
 *       at `running` forever.
 */

jest.mock('@hanzochat/data-schemas', () => ({ logger: { debug: jest.fn(), warn: jest.fn() } }));
jest.mock('@hanzochat/agents', () => ({
  StepTypes: { TOOL_CALLS: 'tool_calls' },
  GraphEvents: { ON_RUN_STEP_DELTA: 'on_run_step_delta' },
}));

// `mock`-prefixed, which is the one way jest lets a factory close over a local.
const mockEmitChunk = jest.fn();
const mockSendEvent = jest.fn();
jest.mock('@hanzochat/api', () => ({
  sendEvent: (...a) => mockSendEvent(...a),
  GenerationJobManager: { emitChunk: (...a) => mockEmitChunk(...a) },
}));

const { createWatch } = require('./watch');
const emitChunk = mockEmitChunk;
const sendEvent = mockSendEvent;

const ok = (body) => ({ ok: true, json: async () => body, body: null });
const refused = () => ({ ok: false, json: async () => ({}), body: null });

const deps = { baseUrl: 'https://api.hanzo.ai/v1', token: 'bearer-abc', org: 'acme' };
const toolCall = { id: 'call_1', stepId: 'step_1', name: 'execute_code', args: '{"lang":"py"' };

describe('making a run watchable', () => {
  let fetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn(async () => ok({ id: 'sess_9' }));
    global.fetch = fetchMock;
  });

  it('opens a session on the caller behalf and answers it', async () => {
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    const run = await watch('sbx_1', toolCall, 'print(1)');

    expect(run.session).toBe('sess_9');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.hanzo.ai/v1/agents/sessions');
    expect(init.method).toBe('POST');
    // The caller's own bearer. There is no shared server key on this path.
    expect(init.headers.Authorization).toBe('Bearer bearer-abc');
    expect(init.headers['X-Org-Id']).toBe('acme');
    // `host` is the sandbox, so the fleet views show a code run as a sandbox run.
    expect(JSON.parse(init.body)).toMatchObject({ agent: 'hanzo-chat', status: 'running', host: 'sbx_1' });
  });

  it('tells the browser where to watch, on the step it is already rendering', async () => {
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    await watch('sbx_1', toolCall);

    expect(emitChunk).toHaveBeenCalledTimes(1);
    const [streamId, event] = emitChunk.mock.calls[0];
    expect(streamId).toBe('stream_1');
    expect(event.event).toBe('on_run_step_delta');
    // Addressed at THIS step, or it would attach to the wrong tool call.
    expect(event.data.id).toBe('step_1');
    expect(event.data.delta.run).toEqual({ session: 'sess_9', sandbox: 'sbx_1' });
  });

  it('sends EMPTY args, because the client concatenates them', async () => {
    // A delta's args are appended to what the client already has. Echoing the
    // partial args back would double the command the model streamed.
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    await watch('sbx_1', toolCall);

    const [, event] = emitChunk.mock.calls[0];
    expect(event.data.delta.tool_calls).toEqual([
      { id: 'call_1', name: 'execute_code', args: '' },
    ]);
  });

  it('writes to the response when there is no resumable stream', async () => {
    const res = { write: jest.fn() };
    const watch = createWatch({ res, ...deps });
    await watch('sbx_1', toolCall);

    expect(emitChunk).not.toHaveBeenCalled();
    expect(sendEvent).toHaveBeenCalledWith(res, expect.objectContaining({ event: 'on_run_step_delta' }));
  });

  it('runs unwatched when the registry refuses, and never throws', async () => {
    // The command still has to run. A registry that is down costs the live view
    // and nothing else.
    global.fetch = jest.fn(async () => refused());
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    const run = await watch('sbx_1', toolCall);

    expect(run.session).toBe('');
    expect(emitChunk).not.toHaveBeenCalled();
    await expect(run.done('done')).resolves.toBeUndefined();
  });

  it('runs unwatched when the registry is unreachable', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    await expect(watch('sbx_1', toolCall)).resolves.toMatchObject({ session: '' });
  });

  it('needs a sandbox and a credential, and asks for neither twice', async () => {
    const watch = createWatch({ streamId: 'stream_1', ...deps, token: '' });
    expect((await watch('sbx_1', toolCall)).session).toBe('');
    expect((await createWatch({ streamId: 's', ...deps })('', toolCall)).session).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes the session with the run verdict', async () => {
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    const run = await watch('sbx_1', toolCall);
    fetchMock.mockClear();

    await run.done('error');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.hanzo.ai/v1/agents/sessions/sess_9');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'error' });
  });

  it('says nothing when the tool call names no step', async () => {
    // Without a step there is nothing to address the delta at; opening the
    // session is still worth doing, because the log is what other surfaces read.
    const watch = createWatch({ streamId: 'stream_1', ...deps });
    const run = await watch('sbx_1', { id: 'call_1' });

    expect(run.session).toBe('sess_9');
    expect(emitChunk).not.toHaveBeenCalled();
  });
});
