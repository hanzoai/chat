/**
 * Unified Micro-Apps Suite Workspace Modal:
 * - tasks.hanzo.ai
 * - todo.hanzo.ai & notes.hanzo.ai
 * - meet.hanzo.ai
 * - zt.hanzo.ai (Zero-Trust Local Cloudflare / WireGuard Tunnel)
 */
import {
  Bot,
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  ListTodo,
  Mic,
  Plus,
  Shield,
  Video,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { workspaceAppsStore, useWorkspaceApps } from './store'
import type { WorkspaceAppId } from './types'

export const AppWorkspaceModal = () => {
  const { isOpen, activeApp, notes, activeNoteId, todos, meeting, tunnel } = useWorkspaceApps()
  const [newTodoText, setNewTodoText] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0]

  const handleCopyTunnel = () => {
    if (tunnel.tunnelUrl) {
      void navigator.clipboard.writeText(tunnel.tunnelUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodoText.trim()) {
      workspaceAppsStore.addTodo(newTodoText.trim(), '@dev')
      setNewTodoText('')
    }
  }

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
      onClick={() => workspaceAppsStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 980,
          height: 640,
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
        {/* Header & App Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'tasks', label: 'tasks.hanzo.ai', icon: ListTodo, color: '#34d399' },
              { id: 'notes', label: 'notes.hanzo.ai', icon: FileText, color: '#60a5fa' },
              { id: 'todo', label: 'todo.hanzo.ai', icon: CheckSquare, color: '#a78bfa' },
              { id: 'meet', label: 'meet.hanzo.ai', icon: Video, color: '#f87171' },
              { id: 'tunnel', label: 'zt.hanzo.ai (Zero-Trust)', icon: Shield, color: '#fbbf24' },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeApp === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => workspaceAppsStore.setActiveApp(tab.id as WorkspaceAppId)}
                  className="tap"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 11px',
                    borderRadius: 8,
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: isActive
                      ? '1px solid rgba(255, 255, 255, 0.15)'
                      : '1px solid transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <Icon size={13} color={isActive ? tab.color : 'rgba(255, 255, 255, 0.4)'} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => workspaceAppsStore.close()}
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

        {/* Tab Content Panes */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* 1. TASKS.HANZO.AI */}
          {activeApp === 'tasks' && (
            <div style={{ flex: 1, display: 'flex', padding: 18, gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                      tasks.hanzo.ai — Distributed Workflow Engine
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                      Durable state machine, async agent background dispatch, and DAG task execution.
                    </div>
                  </div>
                  <a
                    href="https://tasks.hanzo.ai"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#34d399',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open Standalone</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#050507',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
                    Active Workflow DAGs
                  </div>
                  {[
                    { name: 'CI/CD Multi-Target Compilation', status: 'Running', duration: '12s', agent: '@dev' },
                    { name: 'KMS Hardware Enclave Key Rotation', status: 'Passed', duration: '4s', agent: '@cyber' },
                    { name: 'ZAP High-Throughput Stream Benchmark', status: 'Queued', duration: '--', agent: '@opera' },
                  ].map((dag) => (
                    <div
                      key={dag.name}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Zap size={14} color="#34d399" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{dag.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                            Assigned: <strong style={{ color: '#a78bfa' }}>{dag.agent}</strong> • Duration: {dag.duration}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background:
                            dag.status === 'Passed'
                              ? 'rgba(52, 211, 153, 0.15)'
                              : dag.status === 'Running'
                              ? 'rgba(96, 165, 250, 0.15)'
                              : 'rgba(255, 255, 255, 0.06)',
                          color:
                            dag.status === 'Passed'
                              ? '#34d399'
                              : dag.status === 'Running'
                              ? '#60a5fa'
                              : 'rgba(255, 255, 255, 0.5)',
                        }}
                      >
                        {dag.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. NOTES.HANZO.AI */}
          {activeApp === 'notes' && (
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {/* Notes Sidebar */}
              <div
                style={{
                  width: 240,
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>
                    Notes ({notes.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => workspaceAppsStore.addNote()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notes.map((note) => {
                    const isSelected = note.id === activeNote?.id
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => workspaceAppsStore.selectNote(note.id)}
                        className="tap"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                          color: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{note.title}</div>
                        <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>{note.updatedAt}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Note Editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    {activeNote?.title}
                  </div>
                  <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    Live AI Co-Authoring Active
                  </span>
                </div>

                <textarea
                  value={activeNote?.content || ''}
                  onChange={(e) => activeNote && workspaceAppsStore.updateNoteContent(activeNote.id, e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* 3. TODO.HANZO.AI */}
          {activeApp === 'todo' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    todo.hanzo.ai — Collaborative Checklist
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Track deliverables and delegate tasks to AI agents.
                  </div>
                </div>
              </div>

              {/* Add Todo Input */}
              <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Add a new checklist action..."
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="tap"
                  style={{
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
                  Add Item
                </button>
              </form>

              {/* Todos List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => workspaceAppsStore.toggleTodo(todo.id)}
                    className="tap"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: todo.completed ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: todo.completed ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.3)',
                          background: todo.completed ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#34d399',
                        }}
                      >
                        {todo.completed && <Check size={12} />}
                      </div>

                      <span
                        style={{
                          fontSize: 13,
                          color: todo.completed ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
                          textDecoration: todo.completed ? 'line-through' : 'none',
                        }}
                      >
                        {todo.text}
                      </span>
                    </div>

                    {todo.assignedAgent && (
                      <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                        {todo.assignedAgent}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. MEET.HANZO.AI */}
          {activeApp === 'meet' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 9999,
                      background: '#ef4444',
                      boxShadow: '0 0 8px #ef4444',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                      meet.hanzo.ai — #{meeting.roomName}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                      WebRTC encrypted audio/video room with AI transcription agent.
                    </div>
                  </div>
                </div>

                {/* Meet Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Mic size={13} />
                    <span>Mute</span>
                  </button>
                  <button
                    type="button"
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Video size={13} />
                    <span>Camera</span>
                  </button>
                </div>
              </div>

              {/* Video Grid & Transcript Split */}
              <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
                {/* Participants Grid */}
                <div
                  style={{
                    flex: 1.2,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {meeting.activeParticipants.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 9999,
                          background: p.isAgent ? 'linear-gradient(135deg, #818cf8, #34d399)' : 'rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {p.isAgent ? <Bot size={20} /> : p.name[0]}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#ffffff' }}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Live Speech-to-Text Transcript */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#050507',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                    Live AI Transcript & Notes
                  </div>
                  {meeting.transcript.map((t, i) => (
                    <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
                      <strong style={{ color: t.speaker.startsWith('@') ? '#a78bfa' : '#60a5fa' }}>
                        {t.speaker}
                      </strong>{' '}
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}>({t.timestamp})</span>:{' '}
                      <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. ZT.HANZO.AI (Zero-Trust Local Cloudflare / WireGuard Tunnel) */}
          {activeApp === 'tunnel' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    zt.hanzo.ai — Zero-Trust Local Dev Sharing
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Expose your local machine compute, Node.js runtime, or k3s pods securely via Cloudflare & Hanzo ZT.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => workspaceAppsStore.toggleTunnel()}
                  className="tap"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: tunnel.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                    border: tunnel.status === 'active' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
                    color: tunnel.status === 'active' ? '#f87171' : '#34d399',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tunnel.status === 'active' ? 'Disconnect Tunnel' : 'Connect Tunnel'}
                </button>
              </div>

              {/* Tunnel Status Card */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 9999,
                        background: tunnel.status === 'active' ? '#34d399' : '#f87171',
                        boxShadow: tunnel.status === 'active' ? '0 0 8px #34d399' : 'none',
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      Status: {tunnel.status.toUpperCase()}
                    </span>
                  </div>

                  <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Connected Peers: <strong style={{ color: '#34d399' }}>{tunnel.connectedClients} active</strong>
                  </span>
                </div>

                {/* Shareable Link Box */}
                {tunnel.tunnelUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: '#050507',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Globe size={14} color="#60a5fa" />
                      <code style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>
                        {tunnel.tunnelUrl}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyTunnel}
                      className="tap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                  <span>Local Port: <strong>{tunnel.localPort}</strong></span>
                  <span>KMS Enclave: <strong>{tunnel.enclaveKey}</strong></span>
                  <span>Zero-Trust Policy: <strong>IAM Team Auth</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
