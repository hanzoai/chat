/**
 * Plugins & Extensions Marketplace Modal.
 * Supports browsing, 1-click install, and toggling tools/extensions.
 */
import {
  Blocks,
  Check,
  Database,
  Download,
  GitPullRequest,
  Search,
  Shield,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { pluginsStore, usePlugins } from './store'

export const PluginsModal = () => {
  const { isOpen, plugins } = usePlugins()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  if (!isOpen) return null

  const filtered = plugins.filter((p) => {
    const matchesFilter = filter === 'all' || p.category === filter || (filter === 'installed' && p.installed)
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

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
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Plugins & Extensions Marketplace
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Extend chat agents with CI/CD hooks, database indexes, and cloud runtime tools.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => pluginsStore.close()}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            gap: 12,
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'installed', label: 'Installed' },
              { id: 'devtools', label: 'DevTools' },
              { id: 'database', label: 'Databases' },
              { id: 'security', label: 'Security' },
              { id: 'cloud', label: 'Cloud' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className="tap"
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: filter === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border: filter === tab.id ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                  color: filter === tab.id ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
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
            <Search size={13} color="rgba(255, 255, 255, 0.4)" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: 12,
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Plugins Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((plugin) => (
            <div
              key={plugin.id}
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: plugin.enabled ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a78bfa',
                      }}
                    >
                      {plugin.category === 'devtools' ? (
                        <GitPullRequest size={16} />
                      ) : plugin.category === 'database' ? (
                        <Database size={16} />
                      ) : plugin.category === 'security' ? (
                        <Shield size={16} />
                      ) : (
                        <Zap size={16} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{plugin.name}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                        v{plugin.version} by {plugin.author}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                  {plugin.description}
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                  <span>⭐ {plugin.rating}</span>
                  <span>📥 {plugin.downloads}</span>
                </div>

                {plugin.installed ? (
                  <button
                    type="button"
                    onClick={() => pluginsStore.toggleEnable(plugin.id)}
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: plugin.enabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      border: plugin.enabled ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: plugin.enabled ? '#34d399' : 'rgba(255, 255, 255, 0.5)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {plugin.enabled ? <Check size={12} /> : null}
                    <span>{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => pluginsStore.toggleInstall(plugin.id)}
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: 'none',
                      color: '#000000',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={12} />
                    <span>Install</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
