import { logger } from '@hanzochat/data-schemas';

/** The fetch signature Chat threads through the OpenAI client configuration. */
export type GatewayFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/** Shape of the Hanzo Cloud gateway's error envelope (streamed or not). */
interface HanzoErrorEnvelope {
  status?: string;
  msg?: string;
  code?: string;
  type?: string;
  error?: { message?: string } | string;
  choices?: unknown;
}

const FALLBACK_MESSAGE = 'Hanzo Cloud rejected the model request.';

/**
 * A stream that fails AFTER it began is transient, not a paywall: the balance
 * was cleared before the first token. So a surfaced stream error defaults to a
 * retryable code the client renders as "send it again", never the add-credit
 * paywall — unless the gateway itself named a code (e.g. it really did run the
 * balance to zero mid-run), which is preserved.
 */
const STREAM_DEFAULT_CODE = 'upstream_error';

/** The gateway's error and its code, IF a JSON payload IS one: `status:"error"`
 * with no `choices`. Returns null for anything else — a normal chunk (has
 * `choices`), a `[DONE]`, or a body that is not the envelope.
 *
 * A successful OpenAI chunk always carries `choices`, so it can never match;
 * that is what makes rewriting the matched payload safe for a live stream. */
function readErrorEnvelope(payload: string): { message: string; code?: string } | null {
  let json: HanzoErrorEnvelope;
  try {
    json = JSON.parse(payload) as HanzoErrorEnvelope;
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || json.choices != null || json.status !== 'error') {
    return null;
  }
  const code =
    (typeof json.code === 'string' && json.code) ||
    (typeof json.type === 'string' && json.type) ||
    undefined;
  if (typeof json.msg === 'string' && json.msg.trim()) {
    return { message: json.msg.trim(), code };
  }
  if (typeof json.error === 'string' && json.error.trim()) {
    return { message: json.error.trim(), code };
  }
  if (json.error && typeof json.error === 'object' && typeof json.error.message === 'string') {
    return { message: json.error.message.trim() || FALLBACK_MESSAGE, code };
  }
  return { message: FALLBACK_MESSAGE, code };
}

/** The error an SSE event carries IF one of its `data:` lines is the envelope. */
function eventError(rawEvent: string): { message: string; code?: string } | null {
  for (const line of rawEvent.split(/\r?\n/)) {
    if (!line.startsWith('data:')) {
      continue;
    }
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') {
      continue;
    }
    const found = readErrorEnvelope(payload);
    if (found != null) {
      return found;
    }
  }
  return null;
}

/** The OpenAI-standard error event the client SDK surfaces as a clean throw. */
const encodeErrorEvent = (message: string, code: string): Uint8Array =>
  new TextEncoder().encode(`data: ${JSON.stringify({ error: { message, type: code, code } })}\n\n`);

/** End index (exclusive) of the first complete SSE event in `s`, or -1. */
function boundary(s: string): number {
  const lf = s.indexOf('\n\n');
  const crlf = s.indexOf('\r\n\r\n');
  if (lf < 0 && crlf < 0) {
    return -1;
  }
  if (crlf < 0 || (lf >= 0 && lf < crlf)) {
    return lf + 2;
  }
  return crlf + 4;
}

/**
 * Pass an SSE stream through event-by-event, forwarding every event's original
 * bytes UNTOUCHED, and rewriting only an event that IS the gateway's error
 * envelope into an OpenAI-standard error event — then ending the stream.
 *
 * The gateway commits to `text/event-stream` before it knows a request will
 * fail (e.g. an upstream route drops after a reasoning model has streamed its
 * thinking), so a real failure can arrive mid-stream as
 * `data: {"status":"error","msg":"..."}` — a payload with no `choices`. The
 * OpenAI client parses that as a chunk and crashes on `undefined.role`, so the
 * reply that had been streaming vanishes into the opaque "Something went wrong".
 * Surfacing it as a standard error event makes the client raise the gateway's
 * message under a retryable code. A successful stream never carries that shape,
 * so its bytes are forwarded verbatim.
 */
function surfaceStreamErrors(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const surface = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    found: { message: string; code?: string },
  ) => {
    const code = found.code ?? STREAM_DEFAULT_CODE;
    logger.warn('[hanzoGatewayFetch] surfacing gateway error from an SSE stream', {
      message: found.message,
      code,
    });
    controller.enqueue(encodeErrorEvent(found.message, code));
    controller.close();
    void reader.cancel();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer) {
            const found = eventError(buffer);
            if (found != null) {
              surface(controller, found);
              return;
            }
            controller.enqueue(encoder.encode(buffer));
          }
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        for (let end = boundary(buffer); end >= 0; end = boundary(buffer)) {
          const rawEvent = buffer.slice(0, end);
          buffer = buffer.slice(end);
          const found = eventError(rawEvent);
          if (found != null) {
            surface(controller, found);
            return;
          }
          controller.enqueue(encoder.encode(rawEvent));
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}

/**
 * Wrap an OpenAI-client `fetch` so the Hanzo Cloud gateway's error envelope
 * becomes a real, surfaced error instead of an opaque crash — whether it arrives
 * as a plain body or inside a `text/event-stream`.
 *
 * The gateway (api.hanzo.ai) answers some failures — most importantly a request
 * for a premium model when the caller's balance is only the $5 starter credit —
 * with an error envelope `{ "status": "error", "msg": "..." }` that has no
 * `choices`. The OpenAI client treats it as success and parses the body to
 * `undefined`; the agent run then throws the opaque
 * `Cannot read properties of undefined (reading 'role')`, so NO assistant reply
 * renders and the user never learns why (and the title call dies the same way on
 * `reading 'message'`).
 *
 * A non-streaming envelope is rewritten into a conventional 402 carrying the
 * gateway's own `msg` — a paywall, the dominant cause of an upfront rejection. A
 * streaming envelope — which the gateway can emit AFTER committing to
 * `text/event-stream`, e.g. a mid-stream upstream failure once a reasoning model
 * has begun — is rewritten by `surfaceStreamErrors` under a retryable code,
 * forwarding every successful event untouched. Either way the client raises a
 * clean error with the actionable message. The request headers/body are never
 * inspected — per-user `hk-` billing is unaffected.
 */
export function wrapHanzoGatewayFetch(baseFetch?: GatewayFetch): GatewayFetch {
  const inner: GatewayFetch = baseFetch ?? ((input, init) => fetch(input, init));
  return async (input, init) => {
    const response = await inner(input, init);

    /** SSE streams pass through the event-aware guard, never a body buffer. */
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      if (!response.body) {
        return response;
      }
      return new Response(surfaceStreamErrors(response.body), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    /** Read a clone so the original body stays intact for the OpenAI client. */
    let envelope: HanzoErrorEnvelope | undefined;
    try {
      envelope = (await response.clone().json()) as HanzoErrorEnvelope;
    } catch {
      return response;
    }

    if (envelope && envelope.status === 'error' && envelope.choices == null) {
      const message =
        (typeof envelope.msg === 'string' && envelope.msg.trim()) || FALLBACK_MESSAGE;
      logger.warn('[hanzoGatewayFetch] gateway returned a 200 error envelope; surfacing as 402', {
        message,
      });
      return new Response(
        JSON.stringify({
          error: { message, type: 'insufficient_quota', code: 'insufficient_quota' },
        }),
        { status: 402, headers: { 'content-type': 'application/json' } },
      );
    }

    return response;
  };
}
