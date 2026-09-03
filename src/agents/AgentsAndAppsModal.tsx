/**
 * The org's agents.
 *
 * One subject, because there is one route behind it. This was a four-tab hub
 * over agents, apps, plugins and automations, and three of those tabs were
 * arrays written into the page: `/v1/apps`, `/v1/plugins` and `/v1/automations`
 * all answer 404, and the surfaces that DO exist for plugins and the workspace
 * apps are already reachable from the palette — a second copy here would be a
 * second place to keep them right.
 *
 * A scheduled agent is what an "automation" was: `executionMode: long-running`
 * plus the cron the scheduler fires it on, both fields of the agent itself.
 */
import { Loader, Play, Plus, Trash2, X } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import type { Agent } from '@hanzo/ai'

import { none, remove, run, swarmStore, unread, useAgent, useAgents, useSwarm } from './store.ts'

export interface AgentsAndAppsModalProps {
  onOpenAgentBuilder?: () => void
}

const face = (agent: Agent) => agent.emoji || agent.name.charAt(0).toUpperCase()

const faint = 'rgba(255, 255, 255, 0.5)'
const line = '1px solid rgba(255, 255, 255, 0.08)'

const chip = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 4,
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'rgba(255, 255, 255, 0.65)',
} as const

const action = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 6,
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
} as const

/** One agent's prompt, its recorded runs, and the control that adds another. */
const Detail = ({ name }: { name: string }) => {
  const detail = useAgent(name)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<{ status: string; text: string } | null>(null)

  const go = async () => {
    if (!input.trim()) return
    setRunning(true)
    setLast(null)
    try {
      const recorded = await run(name, input)
      setLast({ status: recorded.status, text: recorded.error || recorded.output || '' })
    } catch (failure) {
      setLast({ status: 'error', text: failure instanceof Error ? failure.message : String(failure) })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'grid', alignContent: 'start', gap: 8, paddingTop: 8, borderTop: line }}>
      {detail.error ? (
        <span style={{ fontSize: 11, color: faint }}>{unread}</span>
      ) : detail.data?.instructions ? (
        <pre
          style={{
            margin: 0,
            fontSize: 10.5,
            lineHeight: 1.45,
            color: 'rgba(255, 255, 255, 0.6)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono, monospace)',
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {detail.data.instructions}
        </pre>
      ) : null}

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void go()
          }}
          placeholder="Give this agent something to do"
          style={{
            flex: 1,
            padding: '5px 9px',
            borderRadius: 6,
            border: line,
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#ffffff',
            fontSize: 11.5,
            outline: 'none',
          }}
        />
        <button type="button" onClick={() => void go()} disabled={running} style={action}>
          {running ? <Loader size={11} /> : <Play size={11} fill="currentColor" />}
          <span>{running ? 'Running…' : 'Run'}</span>
        </button>
      </div>

      {last && (
        <pre
          style={{
            margin: 0,
            fontSize: 10.5,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono, monospace)',
            color: last.status === 'ok' ? 'rgba(255, 255, 255, 0.75)' : '#f87171',
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {last.text}
        </pre>
      )}

      {detail.data?.recentRuns?.length ? (
        <div style={{ display: 'grid', alignContent: 'start', gap: 3 }}>
          {detail.data.recentRuns.slice(0, 5).map((r) => (
            <div key={r.id} style={{ fontSize: 10, color: faint, display: 'flex', gap: 6 }}>
              <span style={{ color: r.status === 'ok' ? '#34d399' : '#f87171' }}>{r.status}</span>
              <span>{r.model}</span>
              {r.durationMs != null && <span>{r.durationMs} ms</span>}
              <span>{r.createdAt}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const AgentsAndAppsModal = ({ onOpenAgentBuilder }: AgentsAndAppsModalProps) => {
  const { isHubOpen, activeAgentIds } = useSwarm()
  const agents = useAgents()
  const [open, setOpen] = useState<string | null>(null)

  if (!isHubOpen) return null

  const listed = agents.data ?? []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => swarmStore.closeHub()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          height: 620,
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#0c0c0e',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85)',
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
            borderBottom: line,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Agents</div>
            <div style={{ fontSize: 11.5, color: faint }}>
              {listed.length} defined in this org.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                swarmStore.closeHub()
                onOpenAgentBuilder?.()
              }}
              className="tap"
              style={{ ...action, background: '#ffffff', border: 'none', color: '#000000' }}
            >
              <Plus size={13} />
              <span>Define Agent</span>
            </button>

            <button
              type="button"
              onClick={() => swarmStore.closeHub()}
              style={{ background: 'none', border: 'none', color: faint, cursor: 'pointer', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto' }}>
          {agents.error ? (
            <span style={{ fontSize: 12.5, color: faint }}>{unread}</span>
          ) : listed.length === 0 && !agents.pending ? (
            <span style={{ fontSize: 12.5, color: faint }}>{none}</span>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                gap: 12,
              }}
            >
              {listed.map((agent) => {
                const inSwarm = activeAgentIds.includes(agent.name)
                return (
                  <div
                    key={agent.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: line,
                      display: 'grid', alignContent: 'start',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: line,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {face(agent)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                          {agent.name}
                        </div>
                        <code style={{ fontSize: 11, color: faint }}>{agent.model}</code>
                      </div>
                    </div>

                    {agent.description && (
                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                        {agent.description}
                      </span>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(agent.tools ?? []).map((tool) => (
                        <span key={tool} style={chip}>
                          {tool}
                        </span>
                      ))}
                      {agent.schedule && <span style={chip}>cron {agent.schedule}</span>}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: line,
                      }}
                    >
                      <span style={{ fontSize: 11, color: faint }}>
                        {agent.runs === undefined ? '—' : `${agent.runs} runs`} ·{' '}
                        {agent.status ?? 'unknown'}
                      </span>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => swarmStore.toggleAgent(agent.name)}
                          className="tap"
                          style={{
                            ...action,
                            background: inSwarm ? 'rgba(52, 211, 153, 0.15)' : action.background,
                            color: inSwarm ? '#34d399' : '#ffffff',
                          }}
                        >
                          {inSwarm ? 'In chat' : 'Add to chat'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen(open === agent.name ? null : agent.name)}
                          className="tap"
                          style={action}
                        >
                          <Play size={11} fill="currentColor" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(agent.name)}
                          className="tap"
                          title="Remove this agent and every run recorded against it"
                          style={{ ...action, color: '#f87171' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {open === agent.name && <Detail name={agent.name} />}
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
