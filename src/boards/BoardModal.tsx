/**
 * Kanban Boards & Sprint Issue Planning Modal.
 * Full interactive Kanban board with persistence, inline card editor, checklists,
 * filter/search, and autonomous agent task execution.
 */
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Download,
  GitBranch,
  Kanban,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from '@hanzogui/lucide-icons-2'
import { useState, type FormEvent } from 'react'
import { boardStore, useBoard, type BoardCard } from './store'
import { taskQueueStore } from '~/tasks/store'

const COLUMNS: { id: BoardCard['column']; title: string; color: string; desc: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'rgba(255, 255, 255, 0.4)', desc: 'Queued sprint items' },
  { id: 'in_progress', title: 'In Progress', color: '#60a5fa', desc: 'Active execution' },
  { id: 'review', title: 'Review', color: '#fbbf24', desc: 'Code review & gates' },
  { id: 'done', title: 'Done', color: '#34d399', desc: 'Shipped to production' },
]

const AGENTS = [
  { id: '@dev', label: '@dev (Fullstack SWE)' },
  { id: '@planner', label: '@planner (Architect)' },
  { id: '@secops', label: '@secops (Security Auditor)' },
  { id: '@executor', label: '@executor (Infra & MicroVMs)' },
  { id: '@algo', label: '@algo (ML & Verification)' },
]

