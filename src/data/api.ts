/**
 * Every address this client knows, in one table.
 *
 * A path appears here as a literal and nowhere else. That is the whole rule,
 * and it is what lets a route be renamed by editing one line instead of by
 * grepping a tree for a string that four files spell slightly differently. It
 * is also why nothing outside `src/data` ever learns an API host: callers ask
 * this table for an address and hand it to `http`.
 *
 * The base comes from `<base href>` rather than from a build-time variable. The
 * client is served BESIDE the API — the static plane answers the document, the
 * ingress peels `/v1/chat/*` off to the cloud binary — so every call is
 * same-origin, and the dev proxy in `vite.config.ts` makes that true on
 * localhost too. A compiled-in host would be a second answer to a question the
 * document already answers, and it would pin one image to one brand.
 *
 * Three groups are NOT under `/v1/chat`, and each is deliberate:
 *
 *   `iam.*`     the issuer's own OIDC surface. `session.tsx` drives it through
 *               the SDK, which reads most of it from discovery — they are named
 *               here so the table stays the whole answer to "where does this
 *               client talk", not most of it.
 *   `cloud.*`   api.hanzo.ai, the estate-wide surface: one event sink, one
 *               catalogue of plans. Cross-origin by nature; nothing else is.
 */
import { brand, clientId } from '~/brand'

/** The document's own root, without its trailing slash. */
const root = (() => {
  if (typeof document === 'undefined') return ''
  const href = document.querySelector('base')?.getAttribute('href') ?? '/'
  return href.endsWith('/') ? href.slice(0, -1) : href
})()

const chat = `${root}/v1/chat`

