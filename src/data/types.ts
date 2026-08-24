/**
 * What the wire carries, and what a refusal means to a reader.
 *
 * These are the server's shapes, named the way the server names them, because a
 * second vocabulary for one fact is how two halves of a product start
 * disagreeing about it. The one place this file departs from the wire is
 * `Message.role`: the server says `isCreatedByUser`, every component asks
 * "user or assistant", and `asMessage` in `messages.ts` is the single crossing
 * between them.
 *
 * The error map at the bottom is DATA. A refusal has one sentence and at most
 * one action, and deciding which is not a rendering question — `Failure` from
 * @hanzo/ui/chat draws whatever this returns.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type User = {
  id: string
  name?: string
  username?: string
  email?: string
  avatar?: string
  role?: string
  provider?: string
  createdAt?: string
}

/** Whether this browser is a stranger, an anonymous visitor, or somebody. */
export type Standing = 'unknown' | 'guest' | 'live'

// ---------------------------------------------------------------------------
// The deployment
// ---------------------------------------------------------------------------

export type Config = {
  appTitle: string
  serverDomain?: string
  helpAndFaqURL?: string
  customFooter?: string
  sharedLinksEnabled?: boolean
  publicSharedLinksEnabled?: boolean
  registrationEnabled?: boolean
  /** Whether a visitor with no account may hold a conversation at all. */
  allowGuestChat?: boolean
  guestMessageMax?: number
  guestEndpoint?: string
  guestModel?: string
  modelSpecs?: Specs
  modelDescriptions?: Record<string, Record<string, string>>
  interface?: Record<string, unknown>
  balance?: { enabled?: boolean; startBalance?: number }
  webSearch?: { searchProvider?: string; scraperProvider?: string; rerankerType?: string }
  mcpServers?: Record<string, McpMenu>
  conversationImportMaxFileSize?: number
}

export type McpMenu = {
  chatMenu?: boolean
  isOAuth?: boolean
  startup?: boolean
  iconPath?: string
  customUserVars?: Record<string, { title: string; description: string }>
}

/** A named, preconfigured way to ask — what the model selector actually lists. */
export type Spec = {
  name: string
  label: string
  preset: Preset
  order?: number
  default?: boolean
  description?: string
  group?: string
  groupIcon?: string
  showIconInMenu?: boolean
  showIconInHeader?: boolean
  iconURL?: string
  webSearch?: boolean
  fileSearch?: boolean
  executeCode?: boolean
  artifacts?: string | boolean
  mcpServers?: string[]
}

export type Specs = {
  enforce?: boolean
  prioritize?: boolean
  list: Spec[]
  addedEndpoints?: string[]
}

/** The settings a spec carries — the same shape a conversation holds. */
export type Preset = {
  endpoint?: string | null
  endpointType?: string | null
  model?: string | null
  modelLabel?: string | null
  promptPrefix?: string | null
  temperature?: number | null
  topP?: number
  maxOutputTokens?: number | null
  maxContextTokens?: number
  greeting?: string
  iconURL?: string | null
  spec?: string | null
  agent_id?: string
  assistant_id?: string
  web_search?: boolean
  thinking?: boolean
  fast?: boolean
  [key: string]: unknown
}

/** One entry of `/v1/chat/endpoints` — what a provider can do here. */
export type Endpoint = {
  order: number
  type?: string
  name?: string
  iconURL?: string
  version?: string
  modelDisplayLabel?: string
  userProvide?: boolean | null
  userProvideURL?: boolean | null
  capabilities?: string[]
  retrievalModels?: string[]
}

export type Endpoints = Record<string, Endpoint | null>

/** `/v1/chat/models` — the models each endpoint will serve. */
export type Models = Record<string, string[]>

export type Banner = {
  bannerId: string
  message: string
  displayFrom?: string
  displayTo?: string
  type?: string
  isPublic?: boolean
} | null

export type Balance = {
  balance?: number
  tokenCredits?: number
  autoRefillEnabled?: boolean
  refillAmount?: number
}

export type Usage = {
  total?: number
  entries?: { date: string; tokens: number; cost?: number }[]
}

export type Role = {
  name: string
  permissions?: Record<string, Record<string, boolean>>
}

export type Terms = { termsAccepted: boolean }

/**
 * A pinned way to ask. Exactly ONE kind per entry — an agent, a skill, a spec,
 * or a model and its endpoint, which are two halves of one name — and the
 * server refuses anything that names two.
 */
export type Favorite = {
  agentId?: string
  skillId?: string
  spec?: string
  model?: string
  endpoint?: string
}

// ---------------------------------------------------------------------------
// Conversations and turns
// ---------------------------------------------------------------------------

export type Convo = Preset & {
  conversationId: string | null
  title?: string | null
  user?: string
  isArchived?: boolean
  isPinned?: boolean
  tags?: string[]
  files?: Attachment[]
  createdAt: string
  updatedAt: string
  expiredAt?: string | null
}

export type Feedback = {
  rating: 'thumbsUp' | 'thumbsDown'
  tag?: { key: string; label: string } | null
  text?: string
}

