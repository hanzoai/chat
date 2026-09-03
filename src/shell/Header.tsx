import { Header as Bar } from '@hanzo/ui/chat'
import {
  Columns2,
  Hash,
  Keyboard,
  Layers,
  Layout,
  Maximize2,
  Menu,
  Palette,
  PanelRight,
  Share2,
} from '@hanzogui/lucide-icons-2'
import { XStack } from '@hanzo/ui'
import { useEffect, useState } from 'react'

import { PresenceStack } from '../presence/PresenceStack'
import { artifactStore, useArtifact } from '../artifact/store'
import { useChannels } from '../channels/store'
import { exportStore } from '../thread/exportStore'
import { shortcutsStore } from '../shortcuts/store'
import { themeCustomizerStore } from '../theme/store'

export interface HeaderProps {
  title: string
  rail: boolean
  onRail: () => void
}

export const Header = ({ title, rail, onRail }: HeaderProps) => {
  const artifact = useArtifact()
  const { rooms, selected } = useChannels()
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)

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

  const displayTitle = activeRoom ? `#${activeRoom.roomId} (${activeRoom.channel})` : title

  return (
    <Bar
      title={displayTitle}
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
      <XStack alignItems="center" gap="$1.5" style={{ position: 'relative' }}>
        <PresenceStack />

        {/* Theme Customizer Trigger */}
        <button
          type="button"
          data-testid="header-theme-toggle"
          onClick={() => themeCustomizerStore.open()}
          className="tap"
          title="Customize Theme & Liquid Glass"
          style={{
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
          }}
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
          style={{
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
          }}
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
          style={{
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
          }}
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
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 80,
              width: 170,
              borderRadius: 12,
              background: 'rgba(18, 18, 22, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 100,
            }}
          >
            <button
              type="button"
              onClick={() => {
                artifactStore.setLayoutMode('default')
                setLayoutMenuOpen(false)
              }}
              className="tap"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: artifact.layoutMode === 'default' ? 'rgba(52, 211, 153, 0.15)' : 'none',
                border: 'none',
                color: artifact.layoutMode === 'default' ? '#34d399' : '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: artifact.layoutMode === 'split' ? 'rgba(52, 211, 153, 0.15)' : 'none',
                border: 'none',
                color: artifact.layoutMode === 'split' ? '#34d399' : '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: artifact.layoutMode === 'studio' ? 'rgba(52, 211, 153, 0.15)' : 'none',
                border: 'none',
                color: artifact.layoutMode === 'studio' ? '#34d399' : '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: artifact.layoutMode === 'focus' ? 'rgba(52, 211, 153, 0.15)' : 'none',
                border: 'none',
                color: artifact.layoutMode === 'focus' ? '#34d399' : '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
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
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 7,
            background: artifact.isOpen ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: artifact.isOpen ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
            color: artifact.isOpen ? '#34d399' : 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <PanelRight size={15} />
        </button>
      </XStack>
    </Bar>
  )
}