/** A query string, or nothing at all — an empty parameter is not a parameter. */
const q = (params: Record<string, string | number | boolean | string[] | null | undefined>) => {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      for (const one of value) parts.push(`${key}=${encodeURIComponent(one)}`)
      continue
    }
    parts.push(`${key}=${encodeURIComponent(String(value))}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

const one = encodeURIComponent

export type ConvoQuery = {
  cursor?: string
  isArchived?: boolean
  sortBy?: 'title' | 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
  tags?: string[]
  search?: string
}

export type MessageQuery = {
  cursor?: string
  sortBy?: 'endpoint' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
  pageSize?: number
  search?: string
}

export type ShareQuery = {
  cursor?: string
  pageSize?: number
  isPublic?: boolean
  sortBy?: 'title' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
  search?: string
}

export const api = {
  /** Is the server there at all. The one call that means nothing but "yes". */
  health: `${chat}/health`,

  /** What THIS deployment is: its name, its limits, what a guest may do. */
  config: `${chat}/config`,
  endpoints: `${chat}/endpoints`,
  models: `${chat}/models`,
  banner: `${chat}/banner`,
  searchEnabled: `${chat}/search/enable`,
  balance: `${chat}/balance`,
  usage: `${chat}/usage`,
  role: (name: string) => `${chat}/roles/${one(name.toLowerCase())}`,
  key: (endpoint: string) => `${chat}/keys${q({ name: endpoint })}`,

  /** Who is asking, and the handful of facts kept against them. */
  user: {
    self: `${chat}/user`,
    org: `${chat}/user/active-org`,
    terms: `${chat}/user/terms`,
    accept: `${chat}/user/terms/accept`,
    tour: `${chat}/user/tour`,
    close: `${chat}/user/delete`,
    favorites: `${chat}/user/settings/favorites`,
  },

  /** The SET of conversations. */
  convos: {
    list: (params: ConvoQuery = {}) => `${chat}/convos${q({ ...params })}`,
    one: (id: string) => `${chat}/convos/${one(id)}`,
    title: (id: string) => `${chat}/convos/gen_title/${one(id)}`,
    update: `${chat}/convos/update`,
    archive: `${chat}/convos/archive`,
    import: `${chat}/convos/import`,
    fork: `${chat}/convos/fork`,
    copy: `${chat}/convos/duplicate`,
    drop: `${chat}/convos`,
    dropAll: `${chat}/convos/all`,
  },

  /** ONE conversation's turns. */
  messages: {
    list: (params: MessageQuery = {}) => `${chat}/messages${q({ ...params })}`,
    of: (convoId: string) => `${chat}/messages/${one(convoId)}`,
    one: (convoId: string, id: string) => `${chat}/messages/${one(convoId)}/${one(id)}`,
    feedback: (convoId: string, id: string) =>
      `${chat}/messages/${one(convoId)}/${one(id)}/feedback`,
    branch: `${chat}/messages/branch`,
  },

  /** Labels on conversations. */
  tags: {
    list: `${chat}/tags`,
    of: (convoId: string) => `${chat}/tags/convo/${one(convoId)}`,
  },

  /**
   * Asking, and listening to the answer.
   *
   * `send` opens the turn; `stream` is where a turn that outlived its request
   * is picked back up (`resume=true` after a reload); `state` says whether one
   * is still running for a conversation the client has just opened.
   */
  ask: {
    send: (endpoint: string) => `${chat}/agents/chat/${one(endpoint)}`,
    stream: (streamId: string, resume = false) =>
      `${chat}/agents/chat/stream/${one(streamId)}${q({ resume: resume ? 'true' : '' })}`,
    state: (convoId: string) => `${chat}/agents/chat/status/${one(convoId)}`,
    running: `${chat}/agents/chat/active`,
    stop: `${chat}/agents/chat/abort`,
    plain: `${chat}/ask`,
  },

  /** Hanzo Cloud's own agents, relayed so the visitor's token stays here. */
  agents: {
    list: `${chat}/agents/cloud`,
    run: (name: string) => `${chat}/agents/cloud/${one(name)}/run`,
  },

  /** A run's event stream, and the way to end one. */
  runs: {
    watch: (sessionId: string) => `${chat}/runs/stream${q({ root: sessionId })}`,
    stop: `${chat}/runs/stop`,
  },

  /** A conversation someone published. The one surface that takes no session. */
  share: {
    list: (params: ShareQuery = {}) => `${chat}/share${q({ ...params })}`,
    one: (shareId: string) => `${chat}/share/${one(shareId)}`,
    of: (convoId: string) => `${chat}/share/link/${one(convoId)}`,
    create: (convoId: string) => `${chat}/share/${one(convoId)}`,
    update: (shareId: string) => `${chat}/share/${one(shareId)}`,
    drop: (shareId: string) => `${chat}/share/${one(shareId)}`,
  },

  /** What a turn can carry, and what it can be turned into. */
  files: {
    list: `${chat}/files`,
    upload: `${chat}/files`,
    drop: `${chat}/files`,
    config: `${chat}/files/config`,
    ofAgent: (agentId: string) => `${chat}/files/agent/${one(agentId)}`,
    download: (userId: string, fileId: string) =>
      `${chat}/files/download/${one(userId)}/${one(fileId)}`,
    images: `${chat}/files/images`,
    listen: `${chat}/files/speech/stt`,
    speak: `${chat}/files/speech/tts`,
    voices: `${chat}/files/speech/tts/voices`,
    speech: `${chat}/files/speech/config/get`,
  },

  /**
   * Where the server serves an image it wrote. A stored filepath IS this
   * address, so it is passed through whole rather than re-encoded.
   */
  image: (path: string) => `${chat}/images/${path.replace(/^\/+/, '')}`,

  /** The tools a conversation can reach, and their connections. */
  mcp: {
    servers: `${chat}/mcp/servers`,
    tools: `${chat}/mcp/tools`,
    status: `${chat}/mcp/connection/status`,
    statusOf: (server: string) => `${chat}/mcp/connection/status/${one(server)}`,
    bind: (server: string) => `${chat}/mcp/${one(server)}/oauth/bind`,
    cancel: (server: string) => `${chat}/mcp/oauth/cancel/${one(server)}`,
    restart: (server: string) => `${chat}/mcp/${one(server)}/reinitialize`,
  },

  /**
   * The issuer. `session.tsx` reaches these through the IAM SDK, which resolves
   * all but the first from discovery — they are written out because a reader
   * asking "what does this client talk to" deserves the whole answer here.
   */
  iam: {
    discovery: `${brand.issuer}/.well-known/openid-configuration`,
    authorize: `${brand.issuer}/v1/iam/oauth/authorize`,
    token: `${brand.issuer}/v1/iam/oauth/token`,
    userinfo: `${brand.issuer}/v1/iam/oauth/userinfo`,
    logout: `${brand.issuer}/v1/iam/oauth/logout`,
    signup: `${brand.issuer}/signup/${clientId}`,
    account: `${brand.issuer}/account`,
  },

  /** The estate, not this deployment. Cross-origin, and the only thing that is. */
  cloud: {
    event: 'https://api.hanzo.ai/v1/event',
    plans: 'https://api.hanzo.ai/v1/billing/plans',
  },
} as const

/** Where a refusal sends a visitor who has to sign in. */
export const loginPath = '/login'

/** Where the issuer returns one. */
export const callbackPath = '/auth/callback'
