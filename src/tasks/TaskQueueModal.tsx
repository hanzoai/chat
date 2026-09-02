/**
 * Durable Task Queue & CI/CD Pipelines Modal.
 */
import {
  ListTodo,
  Play,
  RotateCcw,
  Shield,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { taskQueueStore, useTaskQueue } from './store'
import type { DurableTask, TaskStatus } from './types'

const statusBadge = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return { label: 'COMPLETED', bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.3)' }
    case 'running':
      return { label: 'RUNNING', bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' }
    case 'retrying':
      return { label: 'RETRYING', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' }
    case 'failed':
      return { label: 'FAILED', bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: 'rgba(248, 113, 113, 0.3)' }
    case 'queued':
    default:
      return { label: 'QUEUED', bg: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)', border: 'rgba(255, 255, 255, 0.1)' }
  }
}

export const TaskQueueModal = () => {
  const { isOpen, tasks, activeTaskId } = useTaskQueue()

  if (!isOpen) return null

  const activeTask = tasks.find((t) => t.id === activeTaskId) || tasks[0]

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
        {/* Header */}
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
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.25), rgba(96, 165, 250, 0.25))',
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Durable Task Queue & CI/CD Pipelines
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Persistent background task orchestration running against local Node, k3s, and Hanzo Cloud.
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

        {/* Action Bar: Quick CI/CD Triggers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>
            Dispatch Pipeline:
          </span>
          <button
            type="button"
            onClick={() => taskQueueStore.dispatchTask('CI/CD: Build Production Next.js 16 Bundle', '@dev')}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Play size={11} color="#34d399" />
            <span>CI/CD Build</span>
          </button>

          <button
            type="button"
            onClick={() => taskQueueStore.dispatchTask('k3s Sandbox: Deploy Worker Pod', '@executor')}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Zap size={11} color="#60a5fa" />
            <span>Deploy k3s Pod</span>
          </button>

          <button
            type="button"
            onClick={() => taskQueueStore.dispatchTask('SecOps: Enclave KMS Audit', '@secops')}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Shield size={11} color="#f87171" />
            <span>SecOps Audit</span>
          </button>
        </div>

        {/* Content Split: Left Task List, Right Task Details */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Tasks List */}
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
            {tasks.map((t: DurableTask) => {
              const badge = statusBadge(t.status)
              const isSelected = t.id === activeTask?.id

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => taskQueueStore.selectTask(t.id)}
                  className="tap"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(255, 255, 255, 0.12)'
                      : '1px solid transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                        {t.assignedAgent}
                      </span>
                    </div>

                    <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                      {t.startedAt}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', lineHeight: 1.35 }}>
                    {t.title}
                  </div>

                  {/* Progress Bar */}
                  {t.status === 'running' && (
                    <div
                      style={{
                        width: '100%',
                        height: 3,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        marginTop: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${t.progress}%`,
                          height: '100%',
                          background: '#34d399',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Task Details & Terminal Output */}
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
            {activeTask && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                      {activeTask.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                        Agent: <strong style={{ color: '#ffffff' }}>{activeTask.assignedAgent}</strong>
                      </span>
                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                        Step: <strong style={{ color: '#34d399' }}>{activeTask.currentStep}</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      title="Retry task"
                      onClick={() => taskQueueStore.retryTask(activeTask.id)}
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
                      <RotateCcw size={12} />
                      <span>Retry</span>
                    </button>

                    {activeTask.status === 'running' && (
                      <button
                        type="button"
                        title="Cancel task"
                        onClick={() => taskQueueStore.cancelTask(activeTask.id)}
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
                        <X size={12} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Log Stream */}
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
                  }}
                >
                  {activeTask.logs.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        color: l.startsWith('$') ? '#60a5fa' : l.includes('✔') || l.includes('✓') ? '#34d399' : 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      {l}
                    </div>
                  ))}
                </div>

                {/* Artifacts Strip */}
                {activeTask.artifacts && activeTask.artifacts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>
                      Emitted Artifacts:
                    </span>
                    {activeTask.artifacts.map((a) => (
                      <span
                        key={a}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#60a5fa',
                          fontFamily: 'monospace',
                        }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
