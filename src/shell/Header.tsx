import { Header as Bar } from '@hanzo/ui/chat'
import {
  Activity,
  Columns2,
  FileText,
  Globe,
  Hash,
  Keyboard,
  Layers,
  Layout,
  Maximize2,
  Menu,
  Palette,
  PanelRight,
  PhoneCall,
  Radio,
  Share2,
} from '@hanzogui/lucide-icons-2'
import { XStack } from '@hanzo/ui'
import { useEffect, useState } from 'react'

import { PresenceStack } from '~/presence/PresenceStack'
import { artifactStore, useArtifact } from '~/artifact/store'
import { useChannels } from '~/channels/store'
import { exportStore } from '~/thread/exportStore'
import { liveVoiceStore } from '~/voice/store'
import { shortcutsStore } from '~/shortcuts/store'
import { themeCustomizerStore } from '~/theme/store'

export interface HeaderProps {
  title: string
  rail: boolean
  onRail: () => void
}

export const Header = ({ title, rail, onRail }: HeaderProps) => {
  const artifact = useArtifact()
  const { rooms, activeRoomId } = useChannels()
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)

  const activeRoom = rooms.find((r) => r.id === activeRoomId)
  const isGlobal = activeRoom?.scope === 'global'

  // Global keydown handler for productivity shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        shortcutsStore.toggle()
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        liveVoiceStore.open()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        artifactStore.toggle()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        artifactStore.toggleIntelligence()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const displayTitle = activeRoom?.name ? `#${activeRoom.name}` : title

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
          {activeRoom?.type === 'channel' && (
            <Hash size={16} style={{ color: isGlobal ? '#60a5fa' : '#34d399', flexShrink: 0 }} />
          )}
          {activeRoom?.scope === 'global' && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(96, 165, 250, 0.15)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                color: '#60a5fa',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
              }}
            >
              <Globe size={9} />
              <span>GLOBAL</span>
            </span>
          )}
          {activeRoom?.liveCallActive && (
            <button
              type="button"
              onClick={() => liveVoiceStore.open()}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#34d399',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Radio size={10} />
              <span>LIVE CALL</span>
            </button>
          )}
        </div>
      }
    >
      <XStack alignItems="center" gap="$1.5" style={{ position: 'relative' }}>
        <PresenceStack />

        {/* Live Call Trigger */}
        <button
          type="button"
          data-testid="header-voice-call-toggle"
          onClick={() => liveVoiceStore.open()}
          className="tap"
          title="Start / Join Live Duplex Call with AI Agents (⌘.)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 8px',
            height: 32,
            borderRadius: 7,
            background: activeRoom?.liveCallActive ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.12)',
            border: activeRoom?.liveCallActive ? '1px solid #34d399' : '1px solid rgba(52, 211, 153, 0.3)',
            color: '#34d399',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <PhoneCall size={13} />
          <span style={{ display: 'none', md: { display: 'inline' } } as any}>Live Call</span>
        </button>

        {/* Channel Notes Quick Toggle */}
        <button
          type="button"
          data-testid="header-notes-toggle"
          onClick={() => {
            if (!artifact.isIntelligenceOpen) {
              artifactStore.toggleIntelligence()
            }
          }}
          className="tap"
          title="Channel Scratchpad & Collaborative Notes"
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
          <FileText size={14} />
        </button>

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

        {/* Workspace Hub & Intelligence Far-Right Dock Toggle */}
        <button
          type="button"
          data-testid="header-dock-toggle"
          onClick={() => artifactStore.toggleIntelligence()}
          className="tap"
          title={artifact.isIntelligenceOpen ? 'Hide Workspace Hub (⌘I)' : 'Show Workspace Hub (⌘I)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 7,
            background: artifact.isIntelligenceOpen ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: artifact.isIntelligenceOpen ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            color: artifact.isIntelligenceOpen ? '#60a5fa' : 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Activity size={15} />
        </button>
      </XStack>
    </Bar>
  )
}
