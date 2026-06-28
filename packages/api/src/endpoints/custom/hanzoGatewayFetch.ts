import { logger } from '@librechat/data-schemas';

/** The fetch signature LibreChat threads through the OpenAI client configuration. */
export type GatewayFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/** Shape of the Hanzo Cloud gateway's non-streaming error envelope. */
interface HanzoErrorEnvelope {
  status?: string;
  msg?: string;
  choices?: unknown;
}

/**
 * Wrap an OpenAI-client `fetch` so the Hanzo Cloud gateway's HTTP-200 error
 * envelope becomes a real, surfaced error instead of an opaque crash.
 *
 * The gateway (api.hanzo.ai) answers some failures — most importantly a request
 * for a premium model when the caller's balance is only the $5 starter credit —
 * with HTTP 200 and a JSON body `{ "status": "error", "msg": "..." }` that has no
 * `choices`. The OpenAI client treats the 200 as success and parses the body to
 * `undefined`; the agent run then throws the opaque
 * `Cannot read properties of undefined (reading 'role')`, so NO assistant reply
 * renders and the user never learns why (and the title call dies the same way on
 * `reading 'message'`).
 *
 * This wrapper rewrites that envelope into a conventional 402 response carrying
 * the gateway's own `msg`, so the OpenAI client raises a clean, non-retryable
 * error and the existing error path shows the actionable message ("... requires a
 * paid balance. Add funds ...") instead of crashing. Successful SSE streams
 * (`text/event-stream`) and normal completions pass through untouched, and the
 * request headers/body are never inspected — per-user `hk-` billing is unaffected.
 */
export function wrapHanzoGatewayFetch(baseFetch?: GatewayFetch): GatewayFetch {
  const inner: GatewayFetch = baseFetch ?? ((input, init) => fetch(input, init));
  return async (input, init) => {
    const response = await inner(input, init);

    /** Live SSE success streams must pass through without buffering the body. */
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      return response;
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
        (typeof envelope.msg === 'string' && envelope.msg.trim()) ||
        'Hanzo Cloud rejected the model request.';
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