/**
 * A turn, as the app holds it.
 *
 * `role` replaces the wire's `isCreatedByUser` because it is what every
 * component actually asks — @hanzo/ui/chat's `Message` takes `role` and decides
 * the entire presentation from it, so carrying a boolean would mean every
 * caller performing the same translation.
 */
export type Message = {
  messageId: string
  conversationId: string | null
  parentMessageId: string | null
  role: 'user' | 'assistant'
  text: string
  /** Rich parts, when the turn has any. Plain answers carry `text` alone. */
  content?: Part[]
  sender?: string
  model?: string | null
  endpoint?: string
  iconURL?: string | null
  files?: Attachment[]
  feedback?: Feedback
  /** The turn failed; `text` is the reason, and `explain` reads it. */
  error?: boolean
  /** The turn stopped before it was done. */
  unfinished?: boolean
  /** Answering right now. Set by the stream, never by the server. */
  busy?: boolean
  finish_reason?: string
  createdAt?: string
  updatedAt?: string
}

/** The wire's turn, before `asMessage`. */
export type RawMessage = Omit<Message, 'role' | 'busy'> & {
  isCreatedByUser?: boolean
  role?: string
}

export type Part =
  | { type: 'text'; text: string; tool_call_ids?: string[] }
  | { type: 'think'; think: string }
  | { type: 'error'; error: string }
  | { type: 'image_file'; image_file: { file_id: string; filepath?: string; filename?: string } }
  | { type: 'image_url'; image_url: { url: string; detail?: string } }
  | { type: 'tool_call'; tool_call: ToolCall }

export type ToolCall = {
  id?: string
  name: string
  args?: string | Record<string, unknown>
  output?: string
  progress?: number
  /** `in_progress` | `completed` | `cancelled` | `failed` — the wire's words. */
  status?: string
  auth?: string
  expires_at?: number
}

export type Tag = {
  tag: string
  count?: number
  position?: number
}

// ---------------------------------------------------------------------------
// Files, sharing, tools
// ---------------------------------------------------------------------------

/**
 * A file a conversation carries.
 *
 * Named for what it is TO the conversation rather than for the wire's `files`,
 * because `File` is a DOM global: a component that imported the wire's word
 * would shadow the thing an `<input type="file">` actually hands it, and the two
 * shapes are close enough to be confusing and far enough apart to break.
 */
export type Attachment = {
  file_id: string
  temp_file_id?: string
  user?: string
  conversationId?: string
  filename: string
  filepath: string
  type: string
  bytes: number
  embedded?: boolean
  width?: number
  height?: number
  preview?: string
  text?: string
  progress?: number
  source?: string
  context?: string
  createdAt?: string
}

/** What this deployment will accept, per endpoint. */
export type Limits = {
  endpoints?: Record<
    string,
    {
      fileLimit?: number
      fileSizeLimit?: number
      totalSizeLimit?: number
      supportedMimeTypes?: string[]
      disabled?: boolean
    }
  >
  serverFileSizeLimit?: number
  avatarSizeLimit?: number
}

export type Share = {
  shareId: string
  conversationId: string
  title?: string
  isPublic?: boolean
  createdAt?: string
  updatedAt?: string
}

export type McpServer = {
  serverName: string
  title?: string
  description?: string
  url?: string
  iconPath?: string
  isOAuth?: boolean
  chatMenu?: boolean
  startup?: boolean
  consumeOnly?: boolean
  customUserVars?: Record<string, { title: string; description: string }>
}

export type McpTool = {
  name: string
  /** The tool's full name — the server's and its own, joined. */
  pluginKey: string
  description?: string
  serverName: string
}

/** What a server needs from the person before it will connect. */
export type McpField = {
  authField: string
  label: string
  description: string
}

/** A server as the tool menu shows it: its icon, its tools, what it still needs. */
export type McpEntry = {
  name: string
  icon?: string
  authenticated: boolean
  authConfig: McpField[]
  tools: McpTool[]
}

/**
 * A server's connection.
 *
 * `connectionState` is the wire's word — `connected`, `disconnected`,
 * `connecting`, `error` — and it maps straight onto `StatusTag`'s tone. The
 * per-server route spells the same fact `connectionStatus`, so `mcp.ts` reads
 * both into this one shape rather than letting two names for one state reach
 * the interface.
 */
export type McpStatus = {
  connectionState: string
  requiresOAuth?: boolean
  error?: string
}

export type Voice = { name: string; id?: string }

export type Speech = {
  speechTab?: Record<string, unknown>
  sttExternal?: boolean
  ttsExternal?: boolean
}

// ---------------------------------------------------------------------------
// What a refusal says
// ---------------------------------------------------------------------------

/**
 * A refusal, rendered.
 *
 * `text` is the whole sentence and `action` is the ONE thing the reader can do
 * about it — never both a link and an apology, and never a link to somewhere
 * that cannot help. `Failure` from @hanzo/ui/chat draws exactly this.
 */