const PRIORITIES: { id: BoardCard['priority']; label: string; color: string; bg: string }[] = [
  { id: 'P0', label: 'P0 - Blocker / Critical', color: '#f87171', bg: 'rgba(239, 68, 68, 0.2)' },
  { id: 'P1', label: 'P1 - High Priority', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' },
  { id: 'P2', label: 'P2 - Medium Priority', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)' },
  { id: 'P3', label: 'P3 - Low Priority', color: 'rgba(255, 255, 255, 0.6)', bg: 'rgba(255, 255, 255, 0.08)' },
]

export const BoardModal = () => {
  const { isOpen, cards, filterSearch, filterAgent, filterPriority, selectedCardId } = useBoard()

  // New task form state
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColumn, setNewColumn] = useState<BoardCard['column']>('backlog')
  const [newAgent, setNewAgent] = useState('@dev')
  const [newPriority, setNewPriority] = useState<BoardCard['priority']>('P1')
  const [newBranch, setNewBranch] = useState('')
  const [newTagsInput, setNewTagsInput] = useState('')

  // New checklist input state
  const [newChecklistText, setNewChecklistText] = useState('')

  if (!isOpen) return null

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const tags = newTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    boardStore.addCard({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      column: newColumn,
      assignedAgent: newAgent,
      priority: newPriority,
      branch: newBranch.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    })

    setNewTitle('')
    setNewDesc('')
    setNewBranch('')
    setNewTagsInput('')
    setIsAdding(false)
  }

  const handleExecute = (card: BoardCard) => {
    boardStore.moveCard(card.id, 'in_progress')
    taskQueueStore.dispatchTask(card.title, card.assignedAgent)
    taskQueueStore.open()
  }

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cards, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', dataStr)
    dlAnchor.setAttribute('download', `hanzo-sprint-board-${new Date().toISOString().split('T')[0]}.json`)
    dlAnchor.click()
  }

  const filteredCards = cards.filter((card) => {
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      const matchesTitle = card.title.toLowerCase().includes(q)
      const matchesDesc = (card.description || '').toLowerCase().includes(q)
      const matchesBranch = (card.branch || '').toLowerCase().includes(q)
      const matchesTag = (card.tags || []).some((t) => t.toLowerCase().includes(q))
      if (!matchesTitle && !matchesDesc && !matchesBranch && !matchesTag) return false
    }
    if (filterAgent !== 'all' && card.assignedAgent !== filterAgent) return false
    if (filterPriority !== 'all' && card.priority !== filterPriority) return false
    return true
  })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => boardStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          height: '86vh',
          maxHeight: 780,
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#0c0c0e',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(129, 140, 248, 0.25))',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Kanban size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Sprint Kanban & Autonomous Swarm Tasks</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 9999,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                  }}
                >
                  LIVE PERSISTED
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                {cards.length} total tasks · {cards.filter((c) => c.column === 'done').length} completed · Autonomous Swarm Execution
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Search size={12} color="rgba(255, 255, 255, 0.4)" />
              <input
                type="text"
                placeholder="Filter tasks..."
                value={filterSearch}
                onChange={(e) => boardStore.setFilterSearch(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 11.5,
                  width: 110,
                }}
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => boardStore.setFilterSearch('')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Agent Filter */}
            <select
              value={filterAgent}
              onChange={(e) => boardStore.setFilterAgent(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 11.5,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Agents</option>
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => boardStore.setFilterPriority(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 11.5,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Priorities</option>
              <option value="P0">P0 - Blocker</option>
              <option value="P1">P1 - High</option>
              <option value="P2">P2 - Medium</option>
              <option value="P3">P3 - Low</option>
            </select>

            {/* New Task Button */}
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 7,
                background: isAdding ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              <span>{isAdding ? 'Cancel' : 'New Task'}</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportJson}
              className="tap"
              title="Export board as JSON"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 8px',
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              <Download size={12} />
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset board to default sprint template?')) {
                  boardStore.resetToDefaults()
                }
              }}
              className="tap"
              title="Reset to template"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 8px',
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => boardStore.close()}
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
        </div>

        {/* Add Task Drawer */}
        {isAdding && (
          <form
            onSubmit={handleAdd}
            style={{
              padding: '12px 18px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Task title (e.g. Implement WebRTC Zero-Copy Video Transcoder)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 7,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
              <select
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value as any)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    Column: {col.title}
                  </option>
                ))}
              </select>
              <select
                value={newAgent}
                onChange={(e) => setNewAgent(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="tap"
                style={{
                  padding: '7px 16px',
                  borderRadius: 7,
                  background: '#ffffff',
                  border: 'none',
                  color: '#000000',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Create Task
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Description / acceptance criteria..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{
                  flex: 2,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 11.5,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Git branch (e.g. feat/webrtc)..."
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 11.5,
                  outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Tags (comma separated)..."
                value={newTagsInput}
                onChange={(e) => setNewTagsInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 11.5,
                  outline: 'none',
                }}
              />
            </div>
          </form>
        )}

        {/* 4-Column Kanban Board Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 14,
            padding: 16,
            overflowX: 'auto',
            minHeight: 0,
          }}
        >
          {COLUMNS.map((col) => {
            const columnCards = filteredCards.filter((c) => c.column === col.id)

            return (
              <div
                key={col.id}
                style={{
                  flex: 1,
                  minWidth: 240,
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  backgroundColor: 'rgba(255, 255, 255, 0.015)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 6,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 9999,
                        background: col.color,
                        boxShadow: `0 0 8px ${col.color}`,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                      {col.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '1px 6px',
                        borderRadius: 9999,
                      }}
                    >
                      {columnCards.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewColumn(col.id)
                        setIsAdding(true)
                      }}
                      className="tap"
                      title={`Add task to ${col.title}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Column Cards */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {columnCards.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.25)',
                        fontSize: 11.5,
                        border: '1px dashed rgba(255, 255, 255, 0.06)',
                        borderRadius: 8,
                      }}
                    >
                      No tasks in {col.title}
                    </div>
                  ) : (
                    columnCards.map((card) => {
                      const completedChecks = (card.checklists || []).filter((c) => c.done).length
                      const totalChecks = (card.checklists || []).length
                      const isSelected = card.id === selectedCardId

                      return (
                        <div
                          key={card.id}
                          onClick={() => boardStore.selectCard(card.id)}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: isSelected
                              ? '1px solid rgba(96, 165, 250, 0.6)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: isSelected
                              ? 'rgba(96, 165, 250, 0.08)'
                              : 'rgba(255, 255, 255, 0.035)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            backdropFilter: 'blur(12px)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, background-color 0.15s',
                          }}
                        >
                          {/* Priority & Agent Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background:
                                  card.priority === 'P0'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : card.priority === 'P1'
                                    ? 'rgba(251, 191, 36, 0.2)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                color:
                                  card.priority === 'P0'
                                    ? '#f87171'
                                    : card.priority === 'P1'
                                    ? '#fbbf24'
                                    : 'rgba(255, 255, 255, 0.7)',
                              }}
                            >
                              {card.priority}
                            </span>

                            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                              {card.assignedAgent}
                            </span>
                          </div>

                          {/* Title */}
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff', lineHeight: 1.4 }}>
                            {card.title}
                          </div>

                          {/* Description preview */}
                          {card.description && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'rgba(255, 255, 255, 0.5)',
                                lineHeight: 1.35,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {card.description}
                            </div>
                          )}

                          {/* Branch & Checklist summary */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                            {card.branch && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <GitBranch size={11} color="rgba(255, 255, 255, 0.4)" />
                                <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                                  {card.branch}
                                </span>
                              </div>
                            )}

                            {totalChecks > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckSquare size={11} color={completedChecks === totalChecks ? '#34d399' : 'rgba(255, 255, 255, 0.4)'} />
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    color: completedChecks === totalChecks ? '#34d399' : 'rgba(255, 255, 255, 0.5)',
                                  }}
                                >
                                  {completedChecks}/{totalChecks}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {card.tags && card.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {card.tags.map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 3,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'rgba(255, 255, 255, 0.45)',
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Actions Footer */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 6,
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Run with agent button */}
                            {card.column !== 'done' ? (
                              <button
                                type="button"
                                onClick={() => handleExecute(card)}
                                className="tap"
                                title="Execute task autonomously with Swarm agent"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  borderRadius: 5,
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  border: '1px solid rgba(52, 211, 153, 0.3)',
                                  color: '#34d399',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Play size={10} />
                                <span>Auto-Run</span>
                              </button>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 11, fontWeight: 600 }}>
                                <CheckCircle2 size={12} />
                                <span>Passed</span>
                              </span>
                            )}

                            {/* Direct Column Move Dropdown & Stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {/* Left Arrow */}
                              {card.column !== 'backlog' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const colIndex = COLUMNS.findIndex((c) => c.id === card.column)
                                    if (colIndex > 0) {
                                      boardStore.moveCard(card.id, COLUMNS[colIndex - 1].id)
                                    }
                                  }}
                                  title="Move to previous column"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowLeft size={11} />
                                </button>
                              )}

                              {/* Right Arrow */}
                              {card.column !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const colIndex = COLUMNS.findIndex((c) => c.id === card.column)
                                    if (colIndex < COLUMNS.length - 1) {
                                      boardStore.moveCard(card.id, COLUMNS[colIndex + 1].id)
                                    }
                                  }}
                                  title="Move to next column"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Card Detail Drawer / Modal Overlay */}
        {selectedCard && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#111114',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 110,
              animation: 'slideInRight 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background:
                      selectedCard.priority === 'P0'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : selectedCard.priority === 'P1'
                        ? 'rgba(251, 191, 36, 0.2)'
                        : 'rgba(255, 255, 255, 0.08)',
                    color:
                      selectedCard.priority === 'P0'
                        ? '#f87171'
                        : selectedCard.priority === 'P1'
                        ? '#fbbf24'
                        : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {selectedCard.priority}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Task Details</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this task?')) {
                      boardStore.deleteCard(selectedCard.id)
                    }
                  }}
                  className="tap"
                  title="Delete task"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => boardStore.selectCard(null)}
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
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title Edit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Title</label>
                <input
                  type="text"
                  value={selectedCard.title}
                  onChange={(e) => boardStore.updateCard(selectedCard.id, { title: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 7,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status & Priority Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Status</label>
                  <select
                    value={selectedCard.column}
                    onChange={(e) => boardStore.moveCard(selectedCard.id, e.target.value as any)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Priority</label>
                  <select
                    value={selectedCard.priority}
                    onChange={(e) => boardStore.updateCard(selectedCard.id, { priority: e.target.value as any })}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee & Branch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Assigned Agent</label>
                  <select
                    value={selectedCard.assignedAgent}
                    onChange={(e) => boardStore.updateCard(selectedCard.id, { assignedAgent: e.target.value })}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {AGENTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Git Branch</label>
                  <input
                    type="text"
                    value={selectedCard.branch || ''}
                    placeholder="e.g. feat/new-feature"
                    onChange={(e) => boardStore.updateCard(selectedCard.id, { branch: e.target.value })}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Description Edit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>Description</label>
                <textarea
                  rows={3}
                  value={selectedCard.description || ''}
                  onChange={(e) => boardStore.updateCard(selectedCard.id, { description: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 7,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: 12,
                    lineHeight: 1.4,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Interactive Checklists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Checklist & Steps ({(selectedCard.checklists || []).filter((c) => c.done).length}/{(selectedCard.checklists || []).length})
                  </label>
                </div>

                {/* Progress bar */}
                {(selectedCard.checklists || []).length > 0 && (
                  <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${
                          ((selectedCard.checklists || []).filter((c) => c.done).length /
                            (selectedCard.checklists || []).length) *
                          100
                        }%`,
                        background: '#34d399',
                        transition: 'width 0.2s',
                      }}
                    />
                  </div>
                )}

                {/* Checklist items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(selectedCard.checklists || []).map((chk) => (
                    <div
                      key={chk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div
                        onClick={() => boardStore.toggleChecklist(selectedCard.id, chk.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}
                      >
                        {chk.done ? <CheckSquare size={14} color="#34d399" /> : <Square size={14} color="rgba(255, 255, 255, 0.4)" />}
                        <span
                          style={{
                            fontSize: 12,
                            color: chk.done ? 'rgba(255, 255, 255, 0.45)' : '#ffffff',
                            textDecoration: chk.done ? 'line-through' : 'none',
                          }}
                        >
                          {chk.text}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => boardStore.removeChecklist(selectedCard.id, chk.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.3)', cursor: 'pointer', padding: 2 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add checklist input */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add step..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newChecklistText.trim()) {
                          boardStore.addChecklist(selectedCard.id, newChecklistText.trim())
                          setNewChecklistText('')
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: 11.5,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistText.trim()) {
                        boardStore.addChecklist(selectedCard.id, newChecklistText.trim())
                        setNewChecklistText('')
                      }
                    }}
                    className="tap"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Autonomous Run Action */}
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => handleExecute(selectedCard)}
                  className="tap"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #34d399, #10b981)',
                    border: 'none',
                    color: '#000000',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(52, 211, 153, 0.3)',
                  }}
                >
                  <Play size={14} fill="#000000" />
                  <span>Execute with {selectedCard.assignedAgent}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

