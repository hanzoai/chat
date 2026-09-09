/**
 * Projects, and the org that owns them.
 *
 * One org, because the server derives it from the principal — so there is no
 * org switcher and no identity switcher here: both would be controls the API
 * ignores. What is switchable is which list you are looking at.
 */
import { Building2, FolderGit2, Plus, Star, UserCheck, X } from '@hanzogui/lucide-icons-2'
import { useState, type FormEvent } from 'react'

import { useSession } from '../data/session.tsx'

import { create, star, useProjects, usePeople } from './projects.ts'
import { projectsStore, useProjectPanel } from './store.ts'

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

export const ProjectModal = () => {
  const { isOpen, pane } = useProjectPanel()
  const { standing, user } = useSession()
  const live = standing === 'live'
  const on = isOpen && live

  // `user.role` carries the account's `owner`, which IS the org — the same one
  // /v1/project is keyed by, so nothing here has to ask a second time.
  const org = user?.role

  const projects = useProjects(on)
  const people = usePeople(org, on && pane === 'people')

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

  const add = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    void attempt(create(name.trim()))
    setName('')
  }

  const read = pane === 'projects' ? projects : people
  const rows = read.data ?? []

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
      onClick={() => projectsStore.close()}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {([
              { id: 'projects', label: 'Projects', icon: FolderGit2 },
              { id: 'people', label: 'People', icon: UserCheck },
            ] as const).map((tab) => {
              const Icon = tab.icon
              const active = pane === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => projectsStore.show(tab.id)}
                  className="tap"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: active ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} color={active ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)'} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {org && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.55)',
                }}
              >
                <Building2 size={13} color="rgba(255, 255, 255, 0.4)" />
                {org}
              </span>
            )}
            <button
              type="button"
              onClick={() => projectsStore.close()}
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

        <div style={{ flex: 1, minHeight: 0, display: 'grid', alignContent: 'start', padding: 18, gap: 14 }}>
          {pane === 'projects' && (
            <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="New project name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ ...field, flex: 1 }}
              />
              <button
                type="submit"
                className="tap"
                disabled={!name.trim()}
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
          )}

          {refused && (
            <div style={{ fontSize: 11.5, color: '#f87171' }}>
              The server refused that: {refused}
            </div>
          )}

          {!live && note('Sign in to read your org’s projects.')}
          {live && read.pending && rows.length === 0 && note('Reading…')}
          {live && !read.pending && read.error != null && note('The server refused this read.')}
          {live && !read.pending && read.error == null && rows.length === 0 &&
            note(pane === 'projects' ? 'This org owns no projects.' : 'This org lists nobody.')}

          {live && pane === 'projects' && projects.data && projects.data.length > 0 && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
                alignContent: 'start',
              }}
            >
              {projects.data.map((project) => (
                <div
                  key={project.slug}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'grid', alignContent: 'start',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'grid', alignContent: 'start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                        {project.name}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.4 }}>
                        {project.description || project.slug}
                      </span>
                    </div>

                    <button
                      type="button"
                      title={project.starred ? 'Remove your bookmark' : 'Bookmark this for yourself'}
                      onClick={() => void attempt(star(project.slug, !project.starred))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                        color: project.starred ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      <Star size={14} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 11,
                      color: 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    <span>
                      {project.status ?? 'draft'}
                      {project.framework ? ` · ${project.framework}` : ''}
                      {project.visibility ? ` · ${project.visibility}` : ''}
                    </span>
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                      >
                        live
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {live && pane === 'people' && people.data && people.data.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 8 }}>
              {people.data.map((person) => (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9999,
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {(person.displayName || person.name).slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                      {person.displayName || person.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' }}>
                      {person.email || person.id}
                      {person.service ? ' · service account' : ''}
                      {person.admin ? ' · admin' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
