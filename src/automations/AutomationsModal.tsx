/**
 * Automations.
 *
 * Three verbs, because the surface publishes three: arm the trigger, disarm
 * it, and start a run now. There is no schedule line and no "next run" —
 * nothing on this wire says when a cron trigger fires next — and no lifetime
 * run total, because the run history publishes a page and no count.
 */
import { Clock, Play, Plus, X, Zap } from '@hanzogui/lucide-icons-2'
import { useState, type FormEvent } from 'react'

import { useSession } from '../data/session.tsx'

import { add, arm, start, useFlows, useRuns } from './auto.ts'
import { automationsStore, useAutomations } from './store.ts'

const clock = (at?: number) => (at ? new Date(at).toLocaleString() : '')

const field = {
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  fontSize: 12.5,
  outline: 'none',
} as const

const note = (text: string) => (
  <div style={{ padding: 16, fontSize: 12.5, color: 'rgba(255, 255, 255, 0.5)' }}>{text}</div>
)

export const AutomationsModal = () => {
  const { isOpen, selected } = useAutomations()
  const { standing } = useSession()
  const live = standing === 'live'
  const on = isOpen && live

  const list = useFlows(on)
  const rows = list.data ?? []
  const history = useRuns(selected, on)

  const [name, setName] = useState('')
  const [refused, setRefused] = useState<string | null>(null)

  if (!isOpen) return null

  const attempt = async (act: Promise<unknown>) => {
    setRefused(null)
    try {
      await act
    } catch (error) {
      setRefused(error instanceof Error ? error.message : String(error))
    }
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    void attempt(add(name.trim()))
    setName('')
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
      onClick={() => automationsStore.close()}
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
          display: 'grid', alignContent: 'start'
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
            <Clock size={18} color="#34d399" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Automations</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Your org’s flows. Enabling one arms its trigger; a manual flow runs on demand.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => automationsStore.close()}
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

        <div style={{ flex: 1, minHeight: 0, display: 'grid', alignContent: 'start', padding: 18, gap: 14 }}>
          <form onSubmit={create} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="New automation name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...field, flex: 1 }}
            />
            <button
              type="submit"
              className="tap"
              disabled={!name.trim()}
              title="Creates the flow and its first draft. It starts disabled."
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontSize: 12,
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} />
              <span>Create</span>
            </button>
          </form>

          {refused && (
            <div style={{ fontSize: 11.5, color: '#f87171' }}>
              The server refused that: {refused}
            </div>
          )}

          {!live && note('Sign in to read your org’s automations.')}
          {live && list.pending && rows.length === 0 && note('Reading automations…')}
          {live && !list.pending && list.error != null && note('The server refused this read.')}
          {live && !list.pending && list.error == null && rows.length === 0 &&
            note('This org has no automations.')}

          {live && rows.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 10 }}>
              {rows.map((flow) => {
                const armed = flow.status === 'ENABLED'
                const open = selected === flow.id
                return (
                  <div
                    key={flow.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: open
                        ? '1px solid rgba(96, 165, 250, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'grid', alignContent: 'start',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: armed ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                          flexShrink: 0,
                        }}
                      >
                        <Zap size={15} />
                      </div>

                      <button
                        type="button"
                        onClick={() => automationsStore.select(open ? null : flow.id)}
                        className="tap"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: '#ffffff',
                        }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{flow.name || flow.id}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', paddingTop: 2 }}>
                          {flow.strategy ? `${flow.strategy.toLowerCase()} trigger` : 'no trigger yet'}
                          {flow.updated ? ` · changed ${clock(flow.updated)}` : ''}
                        </div>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => void attempt(start(flow.id))}
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
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Play size={11} />
                          <span>Run</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void attempt(arm(flow.id, !armed))}
                          className="tap"
                          title={armed ? 'Disarm this trigger' : 'Arm this trigger'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: armed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            border: armed
                              ? '1px solid rgba(52, 211, 153, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            color: armed ? '#34d399' : 'rgba(255, 255, 255, 0.5)',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {armed ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          paddingTop: 10,
                          display: 'grid', alignContent: 'start',
                          gap: 6,
                          fontSize: 11.5
                        }}
                      >
                        {history.pending && !history.data && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Reading runs…</span>
                        )}
                        {!history.pending && history.error != null && (
                          <span style={{ color: '#f87171' }}>The server refused this read.</span>
                        )}
                        {history.data?.length === 0 && (
                          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No runs recorded.</span>
                        )}
                        {history.data?.map((run) => (
                          <div
                            key={run.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              color: 'rgba(255, 255, 255, 0.55)',
                            }}
                          >
                            <span style={{ color: '#ffffff', fontWeight: 600, minWidth: 90 }}>
                              {run.status ?? 'unknown'}
                            </span>
                            <span>{clock(run.startTime)}</span>
                            {run.finishTime ? <span>→ {clock(run.finishTime)}</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
