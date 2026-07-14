// Thin typed client for the Hanzo chat backend (Chat fork).
//
// Two real endpoints, both Bearer-authenticated (see api/server/routes in the
// chat repo):
//
//   POST {base}/api/agents/v1/chat/completions
//     OpenAI-compatible chat completions (api/server/routes/agents/openai.js →
//     OpenAIChatCompletionController). Body: { model, messages, stream }.
//     `model` is an agent id. We call it non-streaming for a simple mobile UI.
//
//   GET  {base}/api/convos?limit=&cursor=
//     Conversation list (api/server/routes/convos.js). Returns
//     { conversations: Conversation[], nextCursor: string | null }.
//
//   GET  {base}/v1/chat/routing-defaults
//     Server-driven org auto-routing defaults (api/server/controllers/
//     RoutingDefaults.js). The SAME route the web client uses. Fail-soft:
//     any error → { available: false } → local toggle only, exactly as today.
//
// Base URL comes from VITE_CHAT_API_URL (default https://hanzo.chat). The model
// / agent id comes from VITE_CHAT_MODEL (default "hanzo"). Auth header is
// `Authorization: Bearer <token>` — a JWT for /convos, an agent API key for the
// OpenAI-compatible route; in a gateway deployment the same IAM bearer covers
// both, so we send one token.

import { getToken } from './auth'
import { getSmartRoutingPref } from './settings'
import {
  resolveSmartRouting,
  orgDefaultRouting,
  orgAutoRoutingActive,
  cachedRoutingDefaults,
  type RoutingDefaults,
} from './routing'

/** Gateway model that routes each prompt to the best/cheapest capable model. */
const SMART_ROUTING_MODEL = 'auto'

const BASE_URL = (
  (import.meta.env.VITE_CHAT_API_URL as string | undefined) ?? 'https://hanzo.chat'
).replace(/\/$/, '')

const DEFAULT_MODEL = (import.meta.env.VITE_CHAT_MODEL as string | undefined) ?? 'hanzo'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface Conversation {
  conversationId: string
  title?: string
  endpoint?: string
  model?: string
  updatedAt?: string
}

export interface ConversationPage {
  conversations: Conversation[]
  nextCursor: string | null
}

interface ChatCompletion {
  choices?: Array<{ message?: { role?: string; content?: string } }>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    return body.error ?? body.message ?? res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export function getBaseUrl(): string {
  return BASE_URL
}

/**
 * Send a full message history and return the assistant's reply text.
 * Non-streaming for simplicity; the endpoint also supports SSE (stream:true).
 */
export async function chat(
  messages: ChatMessage[],
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<string> {
  // Explicit opts.model wins; otherwise effective smart routing (local override
  // resolved against the org's boot-fetched defaults) flips the default between
  // "auto" (gateway routes) and the configured VITE_CHAT_MODEL.
  const defaults = cachedRoutingDefaults()
  const smartRouting = resolveSmartRouting(
    getSmartRoutingPref(),
    orgDefaultRouting(defaults),
    orgAutoRoutingActive(defaults),
  ).enabled
  const model = opts.model ?? (smartRouting ? SMART_ROUTING_MODEL : DEFAULT_MODEL)
  const res = await fetch(`${BASE_URL}/api/agents/v1/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal: opts.signal,
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  const data = (await res.json()) as ChatCompletion
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new ApiError(res.status, 'Malformed completion: no assistant content')
  }
  return content
}

/** List recent conversations for the authenticated user. */
export async function listConversations(
  opts: { limit?: number; cursor?: string; signal?: AbortSignal } = {},
): Promise<ConversationPage> {
  const params = new URLSearchParams()
  params.set('limit', String(opts.limit ?? 25))
  if (opts.cursor) params.set('cursor', opts.cursor)
  const res = await fetch(`${BASE_URL}/api/convos?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
    signal: opts.signal,
  })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  const data = (await res.json()) as Partial<ConversationPage>
  return {
    conversations: data.conversations ?? [],
    nextCursor: data.nextCursor ?? null,
  }
}

/**
 * Fetch the org's server-driven auto-routing defaults (the SAME endpoint the web
 * client uses). Fail-soft is the whole contract: any error — no token, older
 * cloud-api, network failure, malformed body — resolves to `{ available: false }`
 * so the app behaves exactly as today (local toggle only). Never throws.
 */
export async function fetchRoutingDefaults(
  opts: { signal?: AbortSignal } = {},
): Promise<RoutingDefaults> {
  try {
    const res = await fetch(`${BASE_URL}/v1/chat/routing-defaults`, {
      method: 'GET',
      headers: authHeaders(),
      signal: opts.signal,
    })
    if (!res.ok) return { available: false }
    const data = (await res.json()) as Partial<RoutingDefaults>
    if (data?.available !== true) return { available: false }
    return {
      available: true,
      auto_routing_active: data.auto_routing_active === true,
      default_session_routing: data.default_session_routing === true,
    }
  } catch {
    return { available: false }
  }
}
