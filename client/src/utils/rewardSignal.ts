import axios from 'axios';
import { sendFeedback, type FeedbackSignal } from '@hanzo/ai';

/**
 * CONTENT-FREE reward signals emitted to the Hanzo gateway (`POST {base}/v1/ai/feedback`)
 * so router training gets production feedback.
 *
 * THIN adapter over the shared `@hanzo/ai` `sendFeedback` client (one
 * implementation, N surfaces): the SDK owns the whitelisted
 * `{ request_id, signal, rating? }` body, the dedupe, and the fire-and-forget
 * transport (keepalive fetch / sendBeacon). This module only supplies the
 * chat-specific base URL, the end-user bearer, and the local opt-out.
 *
 * `requestId` is the message's `feedbackRequestId` — the upstream gateway
 * response id (`chatcmpl-…` / `msg_…`) the routing ledger keys each RoutingEvent
 * on; when it is missing (a direct, non-gateway provider path) the signal simply
 * no-ops — we never fabricate an id. No prompt, response, tag, filename or code
 * can ever transit; it NEVER blocks UX and is a SILENT no-op on any failure.
 */
export type RewardSignal = FeedbackSignal;

/**
 * Whether reward-signal emission is disabled via the local opt-out flag.
 *
 * Server-side org/user training opt-in is the PREFERRED enforcement and, when
 * present, makes this client gating redundant — but the client still honors the
 * local opt-out.
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
 * @param rating - Only sent when `signal === 'rating'` (1-3).
 */
export function sendRewardSignal(
  requestId: string | null | undefined,
  signal: RewardSignal,
  rating?: number,
): void {
  if (!requestId || isOptedOut()) {
    return;
  }

  const base = import.meta.env.VITE_HANZO_API_URL;
  if (!base) {
    return;
  }

  // Mirror `setTokenHeader`: forward the end-user bearer for per-org attribution.
  // `credentials: 'include'` reuses the IAM cross-origin session (the SDK's
  // default). The SDK re-adds the `Bearer ` prefix, so strip it here.
  const authorization = axios.defaults.headers.common?.['Authorization'];
  const token =
    typeof authorization === 'string' && authorization
      ? authorization.replace(/^Bearer\s+/i, '')
      : undefined;

  const opts = { baseUrl: String(base), token, credentials: 'include' as const };

  if (signal === 'rating') {
    if (rating !== 1 && rating !== 2 && rating !== 3) {
      return;
    }
    sendFeedback({ requestId, signal, rating }, opts);
    return;
  }
  sendFeedback({ requestId, signal }, opts);
}
