import { Header as Bar } from '@hanzo/ui/chat'
import {
  Columns2,
  Ellipsis,
  Hash,
  Keyboard,
  Layers,
  Layout,
  Maximize2,
  Menu,
  Palette,
  PanelRight,
  Share2,
  Terminal,
  Users,
} from '@hanzogui/lucide-icons-2'
import { XStack } from '@hanzo/ui'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { team } from '../brand.ts'
import { useNarrow } from '../gui.ts'
import { PresenceStack } from '../presence/PresenceStack.tsx'
import { multiplayerStore } from '../presence/store.ts'
import { artifactStore, useArtifact } from '../artifact/store.ts'
import { useChannels } from '../channels/store.ts'
import { terminalStore, useTerminal } from '../terminal/store.ts'
import { exportStore } from '../thread/exportStore.ts'
import { shortcutsStore } from '../shortcuts/store.ts'
import { themeCustomizerStore } from '../theme/store.ts'

export interface HeaderProps {
  title: string
  rail: boolean
  onRail: () => void
}

const ICON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 7,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.75)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const MENU: CSSProperties = {
  position: 'absolute',
  top: 40,
  borderRadius: 12,
  background: 'rgba(18, 18, 22, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(20px)',
  padding: 6,
  display: 'grid',
  alignContent: 'start',
  gap: 2,
  zIndex: 100,
}

const item = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderRadius: 6,
  background: active ? 'rgba(52, 211, 153, 0.15)' : 'none',
  border: 'none',
  color: active ? '#34d399' : '#ffffff',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
})

/**
 * The workspace toolbar, folded for a phone.
 *
 * Seven controls and a title do not fit 390px, so below the rail's breakpoint
 * the ones a phone uses go behind this one button. The rest are not offered:
 * the shortcut sheet wants a keyboard, and the layouts and the inspector are
 * columns beside the thread, which `useNarrow` says a phone has no room for.
 */
const More = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const terminal = useTerminal().isOpen

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const pick = (act: () => void) => () => {
    setOpen(false)
    act()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        data-testid="header-more-toggle"
        onClick={() => setOpen(!open)}
        className="tap"
        title="More"
        aria-label="More"
        aria-expanded={open}
        style={{ ...ICON, background: open ? 'rgba(255, 255, 255, 0.1)' : ICON.background }}
      >
        <Ellipsis size={15} />
      </button>

      {open && (
        <div data-testid="header-more-menu" role="menu" style={{ ...MENU, right: 0, width: 190 }}>
          <button type="button" role="menuitem" onClick={pick(() => terminalStore.toggle())} className="tap" style={item(terminal)}>
            <Terminal size={13} />
            <span>Terminal</span>
          </button>
          <button type="button" role="menuitem" onClick={pick(() => multiplayerStore.openInvite())} className="tap" style={item(false)}>
            <Users size={13} />
            <span>Team</span>
          </button>
          <button type="button" role="menuitem" onClick={pick(() => themeCustomizerStore.open())} className="tap" style={item(false)}>
            <Palette size={13} />
            <span>Theme</span>
          </button>
          <button type="button" role="menuitem" onClick={pick(() => exportStore.open())} className="tap" style={item(false)}>
            <Share2 size={13} />
            <span>Export or fork</span>
          </button>
        </div>
      )}
    </div>
  )
}

export const Header = ({ title, rail, onRail }: HeaderProps) => {
  const artifact = useArtifact()
  const { rooms, selected } = useChannels()
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)
  // Only the workspace outgrows a phone: the chat's five icons fit beside its title.
  const narrow = useNarrow()
  const fold = team && narrow

  const activeRoom = rooms.find((r) => r.key === selected)

  // Global keydown handler for productivity shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        shortcutsStore.toggle()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        artifactStore.toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Bar
      title={title}
      leading={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!rail && (
            <button
              type="button"
              data-testid="header-rail-toggle"
              onClick={onRail}
              className="tap"
              title="Show conversations (3-line menu)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.85)',
                cursor: 'pointer',
              }}
            >
              <Menu size={16} />
            </button>
          )}
          {activeRoom && (
            <Hash size={16} style={{ color: '#34d399', flexShrink: 0 }} />
          )}
        </div>
      }
    >
      {fold ? (
        <More />
      ) : (
        <XStack alignItems="center" gap="$1.5" style={{ position: 'relative' }}>
          {team && <PresenceStack />}

          {/* Theme Customizer Trigger */}
          <button
            type="button"
            data-testid="header-theme-toggle"
            onClick={() => themeCustomizerStore.open()}
            className="tap"
            title="Customize Theme & Liquid Glass"
            style={ICON}
          >
            <Palette size={14} />
          </button>

          {/* Export & Fork Trigger */}
          <button
            type="button"
            data-testid="header-export-toggle"
            onClick={() => exportStore.open()}
            className="tap"
            title="Export Markdown/JSON or Fork Thread"
            style={ICON}
          >
            <Share2 size={14} />
          </button>

          {/* Shortcuts Trigger */}
          <button
            type="button"
            data-testid="header-shortcuts-toggle"
            onClick={() => shortcutsStore.open()}
            className="tap"
            title="Keyboard Shortcuts Cheatsheet (⌘/)"
            style={ICON}
          >
            <Keyboard size={14} />
          </button>

          {/* Layout Switcher Trigger */}
          <button
            type="button"
            data-testid="header-layout-toggle"
            onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
            className="tap"
            title="Switch Workspace Layout"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 8px',
              height: 32,
              borderRadius: 7,
              background: layoutMenuOpen ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Layout size={14} />
            <span>Layout</span>
          </button>

          {/* Layout Switcher Dropdown */}
          {layoutMenuOpen && (
            <div style={{ ...MENU, right: 80, width: 170 }}>
              <button
                type="button"
                onClick={() => {
                  artifactStore.setLayoutMode('default')
                  setLayoutMenuOpen(false)
                }}
                className="tap"
                style={item(artifact.layoutMode === 'default')}
              >
                <Layout size={13} />
                <span>Standard Chat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  artifactStore.setLayoutMode('split')
                  setLayoutMenuOpen(false)
                }}
                className="tap"
                style={item(artifact.layoutMode === 'split')}
              >
                <Columns2 size={13} />
                <span>Split Inspector</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  artifactStore.setLayoutMode('studio')
                  setLayoutMenuOpen(false)
                }}
                className="tap"
                style={item(artifact.layoutMode === 'studio')}
              >
                <Layers size={13} />
                <span>Studio 3-Pane</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  artifactStore.setLayoutMode('focus')
                  setLayoutMenuOpen(false)
                }}
                className="tap"
                style={item(artifact.layoutMode === 'focus')}
              >
                <Maximize2 size={13} />
                <span>Focus Mode</span>
              </button>
            </div>
          )}

          {/* Inspector & Artifacts Panel Toggle */}
          <button
            type="button"
            data-testid="header-inspector-toggle"
            onClick={() => artifactStore.toggle()}
            className="tap"
            title={artifact.isOpen ? 'Hide Inspector & Artifacts (⌘J)' : 'Show Inspector & Artifacts (⌘J)'}
            style={{
              ...ICON,
              background: artifact.isOpen ? 'rgba(52, 211, 153, 0.15)' : ICON.background,
              border: artifact.isOpen ? '1px solid rgba(52, 211, 153, 0.35)' : ICON.border,
              color: artifact.isOpen ? '#34d399' : ICON.color,
            }}
          >
            <PanelRight size={15} />
          </button>
        </XStack>
      )}
    </Bar>
  )
}
