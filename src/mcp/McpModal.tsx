/**
 * The MCP servers this org connected, and the catalog it can connect more from.
 *
 * Everything on screen is answered by a route. The left column is
 * `GET /v1/tools/mcp/servers`; a row's tools and its dot are
 * `GET /v1/tools?source=mcp`, which is also why a registration that contributed
 * nothing reads "silent" rather than green. The connect pane is
 * `GET /v1/tools/catalog` — what COULD be connected, which is a different
 * question from what is — and both of its buttons are
 * `POST /v1/tools/mcp/servers`, the one route that registers a server: a catalog
 * listing by id, or a name and the https endpoint it answers JSON-RPC on.
 *
 * There is no stdio here, and that is the server's decision rather than a
 * simplification: the route validates the URL as a public http(s) host, so a
 * field asking for a local command would have been a field whose every value is
 * refused.
 */
import { Blocks, Check, Plus, Power, Search, Trash2, Wrench, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useEffect, useState } from 'react'

import { requireLogin } from '../data/gate.ts'
import { useSession } from '../data/session.tsx'
import { mcpStore, useCatalog, useMcp } from './store.ts'
import type { McpServer } from './types.ts'

const dim = 'rgba(255, 255, 255, 0.5)'
const faint = 'rgba(255, 255, 255, 0.4)'
const live = '#34d399'

const field = {
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  fontSize: 12.5,
  outline: 'none',
} as const

const chip = (kind: McpServer['status']) =>
  kind === 'connected'
    ? { color: live, background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)' }
    : kind === 'disabled'
      ? { color: dim, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)' }
      : { color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)' }

/** What a status means, in the words the join actually supports. */
const meaning: Record<McpServer['status'], string> = {
  connected: 'CONNECTED',
  disabled: 'NOT ACTIVATED',
  silent: 'NO TOOLS ANSWERED',
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <SizableText size="$1" color="$faint" style={{ fontSize: 12, color: dim }}>
    {children}
  </SizableText>
)

const Connect = () => {
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [header, setHeader] = useState('')
  const [secret, setSecret] = useState('')

  // The catalog is searched server-side, so what is TYPED and what is ASKED are
  // two values: one request per keystroke would be a request per keystroke.
  useEffect(() => {
    const wait = setTimeout(() => setAsked(query.trim()), 250)
    return () => clearTimeout(wait)
  }, [query])

  const { listings, total, pending, error } = useCatalog(asked)

  return (
    <YStack gap="$4">
      <YStack gap="$1">
        <SizableText size="$4" fontWeight="700" color="$ink">
          Connect an MCP server
        </SizableText>
        <Note>
          Enable a published listing, or point the fleet at an endpoint it can reach over https.
        </Note>
      </YStack>

      <YStack gap="$2">
        <XStack alignItems="center" gap="$2" style={{ ...field, padding: '6px 10px' }}>
          <Search size={13} color={faint} />
          <input
            type="text"
            placeholder="Search the published catalog"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: 12, outline: 'none', width: '100%' }}
          />
        </XStack>

        {error ? (
          <Note>The catalog refused this read: {String((error as Error).message ?? error)}</Note>
        ) : pending && !listings.length ? (
          <Note>Reading the catalog…</Note>
        ) : !listings.length ? (
          <Note>No published listing matches.</Note>
        ) : (
          <>
            <Note>
              {listings.length} of {total} listings
            </Note>
            {listings.map((entry) => (
              <XStack
                key={entry.id}
                alignItems="center"
                justifyContent="space-between"
                gap="$2"
                style={{
                  padding: '9px 11px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                }}
              >
                <YStack flex={1} minWidth={0} gap="$0.5">
                  <XStack alignItems="center" gap="$2">
                    <SizableText size="$2" fontWeight="600" color="$ink" numberOfLines={1}>
                      {entry.title || entry.name || entry.id}
                    </SizableText>
                    {entry.official ? (
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: live }}>OFFICIAL</span>
                    ) : null}
                    {entry.version ? (
                      <span style={{ fontSize: 9.5, color: faint }}>v{entry.version}</span>
                    ) : null}
                  </XStack>
                  {entry.description ? (
                    <SizableText size="$1" color="$faint" numberOfLines={1} style={{ fontSize: 11.5, color: dim }}>
                      {entry.description}
                    </SizableText>
                  ) : null}
                </YStack>
                <button
                  type="button"
                  onClick={() => mcpStore.connect({ listing: entry.id })}
                  className="tap"
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Enable
                </button>
              </XStack>
            ))}
          </>
        )}
      </YStack>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !url.trim()) return
          mcpStore.connect({
            name: name.trim(),
            url: url.trim(),
            ...(header.trim() ? { authHeader: header.trim() } : {}),
            ...(secret ? { secret } : {}),
          })
          setName('')
          setUrl('')
          setHeader('')
          setSecret('')
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <SizableText size="$2" fontWeight="700" color="$ink">
          Or name an endpoint
        </SizableText>
        <input type="text" placeholder="Label for this org" value={name} onChange={(e) => setName(e.target.value)} style={field} />
        <input
          type="text"
          placeholder="https://host/mcp — the JSON-RPC endpoint"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ ...field, color: '#60a5fa', fontFamily: 'monospace', fontSize: 12 }}
        />
        <XStack gap="$2">
          <input
            type="text"
            placeholder="Auth header (optional)"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            style={{ ...field, flex: 1 }}
          />
          <input
            type="password"
            placeholder="Credential (sealed into KMS)"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{ ...field, flex: 1 }}
          />
        </XStack>
        <button
          type="submit"
          className="tap"
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: 8,
            background: '#ffffff',
            border: 'none',
            color: '#000000',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Check size={14} />
          <span>Register</span>
        </button>
      </form>
    </YStack>
  )
}

