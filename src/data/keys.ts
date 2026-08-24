/**
 * What each cached answer is called.
 *
 * A key is a path: the general part first, the specific part last. That order is
 * the whole design — `invalidate(keys.convos)` drops every conversation and
 * every list of them, whatever any of them was filtered by, while
 * `invalidate(keys.convo(id))` drops exactly one and the turns beneath it. Two
 * things that must expire together are nested; two that must not are siblings,
 * which is why a list lives under `list` rather than beside the ids.
 *
 * They are gathered here for the same reason the URLs are gathered in `api.ts`:
 * a name written at both the read and the write is a name that can be written
 * two ways, and then a rename lands in the database and not in the sidebar.
 */

export type Key = readonly string[]

/** A filter, as a key part. Order-independent, so two equal filters are one key. */
export const sign = (filter: Record<string, unknown>): string =>
  Object.entries(filter)
    .filter(([, value]) => value != null && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, value]) => `${name}=${Array.isArray(value) ? value.join(',') : String(value)}`)
    .join('&')

export const keys = {
  config: ['config'] as Key,
  endpoints: ['endpoints'] as Key,
  models: ['models'] as Key,
  banner: ['banner'] as Key,
  search: ['search'] as Key,
  balance: ['balance'] as Key,
  usage: ['usage'] as Key,
  role: (name: string) => ['role', name] as Key,
  key: (endpoint: string) => ['key', endpoint] as Key,

  user: ['user'] as Key,
  terms: ['user', 'terms'] as Key,
  favorites: ['user', 'favorites'] as Key,

  convos: ['convos'] as Key,
  convoList: (filter: Record<string, unknown>) => ['convos', 'list', sign(filter)] as Key,
  convo: (id: string) => ['convos', 'one', id] as Key,
  /** Every turn of one conversation, so both drop together. */
  turns: (convoId: string) => ['convos', 'one', convoId, 'turns'] as Key,
  /** A search across every conversation's turns — not any one conversation's. */
  found: (filter: Record<string, unknown>) => ['found', sign(filter)] as Key,

  tags: ['tags'] as Key,

  shares: ['shares'] as Key,
  shareList: (filter: Record<string, unknown>) => ['shares', 'list', sign(filter)] as Key,
  share: (shareId: string) => ['shares', 'one', shareId] as Key,
  shareOf: (convoId: string) => ['shares', 'of', convoId] as Key,

  files: ['files'] as Key,
  fileList: ['files', 'list'] as Key,
  limits: ['files', 'limits'] as Key,
  agentFiles: (agentId: string) => ['files', 'agent', agentId] as Key,
  voices: ['files', 'voices'] as Key,
  speech: ['files', 'speech'] as Key,

  mcp: ['mcp'] as Key,
  servers: ['mcp', 'servers'] as Key,
  tools: ['mcp', 'tools'] as Key,
  status: ['mcp', 'status'] as Key,
  statusOf: (server: string) => ['mcp', 'status', server] as Key,

  agents: ['agents'] as Key,
  running: ['agents', 'running'] as Key,
} as const
