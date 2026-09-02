/**
 * Project, Organization, and Multi-User Identity Modal.
 * Supports 1-click Org switching, User switching, Project creation, and runtime dispatch.
 */
import {
  Building2,
  Check,
  FolderGit2,
  Plus,
  UserCheck,
  X,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { projectsStore, useProjects } from './store'

export const ProjectModal = () => {
  const {
    isOpen,
    activeOrgId,
    activeUserId,
    activeProjectId,
    organizations,
    users,
    projects,
  } = useProjects()

  const [activeTab, setActiveTab] = useState<'projects' | 'orgs' | 'users'>('projects')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newOrgName, setNewOrgName] = useState('')

  if (!isOpen) return null

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0]
  const filteredProjects = projects.filter((p) => p.orgId === activeOrgId)

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (newProjectName.trim()) {
      projectsStore.createProject(newProjectName.trim(), newProjectDesc.trim() || 'Next.js 16 fullstack application')
      setNewProjectName('')
      setNewProjectDesc('')
    }
  }

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault()
    if (newOrgName.trim()) {
      projectsStore.createOrg(newOrgName.trim(), newOrgName.trim().toLowerCase())
      setNewOrgName('')
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { id: 'projects', label: 'Projects', icon: FolderGit2, count: filteredProjects.length },
              { id: 'orgs', label: 'Organizations', icon: Building2, count: organizations.length },
              { id: 'users', label: 'Identities & Users', icon: UserCheck, count: users.length },
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
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} color={isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)'} />
                  <span>{tab.label}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.6, background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: 9999 }}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

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

        {/* Content Area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: 18, gap: 16 }}>
          {/* TAB 1: PROJECTS */}
          {activeTab === 'projects' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    Active Organization: <span style={{ color: '#60a5fa' }}>{activeOrg.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Isolated repositories, worktrees, sandbox runtime pods, and agent swarms.
                  </div>
                </div>
              </div>

              {/* Create Project Input */}
              <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="New project name (e.g. Next.js 16 Storefront)..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
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
                  <span>Create Project</span>
                </button>
              </form>

              {/* Projects Grid */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {filteredProjects.map((p) => {
                  const isSelected = p.id === activeProjectId
                  return (
                    <div
                      key={p.id}
                      onClick={() => projectsStore.setActiveProject(p.id)}
                      className="tap"
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: isSelected ? 'rgba(96, 165, 250, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>{p.name}</span>
                          {isSelected && <Check size={14} color="#60a5fa" />}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.4 }}>
                          {p.description}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                        <span>Target: <strong style={{ color: '#34d399' }}>{p.runtimeTarget}</strong></span>
                        <span>{p.updatedAt}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATIONS */}
          {activeTab === 'orgs' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    Organization Switcher
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                    Switch organization tenancy, IAM policies, and billing subscriptions.
                  </div>
                </div>
              </div>

              {/* Create Org Form */}
              <form onSubmit={handleCreateOrg} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="New organization name..."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
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
                  Create Org
                </button>
              </form>

              {/* Orgs List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {organizations.map((org) => {
                  const isSelected = org.id === activeOrgId
                  return (
                    <div
                      key={org.id}
                      onClick={() => projectsStore.setActiveOrg(org.id)}
                      className="tap"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: isSelected ? 'rgba(96, 165, 250, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#ffffff',
                          }}
                        >
                          {org.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff' }}>{org.name}</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' }}>
                            slug: {org.slug} • {org.membersCount} members • Tier: <strong style={{ color: '#a78bfa' }}>{org.tier}</strong>
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check size={16} color="#60a5fa" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: USERS & IDENTITIES */}
          {activeTab === 'users' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                  User & Identity Switcher
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                  Switch acting identity, IAM role permissions, and local dev credentials.
                </div>
              </div>

              {/* Users List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map((u) => {
                  const isSelected = u.id === activeUserId
                  return (
                    <div
                      key={u.id}
                      onClick={() => projectsStore.setActiveUser(u.id)}
                      className="tap"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: isSelected ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9999,
                            background: isSelected ? '#34d399' : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: isSelected ? '#000000' : '#ffffff',
                          }}
                        >
                          {u.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff' }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' }}>
                            {u.email} • Role: <strong style={{ color: '#34d399' }}>{u.role}</strong>
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check size={16} color="#34d399" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