const Detail = ({ server }: { server: McpServer }) => (
  <>
    <XStack alignItems="center" justifyContent="space-between">
      <YStack gap="$1" flex={1} minWidth={0}>
        <XStack alignItems="center" gap="$2">
          <SizableText size="$4" fontWeight="700" color="$ink">
            {server.name}
          </SizableText>
          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, ...chip(server.status) }}>
            {meaning[server.status]}
          </span>
        </XStack>
        <Note>{server.description ?? server.url}</Note>
        {server.hasSecret ? <Note>A credential is sealed in KMS for this server.</Note> : null}
      </YStack>

      <XStack gap="$2" flexShrink={0}>
        <button
          type="button"
          disabled={!server.tools.length}
          onClick={() => mcpStore.toggleServerStatus(server.id)}
          className="tap"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            background: server.status === 'connected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
            border:
              server.status === 'connected'
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(52, 211, 153, 0.3)',
            color: server.status === 'connected' ? '#f87171' : live,
            fontSize: 12,
            fontWeight: 600,
            cursor: server.tools.length ? 'pointer' : 'not-allowed',
            opacity: server.tools.length ? 1 : 0.4,
          }}
        >
          <Power size={12} />
          <span>{server.status === 'connected' ? 'Deactivate' : 'Activate'}</span>
        </button>
        <button
          type="button"
          onClick={() => mcpStore.disconnect(server.id)}
          className="tap"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: dim,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={12} />
        </button>
      </XStack>
    </XStack>

    <YStack gap="$2">
      <SizableText size="$2" fontWeight="700" color="$ink">
        Tools it contributes ({server.tools.length})
      </SizableText>

      {!server.tools.length ? (
        <Note>Nothing answered tools/list for this registration.</Note>
      ) : (
        server.tools.map((tool) => (
          <XStack
            key={tool.name}
            gap="$2.5"
            alignItems="flex-start"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            <Wrench size={14} color={tool.activated ? live : faint} style={{ marginTop: 2, flexShrink: 0 }} />
            <YStack gap="$0.5" flex={1} minWidth={0}>
              <code style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>
                {tool.name}()
              </code>
              {tool.description ? (
                <SizableText size="$1" color="$faint" style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' }}>
                  {tool.description}
                </SizableText>
              ) : null}
            </YStack>
          </XStack>
        ))
      )}
    </YStack>
  </>
)

