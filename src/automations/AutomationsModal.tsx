/**
 * Scheduled Tasks & Automations Modal.
 * Visual dashboard for background cron jobs, event-driven triggers, and agent task dispatches.
 */
import {
  Clock,
  GitBranch,
  Play,
  Plus,
  X,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { automationsStore, useAutomations } from './store'

export const AutomationsModal = () => {
  const { isOpen, jobs } = useAutomations()
  const [newJobName, setNewJobName] = useState('')
  const [newJobDesc, setNewJobDesc] = useState('')

  if (!isOpen) return null

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault()
    if (newJobName.trim()) {
      automationsStore.createJob(newJobName.trim(), newJobDesc.trim() || 'Automated background task')
      setNewJobName('')
      setNewJobDesc('')
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
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Scheduled Tasks & Automations
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Recurring cron jobs, event-driven webhook triggers, and autonomous agent routines.
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

        {/* Content Area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 18, gap: 14 }}>
          {/* Create Job Form */}
          <form onSubmit={handleCreateJob} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="New scheduled automation (e.g. Daily AST Vector Sync)..."
              value={newJobName}
              onChange={(e) => setNewJobName(e.target.value)}
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} />
              <span>Schedule Job</span>
            </button>
          </form>

          {/* Jobs List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map((job) => {
              const isActive = job.status === 'active'
              const isRunning = job.status === 'running'
              return (
                <div
                  key={job.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: isRunning
                      ? '1px solid rgba(52, 211, 153, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: job.trigger === 'cron' ? '#34d399' : '#60a5fa',
                        flexShrink: 0,
                      }}
                    >
                      {job.trigger === 'cron' ? <Clock size={16} /> : <GitBranch size={16} />}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff' }}>
                          {job.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: isRunning
                              ? 'rgba(52, 211, 153, 0.2)'
                              : isActive
                              ? 'rgba(96, 165, 250, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: isRunning ? '#34d399' : isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.4)',
                          }}
                        >
                          {isRunning ? 'RUNNING' : job.status.toUpperCase()}
                        </span>
                      </div>

                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.3 }}>
                        {job.description}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', paddingTop: 2 }}>
                        <span>Schedule: <strong style={{ color: '#ffffff' }}>{job.schedule}</strong></span>
                        <span>Agent: <strong style={{ color: '#a78bfa' }}>{job.assignedAgent}</strong></span>
                        <span>Target: <strong style={{ color: '#34d399' }}>{job.runtimeTarget}</strong></span>
                        <span>Total Runs: <strong style={{ color: '#ffffff' }}>{job.runCount}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => automationsStore.runNow(job.id)}
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
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Play size={11} fill="currentColor" />
                      <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => automationsStore.toggleStatus(job.id)}
                      className="tap"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        border: isActive ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isActive ? '#34d399' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
