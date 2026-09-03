/**
 * What the estate remembers, and what it can find in the code.
 *
 * A MEMORY HAS NO CONFIDENCE. `Memory` carries content, a kind, an owner and
 * two clocks; the `score` beside them is a similarity against a QUERY, so it
 * means nothing on a plain listing and is not shown on one.
 *
 * THE SYMBOL INDEX IS A SEARCH, NOT A TABLE, and the QUERY IS THE KEY. Each
 * query is its own cache entry, so re-typing one already asked is free and no
 * answer can arrive for a question that has since changed — which is the race
 * a hand-rolled store had to guard by comparing the query back on arrival.
 *
 * The key is built from what somebody TYPED, so it settles first. Reading on
 * every keystroke sent a request and minted a cache entry per character, and
 * every one but the last was a question already finished being asked.
 */
import { atom, useAtom } from '~/data/store'
import { keys } from '~/data/keys'
import { client, ESTATE } from '~/data/origin'
import { reason, useRead, useSend, useSettled } from '~/data/query'

export interface MemoryItem {
  /** The memory's name in the store — how it is addressed. */
  name: string
  content: string
  /** What kind of memory it is, as the store recorded it. Empty when unstated. */
  kind: string
  owner: string
  /** RFC 3339, as the wire sends it. */
  updatedTime: string
}

export interface SymbolIndexItem {
  /** The declared name, when the span declares one. */
  symbol: string
  /** What the indexer decided the chunk IS — func, method, type and so on. */
  kind: string
  file: string
  line: number
  repo: string
  snippet: string
}

interface WireMemory {
  name?: string
  content?: string
  kind?: string
  owner?: string
  updatedTime?: string
}

interface WireSpan {
  symbol?: string
  kind?: string
  file?: string
  line?: number
  repo?: string
  snippet?: string
}

/** Whether the panel is showing, which tab is on, and what was asked. */
export const open = atom(false)
export const tab = atom<'memory' | 'symbols'>('memory')
export const asked = atom('')

const readMemories = async (): Promise<MemoryItem[]> => {
  // The listing is enveloped: `{data: [...]}`.
  const listed = await client(ESTATE).http.collection<WireMemory>('data', {
    path: '/v1/ai/memory/list',
  })
  return listed.map((one) => ({
    name: one.name ?? '',
    content: one.content ?? '',
    kind: one.kind ?? '',
    owner: one.owner ?? '',
    updatedTime: one.updatedTime ?? '',
  }))
}

interface Found {
  symbols: SymbolIndexItem[]
  /** Retrieval failed, so an empty result is an outage and not an absence. */
  degraded: boolean
}

const readSymbols = async (query: string): Promise<Found> => {
  const answer = await client(ESTATE).http.json<{ results?: WireSpan[]; degraded?: boolean }>({
    method: 'GET',
    path: '/v1/code/search',
    query: { q: query, type: 'symbol', limit: 50 },
  })
  return {
    symbols: (answer.results ?? []).map((one) => ({
      symbol: one.symbol ?? '',
      kind: one.kind ?? '',
      file: one.file ?? '',
      line: one.line ?? 0,
      repo: one.repo ?? '',
      snippet: one.snippet ?? '',
    })),
    degraded: answer.degraded ?? false,
  }
}

export const intelligenceStore = {
  open: () => open.set(true),
  close: () => open.set(false),
  toggle: () => open.set((showing) => !showing),
  setTab: (which: 'memory' | 'symbols') => tab.set(which),
  setActiveTab: (which: 'memory' | 'symbols') => tab.set(which),
  search: (query: string) => asked.set(query),
}

export const useIntelligence = () => {
  const isOpen = useAtom(open)
  const activeTab = useAtom(tab)
  const typed = useAtom(asked)
  // What is READ lags what is typed; what is SHOWN in the box does not.
  const query = useSettled(typed)

  const memories = useRead(keys.memories, readMemories, {
    enabled: isOpen && activeTab === 'memory',
    fresh: 60_000,
  })
  // An empty query asks NOTHING: the route requires one, and a blank list is
  // the truthful answer to a question nobody asked.
  const found = useRead(keys.symbols(query), () => readSymbols(query), {
    enabled: isOpen && activeTab === 'symbols' && Boolean(query.trim()),
    fresh: 60_000,
  })

  return {
    isOpen,
    activeTab,
    // The box renders what was typed — a lagging input is an input that fights
    // the person using it.
    query: typed,
    memories: memories.data ?? [],
    symbols: found.data?.symbols ?? [],
    degraded: found.data?.degraded ?? false,
    pending: memories.pending || found.pending,
    fault: memories.error
      ? reason(memories.error)
      : found.error
        ? reason(found.error)
        : null,
  }
}

/**
 * Stores a memory.
 *
 * The body is `{content, kind, metadata}` and CARRIES NO IDENTITY: the owner
 * and the user are force-set server-side from the authenticated caller, which
 * is the one chokepoint that makes a stored memory the caller's. Sending either
 * would be overwritten, so neither is sent. Empty content is refused there, so
 * it is refused here rather than sent to be refused.
 */
export const useRemember = () =>
  useSend(async (content: string, kind = '') => {
    if (!content.trim()) return
    await client(ESTATE).http.json({
      method: 'POST',
      path: '/v1/ai/memory/remember',
      body: { content: content.trim(), kind: kind || undefined },
    })
  }, [keys.memories])

/** Removes one. A memory is addressed by `name`, which is what the list has. */
export const useForget = () =>
  useSend(async (name: string) => {
    if (!name) return
    await client(ESTATE).http.json({
      method: 'POST',
      path: '/v1/ai/memory/delete',
      body: { name },
    })
  }, [keys.memories])
