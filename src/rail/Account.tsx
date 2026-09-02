/**
 * The bottom user menu popover in the rail with Linear.app style liquid-glass aesthetics,
 * org switcher, account controls, and appearance options.
 */
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { brand, brands } from '~/brand'

export interface AccountProps {
  name: string
  email?: string
  avatar?: string
  collapsed?: boolean
  onFiles?: () => void
  onSettings?: () => void
  accountHref?: string
  plansHref?: string
  helpHref?: string
  onSignOut?: () => void
}

const POPOVER_STYLE: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: 8,
  width: 250,
  background: 'rgba(18, 18, 24, 0.95)',
  backdropFilter: 'blur(28px) saturate(190%)',
  WebkitBackdropFilter: 'blur(28px) saturate(190%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 14,
  boxShadow: '0 16px 48px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  padding: '10px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  zIndex: 1000,
  animation: 'popoverIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
}

const ITEM_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 10px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.85)',
  background: 'transparent',
  border: 'none',
  width: '100%',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s ease',
}

const away = (href: string) => () => {
  if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener')
}

export function Account({
  name,
  email,
  avatar,
  collapsed = false,
  onFiles,
  onSettings,
  accountHref,
  plansHref,
  helpHref = 'https://docs.hanzo.ai',
  onSignOut,
}: AccountProps) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [orgOpen, setOrgOpen] = useState(false)
  const [currentOrg, setCurrentOrg] = useState(brand.org)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setOrgOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', clickOutside)
    }
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [open])

  const monogram = name ? name.charAt(0).toUpperCase() : 'Z'

  return (
    <div
      ref={ref}
      style={{
        paddingTop: 8,
        marginTop: 4,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        width: '100%',
      }}
      data-testid="rail-account"
    >
      {/* Popover Menu */}
      {open && (
        <div style={POPOVER_STYLE}>
          {/* User Header */}
          <div
            style={{
              padding: '6px 10px 10px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {name}
            </div>
            {email && (
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: 1,
                }}
              >
                {email}
              </div>
            )}

            {/* Org Switcher Pill */}
            <div style={{ marginTop: 8, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOrgOpen(!orgOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  textTransform: 'lowercase',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                    }}
                  />
                  <span>{currentOrg}</span>
                </div>
                <ChevronDown size={12} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </button>

              {orgOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(24, 24, 30, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                    padding: 4,
                    zIndex: 1010,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  {brands.map((b) => (
                    <button
                      key={b.org}
                      type="button"
                      onClick={() => {
                        setCurrentOrg(b.org)
                        setOrgOpen(false)
                      }}
                      style={{
                        ...ITEM_STYLE,
                        padding: '6px 8px',
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{b.org}</span>
                      {currentOrg === b.org && <Check size={12} style={{ color: '#10b981' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Items */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onFiles?.()
            }}
            style={ITEM_STYLE}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
              <span>My Files</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              away(helpHref)()
            }}
            style={ITEM_STYLE}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExternalLink size={14} style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
              <span>Help & FAQ</span>
            </div>
          </button>

          {accountHref && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                away(accountHref)()
              }}
              style={ITEM_STYLE}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
                <span>Account</span>
              </div>
            </button>
          )}

          {plansHref && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                away(plansHref)()
              }}
              style={ITEM_STYLE}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={14} style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
                <span>Plans</span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onSettings?.()
            }}
            style={ITEM_STYLE}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={14} style={{ color: 'rgba(255, 255, 255, 0.65)' }} />
              <span>Settings</span>
            </div>
            <kbd
              style={{
                fontSize: 10,
                padding: '2px 4px',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              ⌘,
            </kbd>
          </button>

          {/* Color Theme Selector */}
          <div
            style={{
              padding: '8px 10px 4px 10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              marginTop: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: 6,
              }}
            >
              Color theme
            </div>

            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{ ...ITEM_STYLE, padding: '5px 8px', fontSize: 12.5 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Sun size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check size={12} style={{ color: '#ffffff' }} />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{ ...ITEM_STYLE, padding: '5px 8px', fontSize: 12.5 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Moon size={13} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check size={12} style={{ color: '#ffffff' }} />}
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              style={{ ...ITEM_STYLE, padding: '5px 8px', fontSize: 12.5 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12 }}>💻</span>
                <span>Sync with system</span>
              </div>
              {theme === 'system' && <Check size={12} style={{ color: '#ffffff' }} />}
            </button>
          </div>

          {/* Log Out */}
          {onSignOut && (
            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: 4,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
                style={{
                  ...ITEM_STYLE,
                  color: '#f87171',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LogOut size={14} style={{ color: '#f87171' }} />
                  <span>Log out</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          width: '100%',
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: 10,
          background: open ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              {monogram}
            </div>
          )}

          {!collapsed && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 140,
                }}
              >
                {name}
              </span>
              {email && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255, 255, 255, 0.45)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 140,
                  }}
                >
                  {email}
                </span>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <ChevronsUpDown size={14} style={{ color: 'rgba(255, 255, 255, 0.45)', flexShrink: 0 }} />
        )}
      </button>
    </div>
  )
}
