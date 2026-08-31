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
 * One group is NOT under `/v1/chat`: `iam.*`, the two trips to the issuer that
 * are plain navigations rather than SDK calls. Everything else the SDK resolves
 * from discovery.
 *
 * A caveat this table cannot fix, and the reader should know it: `/v1/chat/*`
 * is not a surface api.hanzo.ai serves. `/v1/chat/config` answers 404 there and
 * hanzo.chat redirects to the marketing site, so every address below resolves
 * to nothing today. The real conversation surface is
 * `/v1/agents/chat/conversations`, which `@hanzo/ai` binds as `client.threads`,
 * and the real completion is `/v1/chat/completions`. Moving to them is a change
 * to the frames and the shapes as much as to these strings, so it is one piece
 * of work rather than a rename here.
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

export type ShareQuery = {
  cursor?: string
  pageSize?: number
  isPublic?: boolean
  sortBy?: 'title' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
  search?: string
}

export const api = {
  /** What THIS deployment is: its limits, and what a guest may do. */
  config: `${chat}/config`,
  endpoints: `${chat}/endpoints`,
  models: `${chat}/models`,

  /** Who is asking. */
  user: {
    self: `${chat}/user`,
    close: `${chat}/user/delete`,
  },

  /** The SET of conversations. */
  convos: {
    list: (params: ConvoQuery = {}) => `${chat}/convos${q({ ...params })}`,
    one: (id: string) => `${chat}/convos/${one(id)}`,
    update: `${chat}/convos/update`,
    archive: `${chat}/convos/archive`,
    drop: `${chat}/convos`,
    dropAll: `${chat}/convos/all`,
  },

  /** ONE conversation's turns. */
  messages: {
    of: (convoId: string) => `${chat}/messages/${one(convoId)}`,
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
    stop: `${chat}/agents/chat/abort`,
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
    upload: `${chat}/files`,
    images: `${chat}/files/images`,
    listen: `${chat}/files/speech/stt`,
  },

  /** The tools a conversation can reach, and their connections. */
  mcp: {
    servers: `${chat}/mcp/servers`,
    status: `${chat}/mcp/connection/status`,
    restart: (server: string) => `${chat}/mcp/${one(server)}/reinitialize`,
  },

  /**
   * The issuer, for the two trips the IAM SDK does not make. Everything else it
   * resolves from discovery, and writing those out here would be a second copy
   * of what the issuer already publishes — one that can drift from it.
   */
  iam: {
    signup: `${brand.issuer}/signup/${clientId}`,
    account: `${brand.issuer}/account`,
  },
} as const


/** Where a refusal sends a visitor who has to sign in. */
export const loginPath = '/login'

/** Where the issuer returns one. */
export const callbackPath = '/auth/callback'
