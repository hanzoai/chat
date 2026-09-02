import { useEffect } from 'react'
import { Keyboard, X } from '@hanzogui/lucide-icons-2'
import { shortcutsStore, useShortcuts } from './store'

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  title: string
  items: ShortcutItem[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'General & Navigation',
    items: [
      { keys: ['⌘', 'K'], description: 'Open Command Palette' },
      { keys: ['⌘', '/'], description: 'Open Keyboard Shortcuts' },
      { keys: ['⌘', '\\'], description: 'Toggle Conversations Rail' },
      { keys: ['⌘', 'J'], description: 'Toggle Code / Inspector Canvas' },
      { keys: ['⌘', 'I'], description: 'Toggle Swarm Intelligence Dock' },
    ],
  },
  {
    title: 'Multi-Agent Swarm & Workspace',
    items: [
      { keys: ['⌘', 'U'], description: 'Create / Configure Custom Agent' },
      { keys: ['⌘', 'M'], description: 'Open MCP Connectors Hub' },
      { keys: ['⌘', 'B'], description: 'Open Sprint Boards & Kanban' },
      { keys: ['⌘', 'T'], description: 'Open Durable Task Queue' },
      { keys: ['⌘', '.'], description: 'Start Live Duplex Agent Voice Call' },
    ],
  },
  {
    title: 'Composer & Chat',
    items: [
      { keys: ['Enter'], description: 'Send Message' },
      { keys: ['Shift', 'Enter'], description: 'Insert Newline' },
      { keys: ['@'], description: 'Mention / Assign Agent in Prompt' },
      { keys: ['Esc'], description: 'Close Modals & Focus Composer' },
    ],
  },
]

export const ShortcutsModal = () => {
  const { isOpen } = useShortcuts()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') shortcutsStore.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => shortcutsStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          backgroundColor: '#0e0e12',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="shortcuts-modal"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(52, 211, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <Keyboard size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Keyboard Shortcuts
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Master keyboard productivity in Hanzo Chat
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => shortcutsStore.close()}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Categories List */}
        <div
          style={{
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {category.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.85)' }}>
                      {item.description}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 22,
                            padding: '2px 6px',
                            borderRadius: 5,
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
