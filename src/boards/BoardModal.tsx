/**
 * The board.
 *
 * Five columns because the server names five, and the cards in them are
 * `/v1/todo/board`'s rows. Moving one is a PATCH of its status; taking one is
 * `claim`, which is a distinct act because the holder is the CALLER and never
 * an argument. Nothing here deletes a card and nothing here keeps a checklist:
 * the surface publishes no route for either.
 */
import { ArrowLeft, ArrowRight, Hand, Kanban, Plus, Search, X } from '@hanzogui/lucide-icons-2'
import { useState, type FormEvent } from 'react'

import { useSession } from '../data/session.tsx'

import { boardStore, useBoard } from './store.ts'
import {
  COLUMNS,
  PRIORITIES,
  claim,
  edit,
  file,
  useBoards,
  useIssues,
  useSearch,
  type Column,
  type Issue,
  type Priority,
} from './todo.ts'

const columnLook: Record<Column, { title: string; color: string }> = {
  backlog: { title: 'Backlog', color: 'rgba(255, 255, 255, 0.4)' },
  todo: { title: 'Todo', color: '#a78bfa' },
  in_progress: { title: 'In Progress', color: '#60a5fa' },
  done: { title: 'Done', color: '#34d399' },
  canceled: { title: 'Canceled', color: '#f87171' },
}

const priorityLook: Record<Priority, { color: string; bg: string }> = {
  urgent: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.2)' },
  high: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' },
  medium: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)' },
  low: { color: 'rgba(255, 255, 255, 0.6)', bg: 'rgba(255, 255, 255, 0.08)' },
  none: { color: 'rgba(255, 255, 255, 0.4)', bg: 'rgba(255, 255, 255, 0.05)' },
}

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