export type Failure = {
  code: string
  text: string
  action?: { label: string; href: string }
}

const billing = 'https://billing.hanzo.ai'

/**
 * The sentences, by the code the server sends.
 *
 * Each one exists because it is a DIFFERENT thing to the reader, and the pairs
 * that arrive on the same status are the ones worth spelling out:
 *
 *   `insufficient_quota`  a paywall. Money resolves it, so the action is money.
 *   `allowance_spent`     a limit. It turns over on its own; money buys nothing
 *                         today, so the action is the plan that lifts it.
 *   `key_unknown`         OUR credential is broken. Nothing the reader owns is
 *                         wrong and no payment restores it, so there is no
 *                         action at all — telling them to buy credit for a
 *                         credential no payment fixes is worse than silence.
 *
 * All three arrive as 402. Collapsing them, which is what an unmapped code does,
 * shows "add credit" to a reader who owes nothing at the one moment they are
 * most ready to buy.
 */
const sentences: Record<string, Failure> = {
  insufficient_quota: {
    code: 'insufficient_quota',
    text: 'Your balance will not cover this request.',
    action: { label: 'Add credit', href: billing },
  },
  allowance_spent: {
    code: 'allowance_spent',
    text: "Today's free calls are spent. The count turns over at midnight UTC.",
    action: { label: 'Choose a plan', href: billing },
  },
  key_unknown: {
    code: 'key_unknown',
    text: 'This service’s API credential is not valid, so the request was never sent. Nothing is wrong with your account, no credit has been used, and this has been logged.',
  },
  upstream_error: {
    code: 'upstream_error',
    text: 'The response was interrupted before it finished. Nothing is wrong with your account — send the message again.',
  },
  invalid_api_key: {
    code: 'invalid_api_key',
    text: 'That API key was refused. Check the key set for this endpoint and try again.',
  },
  moderation: {
    code: 'moderation',
    text: 'That message was refused by the safety filter.',
  },
  refusal: {
    code: 'refusal',
    text: 'The model declined to answer that.',
  },
  no_user_key: {
    code: 'no_user_key',
    text: 'This endpoint needs a key of your own before it will answer.',
  },
  expired_user_key: {
    code: 'expired_user_key',
    text: 'The key set for this endpoint has expired. Set a new one to carry on.',
  },
  expired_bearer: {
    code: 'expired_bearer',
    text: 'This session has expired. Sign in again to carry on.',
  },
  missing_model: {
    code: 'missing_model',
    text: 'No model was named for this endpoint.',
  },
  models_not_loaded: {
    code: 'models_not_loaded',
    text: 'The model list could not be read, so nothing can be chosen yet.',
  },
  input_length: {
    code: 'input_length',
    text: 'That conversation is longer than this model will accept. Start a new one, or shorten it.',
  },
  concurrent: {
    code: 'concurrent',
    text: 'One answer at a time. Let the current one finish before sending another.',
  },
  message_limit: {
    code: 'message_limit',
    text: 'You have reached this deployment’s message limit for now.',
  },
  ban: {
    code: 'ban',
    text: 'This account is suspended.',
  },
  unauthorized: {
    code: 'unauthorized',
    text: 'You are not signed in.',
  },
  GUEST_LIMIT: {
    code: 'GUEST_LIMIT',
    text: 'That is the whole free preview. Sign in to keep going — your conversations come with you.',
  },
}

/** The last resort: a human sentence, never the upstream's body. */
const unknown: Failure = {
  code: 'unknown',
  text: 'Something went wrong on our side. This has been logged — please try again.',
}

/** The bare body Passport answers an unauthenticated request with. */
const isUnauthorized = (value: string) =>
  value.trim().replace(/^"|"$/g, '').toLowerCase() === 'unauthorized'

/**
 * Read a refusal.
 *
 * Servers keep inventing shapes, so this looks for a code in the three places
 * one has ever appeared and degrades to a sentence when it finds none. What it
 * must never do is print the upstream body: two refusals shipped that way —
 * Passport's bare `Unauthorized`, and a gateway's `a billable tenant is required
 * (no anonymous usage)` — both read as gibberish beside an answer, and the raw
 * text is already in the console for whoever is debugging.
 */
export const explain = (body: unknown): Failure => {
  if (typeof body === 'string') {
    if (isUnauthorized(body)) return sentences.unauthorized
    const parsed = body.trim().startsWith('{') ? safely(body) : null
    return parsed ? explain(parsed) : unknown
  }
  if (body == null || typeof body !== 'object') return unknown

  const shape = body as Record<string, unknown>
  const nested = shape.error
  const code =
    pick(shape.type) ??
    pick(shape.code) ??
    pick(nested) ??
    (nested && typeof nested === 'object' ? pick((nested as Record<string, unknown>).code) : null)

  if (code && sentences[code]) return sentences[code]
  if (typeof shape.text === 'string' && isUnauthorized(shape.text)) return sentences.unauthorized
  return code ? { code, text: unknown.text } : unknown
}

const pick = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)

const safely = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
