import axios from 'axios';

/**
 * CONTENT-FREE reward signals emitted to the Hanzo gateway (`POST {base}/v1/feedback`)
 * so router training gets production feedback.
 *
 * The payload carries ONLY `{ request_id, signal, rating? }` — never any prompt, response,
 * tag, free-text, filename, or code. `request_id` is the upstream gateway response id
 * (`chatcmpl-…`/`msg_…`) that the routing ledger keys each RoutingEvent on; the chat client
 * receives it as a message's `feedbackRequestId`. When it is missing (e.g. a direct,
 * non-gateway provider path) the signal simply no-ops — we never fabricate an id.
 *
 * Transport is fire-and-forget: it NEVER blocks UX and is a SILENT no-op on any failure.
 */
export type RewardSignal =
  | 'up'
  | 'down'
  | 'regenerate'
  | 'switch'
  | 'abandon'
  | 'accept'
  | 'revert'
  | 'rating';

type RewardSignalBody = {
  request_id: string;
  signal: RewardSignal;
  rating?: number;
};

/** Dedupe key set — avoids double-sending the same signal for the same message id. */
const sent = new Set<string>();

/**
 * Whether reward-signal emission is disabled via the local opt-out flag.
 *
 * Server-side org/user training opt-in is the PREFERRED enforcement and, when present,
 * makes this client gating redundant — but the client still honors the local opt-out.
 */
function isOptedOut(): boolean {
  const flag = import.meta.env.VITE_HANZO_FEEDBACK;
  return flag === '0' || flag === 'false' || flag === 'off';
}

/**
 * Emit a content-free reward signal for the given upstream request id.
 *
 * @param requestId - The message's `feedbackRequestId` (upstream gateway response id). No-op if absent.
 * @param signal - The reward signal.
 * @param rating - Only sent when `signal === 'rating'` (0-3).
 */
export function sendRewardSignal(
  requestId: string | null | undefined,
  signal: RewardSignal,
  rating?: number,
): void {
  if (!requestId || !signal) {
    return;
  }
  if (isOptedOut()) {
    return;
  }

  const base = import.meta.env.VITE_HANZO_API_URL;
  if (!base) {
    return;
  }

  const body: RewardSignalBody = { request_id: requestId, signal };
  if (signal === 'rating' && typeof rating === 'number') {
    body.rating = rating;
  }

  const dedupeKey =
    signal === 'rating' ? `${requestId}:${signal}:${body.rating}` : `${requestId}:${signal}`;
  if (sent.has(dedupeKey)) {
    return;
  }
  sent.add(dedupeKey);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    /** Mirror `setTokenHeader`: forward the end-user bearer for per-org attribution. */
    const authorization = axios.defaults.headers.common?.['Authorization'];
    if (typeof authorization === 'string' && authorization) {
      headers['Authorization'] = authorization;
    }

    /**
     * Dedicated cross-origin call to the Hanzo API — NOT the same-origin chat backend.
     * `credentials: 'include'` reuses the IAM cross-origin session; `keepalive` lets late
     * signals (switch/abandon) survive navigation.
     */
    void fetch(`${String(base).replace(/\/+$/, '')}/v1/feedback`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers,
      body: JSON.stringify(body),
    }).catch(() => {
      /* silent no-op */
    });
  } catch {
    /* silent no-op */
  }
}