export const BoardModal = () => {
  const { isOpen, key, search, card } = useBoard()
  const { standing } = useSession()
  const live = standing === 'live'
  const on = isOpen && live

  const boards = useBoards(on)
  const held = useIssues(key, on && search.trim() === '')
  const found = useSearch(search, on)
  const searching = search.trim().length > 0
  const read = searching ? found : held
  const cards = read.data ?? []

  const [title, setTitle] = useState('')
  // The typed text and the SEARCHED text are two values on purpose: every
  // committed one is a request, so it is committed on Enter and when the box
  // is emptied, not on every keystroke.
  const [typed, setTyped] = useState(search)
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

  const add = (event: FormEvent) => {
    event.preventDefault()
    if (!key || !title.trim()) return
    void attempt(file(key, { title: title.trim() }))
    setTitle('')
  }

  const move = (issue: Issue, by: number) => {
    const at = COLUMNS.indexOf(issue.status)
    const next = COLUMNS[at + by]
    if (!next) return
    void attempt(edit(issue.projectKey, issue.number, { status: next }))
  }

  const chosen = cards.find((one) => one.identifier === card) ?? null

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
      onClick={() => boardStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Kanban size={18} color="#60a5fa" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Board</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Your org’s work. A column is a label on the forge, so a move here moves it there.
              </div>
            </div>
          </div>

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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <select
            value={key}
            onChange={(e) => boardStore.pick(e.target.value)}
            style={{ ...field, maxWidth: 240 }}
          >
            <option value="">All work</option>
            {(boards.data ?? []).map((one) => (
              <option key={one.key} value={one.key}>
                {one.name || one.key}
              </option>
            ))}
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              boardStore.find(typed)
            }}
            style={{ position: 'relative', flex: 1 }}
          >
            <Search
              size={13}
              color="rgba(255, 255, 255, 0.35)"
              style={{ position: 'absolute', left: 10, top: 10 }}
            />
            <input
              type="search"
              placeholder="Search every board, then press Enter…"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                if (e.target.value.trim() === '') boardStore.find('')
              }}
              style={{ ...field, width: '100%', paddingLeft: 30 }}
            />
          </form>

          <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder={key ? 'New issue…' : 'Pick a board to open one'}
              value={title}
              disabled={!key}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...field, width: 220, opacity: key ? 1 : 0.5 }}
            />
            <button
              type="submit"
              className="tap"
              disabled={!key || !title.trim()}
              title={key ? 'Open this on the board' : 'An issue is filed onto one board'}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontSize: 12,
                fontWeight: 600,
                cursor: key && title.trim() ? 'pointer' : 'not-allowed',
                opacity: key && title.trim() ? 1 : 0.4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} />
              <span>Open</span>
            </button>
          </form>
        </div>

        {refused && (
          <div style={{ padding: '8px 18px', fontSize: 11.5, color: '#f87171' }}>
            The server refused that: {refused}
          </div>
        )}

        {!live && note('Sign in to read your org’s board.')}
        {live && read.pending && cards.length === 0 && note('Reading the board…')}
        {live && !read.pending && read.error != null && note('The server refused this read.')}
        {live && !read.pending && read.error == null && cards.length === 0 &&
          note(searching ? 'Nothing matched.' : 'This board has no work on it.')}

        {live && cards.length > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: 14, overflowX: 'auto' }}>
            {COLUMNS.map((column) => {
              const look = columnLook[column]
              const inColumn = cards.filter((one) => one.status === column)
              return (
                <div
                  key={column}
                  style={{
                    width: 260,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: look.color }}>
                      {look.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.35)' }}>
                      {inColumn.length}
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {inColumn.map((issue) => {
                      const priority = priorityLook[issue.priority] ?? priorityLook.none
                      return (
                        <div
                          key={issue.identifier}
                          onClick={() => boardStore.select(issue.identifier)}
                          className="tap"
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.03)',
                            border:
                              card === issue.identifier
                                ? '1px solid rgba(96, 165, 250, 0.5)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: priority.bg,
                                color: priority.color,
                              }}
                            >
                              {issue.priority.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                              {issue.identifier}
                            </span>
                            {issue.assignee && (
                              <span style={{ fontSize: 10.5, color: '#a78bfa', marginLeft: 'auto' }}>
                                {issue.assignee}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', lineHeight: 1.35 }}>
                            {issue.title}
                          </div>

                          {issue.labels.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {issue.labels.map((label) => (
                                <span
                                  key={label}
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                  }}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 4,
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!issue.assignee ? (
                              <button
                                type="button"
                                className="tap"
                                title="Take this issue — it becomes yours and moves to in progress"
                                onClick={() => void attempt(claim(issue.projectKey, issue.number))}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 8px',
                                  borderRadius: 5,
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  border: '1px solid rgba(52, 211, 153, 0.3)',
                                  color: '#34d399',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Hand size={10} />
                                <span>Claim</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.35)' }}>
                                held
                              </span>
                            )}

                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                title="Move left"
                                onClick={() => move(issue, -1)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 5,
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  cursor: 'pointer',
                                  padding: '2px 5px',
                                }}
                              >
                                <ArrowLeft size={11} />
                              </button>
                              <button
                                type="button"
                                title="Move right"
                                onClick={() => move(issue, 1)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: 5,
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  cursor: 'pointer',
                                  padding: '2px 5px',
                                }}
                              >
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {chosen && (
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>
              {chosen.identifier}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', flex: 1, minWidth: 200 }}>
              {chosen.description || chosen.title}
            </span>

            <select
              value={chosen.priority}
              onChange={(e) =>
                void attempt(
                  edit(chosen.projectKey, chosen.number, { priority: e.target.value as Priority }),
                )
              }
              style={field}
            >
              {PRIORITIES.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>

            <select
              value={chosen.status}
              onChange={(e) =>
                void attempt(
                  edit(chosen.projectKey, chosen.number, { status: e.target.value as Column }),
                )
              }
              style={field}
            >
              {COLUMNS.map((one) => (
                <option key={one} value={one}>
                  {columnLook[one].title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => boardStore.select(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
