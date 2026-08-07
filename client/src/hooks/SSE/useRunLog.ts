import { useEffect, useState } from 'react';
import { apiBaseUrl } from '@hanzochat/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';

/**
 * Watching a command while it runs.
 *
 * A tool that leases a sandbox and runs something in it is silent for the whole
 * command: the output is IN the sandbox, and the call does not return until the
 * program is over. Cloud appends that output to a session log as it is produced
 * and serves the log live, so this is the browser's way to read a build working
 * rather than a blank pause with a verdict at the end.
 *
 * `fetch` + a reader, not `EventSource`: the feed is authenticated with the
 * caller's own bearer and EventSource cannot set a header. Same idiom as
 * `useAnswer`.
 */

/** One thing a run said. */
export interface Line {
  /**
   * The phase this names, when it names one: `leased`, `clone`, the tool's own
   * name, `exit`, `ended`. Empty for streamed output, which is most of the
   * volume and belongs to whatever phase is running.
   */
  step: string;
  message: string;
}

/**
 * The narration, or nothing.
 *
 * Two producers write to one log and they do not speak the same payload. The
 * sandbox writes `{step, message}` — the vocabulary the log is defined in.
 * Another producer publishes its own already-rendered events there, and those
 * are tagged with a `type`; a reader that showed them too would print the same
 * conversation twice. `type` is a fact about the payload rather than a flag
 * anyone must remember to set, which is what makes it a safe discriminator.
 */
export function read(payload: unknown): Line | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const p = payload as { type?: unknown; step?: unknown; message?: unknown };
  if (typeof p.type === 'string') {
    return null;
  }
  const message = typeof p.message === 'string' ? p.message : '';
  const step = typeof p.step === 'string' ? p.step : '';
  if (!message && !step) {
    return null;
  }
  return { step, message };
}

/**
 * One SSE frame.
 *
 * `event:` names which shape the `data:` carries, so it is read rather than
 * guessed. A heartbeat is an SSE comment with no `data:` line and falls out.
 */
export function frame(text: string): Line | null {
  let kind = '';
  let data = '';
  for (const raw of text.split('\n')) {
    if (raw.startsWith('event:')) {
      kind = raw.slice(6).trim();
    } else if (raw.startsWith('data:')) {
      data += raw.slice(5).trim();
    }
  }
  if (kind !== 'event' || !data) {
    return null;
  }
  try {
    const parsed = JSON.parse(data) as { event?: { payload?: unknown } };
    return read(parsed.event?.payload);
  } catch {
    return null; // A malformed frame is skipped; the feed stays open.
  }
}

/** How many lines to keep. A build prints thousands; a reader reads the end. */
const LIMIT = 500;

/**
 * Tail one run's log while `session` is set and `live`.
 *
 * Returns what the run has said so far. It stops when the caller says the work
 * is over, and on unmount — a feed left open outlives the command it was
 * watching.
 */
export default function useRunLog(session?: string, live = true): Line[] {
  const { token } = useAuthContext();
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!session || !live) {
      return;
    }
    const gone = new AbortController();

    void (async () => {
      let res: Response;
      try {
        res = await fetch(
          `${apiBaseUrl()}/v1/chat/runs/stream?root=${encodeURIComponent(session)}`,
          {
            headers: {
              Accept: 'text/event-stream',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: gone.signal,
          },
        );
      } catch {
        return; // Watching is how a run is read, never how it is run.
      }
      if (!res.ok || !res.body) {
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch {
          return; // Torn or aborted; the command is unaffected.
        }
        if (chunk.done) {
          return;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        // A stream is bytes, not messages: a burst of build output arrives in
        // pieces, so the trailing partial frame is kept for the next read.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        const said = frames.map(frame).filter((l): l is Line => l !== null);
        if (said.length) {
          setLines((prev) => [...prev, ...said].slice(-LIMIT));
        }
      }
    })();

    return () => gone.abort();
  }, [session, live, token]);

  return lines;
}
