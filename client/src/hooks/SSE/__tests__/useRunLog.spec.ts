import { frame, read } from '../useRunLog';

/**
 * What the live feed is allowed to say.
 *
 * Two decisions in `useRunLog` are load-bearing and invisible from the outside,
 * so they are asserted here rather than trusted:
 *
 *   (1) A frame is routed by its `event:` name, not guessed from its payload.
 *   (2) A payload carrying a `type` belongs to another producer — one whose
 *       events the reader has already rendered — and showing it here would print
 *       the same conversation twice. That filter is one `if`, which is exactly
 *       the kind that gets "simplified" away.
 */

const wire = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const said = (payload: unknown) => wire('event', { event: { sessionId: 's1', payload } });

describe('read', () => {
  it('takes streamed output as a line with no phase', () => {
    expect(read({ message: 'npm install\n' })).toEqual({ step: '', message: 'npm install\n' });
  });

  it('keeps the phase a lifecycle payload names', () => {
    expect(read({ step: 'exit', message: 'exit 1' })).toEqual({ step: 'exit', message: 'exit 1' });
  });

  it('IGNORES another producer’s events', () => {
    // These are already on screen, rendered from the run's own stream. If this
    // ever starts returning a line, every build prints twice.
    expect(read({ type: 'text', text: 'hello' })).toBeNull();
    expect(read({ type: 'tool_call', id: 't1', name: 'run_command' })).toBeNull();
    expect(read({ type: 'tool_result', id: 't1', result: 'Exit code 0' })).toBeNull();
  });

  it('answers nothing for an empty or unreadable payload', () => {
    expect(read({})).toBeNull();
    expect(read(null)).toBeNull();
    expect(read('not an object')).toBeNull();
  });
});

describe('frame', () => {
  it('reads a narration frame', () => {
    expect(frame(said({ message: 'compiling' }).trimEnd())).toEqual({
      step: '',
      message: 'compiling',
    });
  });

  it('ignores a heartbeat', () => {
    // An SSE comment carries no `data:` line at all.
    expect(frame(': ping')).toBeNull();
  });

  it('ignores a session frame', () => {
    expect(frame(wire('session', { session: { id: 's1' } }).trimEnd())).toBeNull();
  });

  it('survives a malformed frame', () => {
    expect(frame('event: event\ndata: {not json')).toBeNull();
  });
});

describe('splitting', () => {
  it('delivers a frame that arrived in two chunks', () => {
    // A stream is bytes, not messages: a burst of build output arrives in
    // pieces, and a reader that assumed one chunk was one frame would drop the
    // tail of every long line. This is the split the hook's buffer performs.
    const whole = said({ message: 'linked 402 packages' });
    const at = whole.indexOf('message');
    const chunks = [whole.slice(0, at), whole.slice(at)];

    let buffer = '';
    const lines: ReturnType<typeof frame>[] = [];
    for (const chunk of chunks) {
      buffer += chunk;
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const f of frames) {
        const line = frame(f);
        if (line) {
          lines.push(line);
        }
      }
    }

    expect(lines).toEqual([{ step: '', message: 'linked 402 packages' }]);
  });
});
