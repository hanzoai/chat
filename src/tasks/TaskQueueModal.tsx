/**
 * The org's agent runs — what is executing, what it did, and how to steer it.
 *
 * Every value on screen came off `/v1/agents/sessions`. What the wire does not
 * carry is not drawn: a session has no percentage, no retry count and no
 * artifact list, so there is no progress bar, no Retry and no artifact strip.
 * Nor is there a Dispatch control — `POST /v1/agents/sessions` REGISTERS a run
 * a surface is already executing, and a chat client posting one would mint a
 * durable row with nothing behind it.
 */
import { ListTodo, Pause, Play, Square, X } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { useSession } from '../data/session.tsx'

import { steer, useRun, useRuns } from './runs.ts'
import { taskQueueStore, useTaskQueue } from './store.ts'
import type { Session, SessionEvent, SessionStatus } from '@hanzo/ai'

const badge = (status: SessionStatus | undefined) => {
  switch (status) {
    case 'running':
      return { label: 'RUNNING', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' }
    case 'paused':
      return { label: 'PAUSED', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' }
    case 'done':
      return { label: 'DONE', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' }
    case 'error':
      return { label: 'ERROR', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' }
    default:
      return { label: 'UNKNOWN', color: 'rgba(255, 255, 255, 0.6)', bg: 'rgba(255, 255, 255, 0.06)' }
  }
}

const clock = (at?: string) => (at ? new Date(at).toLocaleString() : '')

/** One turn, printed. The payload is the server's; only its length is ours. */
const line = (event: SessionEvent): string => {
  const body =
    typeof event.payload === 'string'
      ? event.payload
      : event.payload === undefined
        ? ''
        : JSON.stringify(event.payload)
  const head = [event.kind, event.actor].filter(Boolean).join(' · ')
  return `${head}${body ? `  ${body.slice(0, 2000)}` : ''}`
}

const note = (text: string) => (
  <div style={{ padding: 16, fontSize: 12.5, color: 'rgba(255, 255, 255, 0.5)' }}>{text}</div>
)

export const TaskQueueModal = () => {
  const { isOpen, selected } = useTaskQueue()
  const { standing } = useSession()
  const live = standing === 'live'

  const list = useRuns(isOpen && live)
  const rows = list.data ?? []
  const id = selected && rows.some((r) => r.id === selected) ? selected : (rows[0]?.id ?? null)
  const run = useRun(id, isOpen && live)
  const [refused, setRefused] = useState<string | null>(null)

  if (!isOpen) return null

  const command = async (to: 'stop' | 'pause' | 'resume') => {
    if (!id) return
    setRefused(null)
    try {
      await steer(id, to)
    } catch (error) {
      setRefused(error instanceof Error ? error.message : String(error))
    }
  }

  const detail = run.data
  const status = detail?.status ?? rows.find((r) => r.id === id)?.status

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
      onClick={() => taskQueueStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 880,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <ListTodo size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Runs</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Every agent session in your org, and the turns each one recorded.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => taskQueueStore.close()}
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

        {!live && note('Sign in to read your org’s runs.')}
        {live && list.pending && rows.length === 0 && note('Reading runs…')}
        {live && !list.pending && list.error != null && note('The server refused this read.')}
        {live && !list.pending && list.error == null && rows.length === 0 && note('No runs recorded.')}

        {live && rows.length > 0 && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div
              style={{
                width: 320,
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflowY: 'auto',
              }}
            >
              {rows.map((row: Session) => {
                const look = badge(row.status)
                const on = row.id === id
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => taskQueueStore.select(row.id)}
                    className="tap"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: on ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: on ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: look.bg,
                          color: look.color,
                        }}
                      >
                        {look.label}
                      </span>
                      {row.agent && (
                        <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                          {row.agent}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10.5,
                          color: 'rgba(255, 255, 255, 0.4)',
                          marginLeft: 'auto',
                        }}
                      >
                        {row.events ?? 0} turns
                      </span>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>
                      {row.title || row.id}
                    </div>

                    {row.lastEvent?.preview && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.45)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {row.lastEvent.preview}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                    {detail?.title || id}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                    {detail?.actor && <span>Actor: <strong style={{ color: '#ffffff' }}>{detail.actor}</strong></span>}
                    {detail?.repo && <span>Repo: <strong style={{ color: '#ffffff' }}>{detail.repo}</strong></span>}
                    {detail?.host && <span>Host: <strong style={{ color: '#ffffff' }}>{detail.host}</strong></span>}
                    {detail?.startedAt && <span>Started {clock(detail.startedAt)}</span>}
                    {detail?.endedAt && <span>Ended {clock(detail.endedAt)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {status === 'running' && (
                    <button
                      type="button"
                      onClick={() => void command('pause')}
                      className="tap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      <Pause size={12} />
                      <span>Pause</span>
                    </button>
                  )}

                  {status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => void command('resume')}
                      className="tap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={12} />
                      <span>Resume</span>
                    </button>
                  )}

                  {(status === 'running' || status === 'paused') && (
                    <button
                      type="button"
                      onClick={() => void command('stop')}
                      className="tap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      <Square size={12} />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>

              {refused && (
                <div style={{ fontSize: 11.5, color: '#f87171' }}>
                  The server refused that: {refused}
                </div>
              )}

              <div
                style={{
                  flex: 1,
                  minHeight: 220,
                  backgroundColor: '#050507',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: 14,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                {run.pending && !detail && <span style={{ opacity: 0.5 }}>Reading turns…</span>}
                {!run.pending && run.error != null && (
                  <span style={{ color: '#f87171' }}>The server refused this read.</span>
                )}
                {detail?.recentEvents?.length === 0 && (
                  <span style={{ opacity: 0.5 }}>This run has recorded no turns.</span>
                )}
                {detail?.recentEvents?.map((event, at) => (
                  <div key={event.id ?? `${event.seq ?? at}`} style={{ whiteSpace: 'pre-wrap' }}>
                    {line(event)}
                  </div>
                ))}
              </div>

              {detail?.childSessions && detail.childSessions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Spawned:
                  </span>
                  {detail.childSessions.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => taskQueueStore.select(child.id)}
                      className="tap"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#60a5fa',
                        cursor: 'pointer',
                      }}
                    >
                      {child.title || child.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
