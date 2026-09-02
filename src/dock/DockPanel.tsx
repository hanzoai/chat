/**
 * Far-Right Dock: Channel Explorer (Global vs Org), Agents Browser,
 * Collaborative Channel Notes & Live AI Note Taker, and Member Roster.
 */
import {
  Bot,
  Compass,
  FileText,
  Globe,
  Hash,
  Lock,
  Mic,
  PhoneCall,
  Radio,
  Sparkles,
  UserPlus,
  Users,
  X,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useRef, useState } from 'react'

import { AGENT_ROSTER } from '~/agents/types'
import { artifactStore, useArtifact } from '~/artifact/store'
import { channelsStore, useChannels } from '~/channels/store'
import { liveVoiceStore } from '~/voice/store'
import { multiplayerStore } from '~/presence/store'

export type DockTab = 'channels' | 'agents' | 'notes' | 'members'

export const DockPanel = () => {
  const artifact = useArtifact()
  const { isIntelligenceOpen } = artifact
  const { rooms, activeRoomId, discoverableChannels } = useChannels()

  const [activeTab, setActiveTab] = useState<DockTab>('channels')
  const [channelFilter, setChannelFilter] = useState<'all' | 'global' | 'org'>('all')
  const [width, setWidth] = useState(380)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(380)

  if (!isIntelligenceOpen) return null

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0]

  const onMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startX.current - moveEvent.clientX
      const nextWidth = Math.min(650, Math.max(300, startWidth.current + delta))
      setWidth(nextWidth)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Filter channels for explorer
  const filteredChannels = discoverableChannels.filter((c) => {
    if (channelFilter === 'global') return c.scope === 'global'
    if (channelFilter === 'org') return c.scope === 'org'
    return true
  })

  const handleSummarizeNotes = () => {
    if (!activeRoom) return
    const current = activeRoom.notes || ''
    const summary = `${current}\n\n### ✨ AI Action Items (Extracted)\n- [ ] Deploy Next.js 16 + React 19 app container to local k3s\n- [ ] Configure ZAP binary zero-allocation transport endpoint\n- [ ] Publish reusable @hanzo/ui shared modules across worktrees`
    channelsStore.updateNotes(activeRoom.id, summary)
  }

  return (
    <YStack
      width={width}
      height="100%"
      borderLeftWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
      backgroundColor="#0a0a0d"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 25,
        boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
      }}
      data-testid="dock-panel"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={onMouseDownResizer}
        style={{
          position: 'absolute',
          top: 0,
          left: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Drag to resize dock"
      >
        <div style={{ width: 2, height: 28, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      </div>

      {/* Dock Header */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3.5"
        paddingVertical="$2.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="rgba(255, 255, 255, 0.02)"
      >
        <XStack alignItems="center" gap="$2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(96, 165, 250, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <Compass size={13} />
          </div>
          <SizableText size="$2" fontWeight="700" color="$ink">
            Workspace Hub
          </SizableText>
        </XStack>

        <button
          type="button"
          onClick={() => artifactStore.closeIntelligence()}
          className="tap"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
          }}
          title="Close dock"
        >
          <X size={13} />
        </button>
      </XStack>

      {/* 4 Navigation Tabs */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$2"
        paddingVertical="$1.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.06)"
        backgroundColor="rgba(0, 0, 0, 0.3)"
      >
        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className="tap"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            borderRadius: 6,
            background: activeTab === 'channels' ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
            border: 'none',
            color: activeTab === 'channels' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Globe size={12} />
          <span>Channels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          className="tap"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            borderRadius: 6,
            background: activeTab === 'agents' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
            border: 'none',
            color: activeTab === 'agents' ? '#34d399' : 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Bot size={12} />
          <span>Agents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className="tap"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            borderRadius: 6,
            background: activeTab === 'notes' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
            border: 'none',
            color: activeTab === 'notes' ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <FileText size={12} />
          <span>Notes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className="tap"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 4px',
            borderRadius: 6,
            background: activeTab === 'members' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none',
            color: activeTab === 'members' ? '#c084fc' : 'rgba(255, 255, 255, 0.6)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Users size={12} />
          <span>Members</span>
        </button>
      </XStack>

      {/* Dock Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* TAB 1: Channel Explorer */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Scope Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setChannelFilter('all')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: channelFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: channelFilter === 'all' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('global')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: channelFilter === 'global' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  color: channelFilter === 'global' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Globe size={10} />
                <span>Hanzo Public</span>
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('org')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: channelFilter === 'org' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  color: channelFilter === 'org' ? '#34d399' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Lock size={10} />
                <span>Acme Org</span>
              </button>
            </div>

            {/* Channels List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredChannels.map((chan) => {
                const isActive = activeRoomId === chan.id
                const isFollowing = rooms.some((r) => r.id === chan.id)

                return (
                  <div
                    key={chan.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isActive ? 'rgba(96, 165, 250, 0.12)' : 'rgba(255, 255, 255, 0.025)',
                      border: isActive ? '1px solid rgba(96, 165, 250, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Hash size={13} style={{ color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)' }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>
                          {chan.name}
                        </span>
                        {chan.scope === 'global' ? (
                          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', fontWeight: 700 }}>
                            GLOBAL
                          </span>
                        ) : (
                          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                            ORG
                          </span>
                        )}
                      </div>

                      {chan.liveCallActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 10, fontWeight: 700 }}>
                          <Radio size={11} />
                          <span>LIVE CALL</span>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                      {chan.topic}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                        👥 {chan.memberCount} members
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isFollowing ? (
                          <button
                            type="button"
                            onClick={() => channelsStore.setActiveRoom(chan.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 5,
                              background: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: 10.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isActive ? 'Chatting' : 'Open'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => channelsStore.toggleFollowChannel(chan.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 5,
                              background: '#34d399',
                              border: 'none',
                              color: '#000000',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Agents Browser */}
        {activeTab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                      }}
                    >
                      <Bot size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{agent.name}</div>
                      <div style={{ fontSize: 10.5, color: '#34d399', fontWeight: 600 }}>{agent.role}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(52, 211, 153, 0.12)',
                      color: '#34d399',
                      fontWeight: 600,
                    }}
                  >
                    Online
                  </span>
                </div>

                <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                  {agent.role}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: 9.5,
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.65)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      channelsStore.setActiveRoom(`dm-${agent.name.replace('@', '')}`)
                    }}
                    style={{
                      flex: 1,
                      padding: '5px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Direct Message
                  </button>
                  <button
                    type="button"
                    onClick={() => liveVoiceStore.open()}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      background: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      color: '#34d399',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PhoneCall size={11} />
                    <span>Call</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Per-Channel Notes & Live AI Note Taker */}
        {activeTab === 'notes' && activeRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                  #{activeRoom.name} Scratchpad
                </span>
              </div>

              <button
                type="button"
                onClick={handleSummarizeNotes}
                className="tap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={11} />
                <span>AI Action Items</span>
              </button>
            </div>

            {/* Editable Notes Buffer */}
            <textarea
              value={activeRoom.notes || ''}
              onChange={(e) => channelsStore.updateNotes(activeRoom.id, e.target.value)}
              placeholder="Write collaborative notes, action items, or live meeting minutes for this channel..."
              style={{
                width: '100%',
                minHeight: 280,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '12px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 12,
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Live Meeting Note Taker Status */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={14} style={{ color: '#34d399' }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#34d399' }}>
                    AI Note Taker Active
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Transcribes live calls into channel notes
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => liveVoiceStore.open()}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: '#34d399',
                  border: 'none',
                  color: '#000000',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Join Call
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Channel Members & Presence */}
        {activeTab === 'members' && activeRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                Channel Members ({activeRoom.members.length + 1})
              </span>
              <button
                type="button"
                onClick={() => multiplayerStore.openInvite()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={12} />
                <span>+ Invite</span>
              </button>
            </div>

            {/* Members Roster */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Current User */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 9999,
                      background: '#34d399',
                      color: '#000000',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Y
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>You (Host)</div>
                    <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' }}>Online • Tokyo</div>
                  </div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#34d399' }} />
              </div>

              {/* Assigned Agents & Bots */}
              {activeRoom.members.map((mId) => {
                const agent = AGENT_ROSTER.find((a) => a.id === mId)
                const name = agent ? agent.name : mId

                return (
                  <div
                    key={mId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'rgba(96, 165, 250, 0.15)',
                          color: '#60a5fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Bot size={13} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{name}</div>
                        <div style={{ fontSize: 10, color: '#60a5fa' }}>AI Autonomous Agent</div>
                      </div>
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#60a5fa' }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </YStack>
  )
}
