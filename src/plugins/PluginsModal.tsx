/**
 * What this deployment mounted, as the deployment reports it.
 *
 * One route answers the whole screen: `GET /v1/tools/plugins?all=true`, whose
 * rows carry a name, an enabled flag and the URL prefixes each subsystem serves.
 * The search filters what that read returned; there is no category, because a
 * mount has no category, and no Install, because mounting is a property of the
 * running deployment and no route lets a reader change it.
 */
import { Blocks, Search, X } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { requireLogin } from '../data/gate.ts'
import { useSession } from '../data/session.tsx'
import { pluginsStore, usePlugins } from './store.ts'

const dim = 'rgba(255, 255, 255, 0.5)'
const faint = 'rgba(255, 255, 255, 0.4)'
const live = '#34d399'

const Note = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12, color: dim, gridColumn: '1 / -1' }}>{children}</div>
)

export const PluginsModal = () => {
  const { standing } = useSession()
  const { isOpen, plugins, pending, error } = usePlugins()
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const term = search.trim().toLowerCase()
  const shown = term
    ? plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.prefixes ?? []).some((prefix) => prefix.toLowerCase().includes(term)),
      )
    : plugins

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
      onClick={() => pluginsStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          height: 600,
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#0c0c0e',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'grid'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Blocks size={18} color="#a78bfa" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Mounted plugins</div>
              <div style={{ fontSize: 11.5, color: dim }}>
                Every subsystem this deployment declared, and the paths it answers.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                width: 220,
              }}
            >
              <Search size={13} color={faint} />
              <input
                type="text"
                placeholder="Filter by name or path"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: 12, outline: 'none', width: '100%' }}
              />
            </div>

            <button
              type="button"
              onClick={() => pluginsStore.close()}
              style={{ background: 'none', border: 'none', color: dim, cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
            alignContent: 'start',
          }}
        >
          {standing !== 'live' ? (
            <Note>
              Only a signed-in caller can read what this deployment mounted.{' '}
              <button
                type="button"
                onClick={() => requireLogin('anonymous')}
                className="tap"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign in
              </button>
            </Note>
          ) : error ? (
            <Note>The server refused this read: {String((error as Error).message ?? error)}</Note>
          ) : pending && !plugins.length ? (
            <Note>Reading what this deployment mounted…</Note>
          ) : !shown.length ? (
            <Note>{plugins.length ? 'No mount matches.' : 'This deployment mounts nothing.'}</Note>
          ) : (
            shown.map((plugin) => (
              <div
                key={plugin.name}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: plugin.enabled ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'grid',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{plugin.name}</div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: plugin.enabled ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                      color: plugin.enabled ? live : faint,
                    }}
                  >
                    {plugin.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(plugin.prefixes ?? []).length ? (
                    (plugin.prefixes ?? []).map((prefix) => (
                      <code
                        key={prefix}
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: '#60a5fa',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(96, 165, 250, 0.08)',
                        }}
                      >
                        {prefix}
                      </code>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: faint }}>Serves no path of its own.</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
