/**
 * The bottom user menu popover in the rail with Linear.app style liquid-glass aesthetics,
 * org switcher, account controls, and appearance options.
 */
import { api } from '../data/api.ts'
import {
  ChevronsUpDown,
  ExternalLink,
  LogOut,
  Settings,
  User,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useRef, useState, type CSSProperties } from 'react'


export interface AccountProps {
  name: string
  email?: string
  avatar?: string
  collapsed?: boolean
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
  onSettings,
  accountHref,
  plansHref,
  helpHref = api.docs,
  onSignOut,
}: AccountProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
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

          </div>

          {helpHref ? (
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
          ) : null}

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