export const McpModal = () => {
  const { standing } = useSession()
  const { isOpen, servers, activeServerId, pending, error, problem, busy } = useMcp()
  const [adding, setAdding] = useState(false)

  if (!isOpen) return null

  const active = servers.find((s) => s.id === activeServerId) ?? servers[0]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => mcpStore.close()}
    >
      <YStack
        width="100%"
        maxWidth={840}
        height={580}
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        style={{ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e: any) => e.stopPropagation()}
      >
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderColor="rgba(255, 255, 255, 0.08)"
        >
          <XStack alignItems="center" gap="$2.5">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: live,
              }}
            >
              <Blocks size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                MCP servers
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: dim }}>
                What this org connected, and what its tools may be dispatched for.
              </SizableText>
            </YStack>
          </XStack>

          <XStack alignItems="center" gap="$2">
            <button
              type="button"
              onClick={() => setAdding(!adding)}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                background: adding ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              <span>Connect</span>
            </button>

            <button
              type="button"
              onClick={() => mcpStore.close()}
              style={{ background: 'none', border: 'none', color: dim, cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </XStack>
        </XStack>

        {problem ? (
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderBottomWidth={1}
            borderColor="rgba(239, 68, 68, 0.25)"
            backgroundColor="rgba(239, 68, 68, 0.08)"
          >
            <SizableText size="$1" style={{ fontSize: 11.5, color: '#f87171' }}>
              {problem}
            </SizableText>
          </XStack>
        ) : null}

        <XStack flex={1} minHeight={0}>
          <YStack
            width={280}
            borderRightWidth={1}
            borderColor="rgba(255, 255, 255, 0.08)"
            backgroundColor="rgba(255, 255, 255, 0.01)"
            padding="$2.5"
            gap="$1.5"
            style={{ overflowY: 'auto' }}
          >
            {servers.map((s) => {
              const selected = s.id === active?.id && !adding
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    mcpStore.selectServer(s.id)
                    setAdding(false)
                  }}
                  className="tap"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: selected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: selected ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <YStack flex={1} minWidth={0}>
                    <SizableText size="$1" fontWeight="600" color="$ink" numberOfLines={1}>
                      {s.name}
                    </SizableText>
                    <SizableText size="$1" color="$faint" style={{ fontSize: 10.5 }}>
                      {s.toolsCount} tools{s.version ? ` • v${s.version}` : ''}
                    </SizableText>
                  </YStack>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 9999,
                      background: s.status === 'connected' ? live : 'rgba(255, 255, 255, 0.2)',
                      boxShadow: s.status === 'connected' ? `0 0 6px ${live}` : 'none',
                    }}
                  />
                </button>
              )
            })}
          </YStack>

          <YStack flex={1} minHeight={0} padding="$4" gap="$4" style={{ overflowY: 'auto', opacity: busy ? 0.6 : 1 }}>
            {standing !== 'live' ? (
              <YStack gap="$2">
                <Note>Only a signed-in caller can read an org's MCP servers.</Note>
                <button
                  type="button"
                  onClick={() => requireLogin('anonymous')}
                  className="tap"
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Sign in
                </button>
              </YStack>
            ) : adding ? (
              <Connect />
            ) : error ? (
              <Note>The server refused this read: {String((error as Error).message ?? error)}</Note>
            ) : pending && !servers.length ? (
              <Note>Reading the org's servers…</Note>
            ) : active ? (
              <Detail server={active} />
            ) : (
              <Note>This org has connected no MCP server. Press Connect to register one.</Note>
            )}
          </YStack>
        </XStack>
      </YStack>
    </div>
  )
}
