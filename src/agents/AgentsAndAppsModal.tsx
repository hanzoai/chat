/**
 * Unified Agents & Apps Hub Modal.
 * Brings together AI Agents, Standalone Workspace Micro-Apps, Plugins, and Automations.
 */
import {
  Blocks,
  Bot,
  Check,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  LayoutGrid,
  ListTodo,
  Play,
  Plus,
  Shield,
  Video,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { automationsStore } from '~/automations/store'
import { pluginsStore } from '~/plugins/store'
import { workspaceAppsStore } from '~/apps/store'
import { swarmStore, useSwarm } from './store'
import { AGENT_ROSTER } from './types'

export interface AgentsAndAppsModalProps {
  onOpenAgentBuilder?: () => void
}

export const AgentsAndAppsModal = ({ onOpenAgentBuilder }: AgentsAndAppsModalProps) => {
  const { isHubOpen, activeAgentIds } = useSwarm()
  const [activeTab, setActiveTab] = useState<'agents' | 'apps' | 'plugins' | 'automations'>('agents')

  if (!isHubOpen) return null

  const APPS_LIST = [
    {
      id: 'tasks',
      name: 'tasks.hanzo.ai',
      badge: 'Distributed Workflows',
      desc: 'Stateful DAG execution engine, async background dispatch, and multi-step CI/CD compilation pipelines.',
      icon: ListTodo,
      color: '#34d399',
      target: 'tasks',
      url: 'https://tasks.hanzo.ai',
    },
    {
      id: 'notes',
      name: 'notes.hanzo.ai',
      badge: 'AI Co-Authoring',
      desc: 'Collaborative real-time markdown documentation with AI co-authors, live diffing, and export.',
      icon: FileText,
      color: '#60a5fa',
      target: 'notes',
      url: 'https://notes.hanzo.ai',
    },
    {
      id: 'todo',
      name: 'todo.hanzo.ai',
      badge: 'Checklist & Delegation',
      desc: 'Collaborative task checklists with automated agent delegation (@dev, @secops) and priority triage.',
      icon: CheckSquare,
      color: '#a78bfa',
      target: 'todo',
      url: 'https://todo.hanzo.ai',
    },
    {
      id: 'meet',
      name: 'meet.hanzo.ai',
      badge: 'WebRTC Video & AI Notes',
      desc: 'Encrypted multiplayer audio/video rooms with live speech-to-text transcription and automated meeting notes.',
      icon: Video,
      color: '#f87171',
      target: 'meet',
      url: 'https://meet.hanzo.ai',
    },
    {
      id: 'tunnel',
      name: 'zt.hanzo.ai',
      badge: 'Zero-Trust Dev Sharing',
      desc: 'Expose your local machine compute, Node.js runtime, and k3s pods securely via Cloudflare and WireGuard.',
      icon: Shield,
      color: '#fbbf24',
      target: 'tunnel',
      url: 'https://zt.hanzo.ai',
    },
    {
      id: 'tabs',
      name: 'tabs.hanzo.ai',
      badge: 'Cloud Tabs & Browser',
      desc: 'Headless browser execution, web scraping sandbox, and live interactive cloud tab automation.',
      icon: Globe,
      color: '#38bdf8',
      target: 'tunnel',
      url: 'https://tabs.hanzo.ai',
    },
  ]

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
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
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
            <LayoutGrid size={18} color="#ffffff" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Agents & Apps Hub
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Discover specialized AI agents, workspace micro-apps, plugins, and automations.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => swarmStore.closeHub()}
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

        {/* Tab Selector & Actions Row */}
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
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'agents', label: 'AI Agents', icon: Bot, count: AGENT_ROSTER.length },
              { id: 'apps', label: 'Apps & Tools', icon: Zap, count: APPS_LIST.length },
              { id: 'plugins', label: 'Plugins', icon: Blocks, count: 5 },
              { id: 'automations', label: 'Automations', icon: Clock, count: 4 },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="tap"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 7,
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'} />
                  <span>{tab.label}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.6, background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: 9999 }}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Action on Right (e.g. + Create Agent button) */}
          {activeTab === 'agents' && (
            <button
              type="button"
              onClick={() => {
                swarmStore.closeHub()
                onOpenAgentBuilder?.()
              }}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 7,
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              <span>Create Custom Agent</span>
            </button>
          )}
        </div>

        {/* Content Pane */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 18, overflowY: 'auto' }}>
          {/* 1. AI AGENTS TAB */}
          {activeTab === 'agents' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 12 }}>
              {AGENT_ROSTER.map((agent) => {
                const isSelected = activeAgentIds.includes(agent.id)
                return (
                  <div
                    key={agent.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.025)',
                      border: isSelected ? `1px solid ${agent.badgeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      boxShadow: isSelected ? `0 0 16px ${agent.badgeColor}22` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: `${agent.badgeColor}22`,
                              border: `1px solid ${agent.badgeColor}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: agent.badgeColor,
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {agent.handle[1].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                              {agent.name}
                            </div>
                            <code style={{ fontSize: 11, color: agent.badgeColor, fontWeight: 600 }}>
                              {agent.handle}
                            </code>
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                        {agent.role}
                      </span>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 2 }}>
                        {agent.capabilities.map((cap) => (
                          <span
                            key={cap}
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'rgba(255, 255, 255, 0.65)',
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                        Status: <strong style={{ color: isSelected ? agent.badgeColor : 'rgba(255, 255, 255, 0.6)' }}>{isSelected ? 'Active in Swarm' : 'Available'}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => swarmStore.toggleAgent(agent.id)}
                        className="tap"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: isSelected ? `${agent.badgeColor}22` : 'rgba(255, 255, 255, 0.06)',
                          border: isSelected ? `1px solid ${agent.badgeColor}66` : '1px solid rgba(255, 255, 255, 0.1)',
                          color: isSelected ? agent.badgeColor : '#ffffff',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isSelected ? 'In Swarm' : 'Add to Swarm'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 2. STANDALONE APPS TAB */}
          {activeTab === 'apps' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 12 }}>
              {APPS_LIST.map((app) => {
                const Icon = app.icon
                return (
                  <div
                    key={app.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.025)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: `${app.color}22`,
                              border: `1px solid ${app.color}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: app.color,
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                              {app.name}
                            </div>
                            <span style={{ fontSize: 11, color: app.color, fontWeight: 600 }}>
                              {app.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                        {app.desc}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.5)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>External</span>
                        <ExternalLink size={11} />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          swarmStore.closeHub()
                          workspaceAppsStore.open(app.target as any)
                        }}
                        className="tap"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Launch App</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 3. PLUGINS TAB */}
          {activeTab === 'plugins' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Developer toolings and runtime connectors
                </span>
                <button
                  type="button"
                  onClick={() => {
                    swarmStore.closeHub()
                    pluginsStore.open()
                  }}
                  className="tap"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Manage All Plugins
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                {[
                  { name: 'GitHub CI/CD Trigger', desc: 'Dispatch tests and builds directly from agents' },
                  { name: 'pgvector Auto-Indexer', desc: 'Continuous AST embedding indexing into Postgres' },
                  { name: 'KMS Hardware Enclave', desc: '30-day ECDSA key rotation with AES-256 envelope encryption' },
                  { name: 'ZAP Stream Profiler', desc: 'Zero-allocation telemetry & latency profiling' },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>{p.name}</span>
                      <span style={{ fontSize: 10.5, color: '#34d399', fontWeight: 600 }}>Active</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. AUTOMATIONS TAB */}
          {activeTab === 'automations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                  Scheduled cron jobs and event routines
                </span>
                <button
                  type="button"
                  onClick={() => {
                    swarmStore.closeHub()
                    automationsStore.open()
                  }}
                  className="tap"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Manage All Automations
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                {[
                  { name: 'Hourly KMS Vulnerability Sweep', agent: '@secops', schedule: 'Hourly' },
                  { name: 'Daily Model & ZAP Benchmark', agent: '@researcher', schedule: 'Daily @ 00:00' },
                  { name: 'On Git Push -> Auto-Deploy k3s', agent: '@dev', schedule: 'On main push' },
                  { name: 'Continuous AST Memory Sync', agent: '@planner', schedule: 'Every 15m' },
                ].map((job) => (
                  <div
                    key={job.name}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>{job.name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                      Agent: <strong style={{ color: '#a78bfa' }}>{job.agent}</strong> • {job.schedule}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
