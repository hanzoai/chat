/**
 * Participant & Agent Swarm Bar.
 *
 * Allows 1-click addition of AI agents (@dev, @planner, @secops, etc.)
 * and multiplayer teammates/humans to the chat session.
 */
import {
  Brain,
  Check,
  Code,
  Plus,
  Search,
  Shield,
  UserPlus,
  Users,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useEffect, useRef, useState } from 'react'
import { multiplayerStore, useMultiplayer } from '~/presence/store'
import { AGENT_ROSTER, type AgentDefinition } from './types'
import { swarmStore, useSwarm } from './store'

const iconFor = (iconName: string) => {
  switch (iconName) {
    case 'brain':
      return Brain
    case 'code':
      return Code
    case 'shield':
      return Shield
    case 'search':
      return Search
    case 'zap':
    default:
      return Zap
  }
}

export const SwarmBar = () => {
  const { activeAgentIds, isExecuting, activePhase } = useSwarm()
  const { participants } = useMultiplayer()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', onDocClick)
    }
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [isMenuOpen])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 768,
        alignSelf: 'center',
        marginBottom: 8,
        zIndex: 30,
      }}
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingVertical="$1.5"
        borderRadius={14}
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.1)"
        backgroundColor="rgba(255, 255, 255, 0.025)"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: + Add Button and Active Participant Chips */}
        <XStack alignItems="center" gap="$2" flexWrap="wrap" flex={1}>
          {/* + Add Agent or Teammate Button */}
          <button
            type="button"
            data-testid="swarm-add-participant"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="tap"
            title="Add agents or teammates to chat"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 600,
              background: isMenuOpen ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: isMenuOpen ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isMenuOpen ? '#34d399' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={13} style={{ color: isMenuOpen ? '#34d399' : '#ffffff' }} />
            <span>Add</span>
          </button>

          {/* Active Agents */}
          {AGENT_ROSTER.map((agent: AgentDefinition) => {
            const active = activeAgentIds.includes(agent.id)
            const Icon = iconFor(agent.iconName)

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => swarmStore.toggleAgent(agent.id)}
                className="tap"
                title={`${agent.name}: ${agent.role}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: active ? `${agent.badgeColor}22` : 'transparent',
                  border: active
                    ? `1px solid ${agent.badgeColor}66`
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  color: active ? agent.badgeColor : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                <Icon size={11} />
                <span>{agent.handle}</span>
              </button>
            )
          })}

          {/* Active Teammates (Multiplayer Humans) */}
          {participants.length > 1 &&
            participants.slice(1).map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#60a5fa',
                }}
              >
                <Users size={10} />
                <span>{p.name}</span>
              </span>
            ))}
        </XStack>

        {/* Right: Active Swarm Phase Status */}
        {isExecuting && activePhase && (
          <XStack alignItems="center" gap="$1.5" flexShrink={0}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: '#34d399',
                boxShadow: '0 0 8px #34d399',
              }}
            />
            <SizableText size="$1" color="$ink" style={{ fontSize: 11, color: '#34d399' }}>
              {activePhase}
            </SizableText>
          </XStack>
        )}
      </XStack>

      {/* Add Participant / Agent Dropdown Popover */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 320,
            borderRadius: 14,
            background: 'linear-gradient(180deg, rgba(24, 24, 30, 0.95) 0%, rgba(14, 14, 18, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            zIndex: 50,
          }}
        >
          {/* Section 1: AI Agents */}
          <YStack gap="$1.5">
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Specialized AI Agents
            </div>
            {AGENT_ROSTER.map((agent: AgentDefinition) => {
              const active = activeAgentIds.includes(agent.id)
              const Icon = iconFor(agent.iconName)

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => swarmStore.toggleAgent(agent.id)}
                  className="tap"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: active ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <XStack alignItems="center" gap="$2.5">
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: `${agent.badgeColor}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: agent.badgeColor,
                      }}
                    >
                      <Icon size={12} />
                    </div>
                    <YStack>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{agent.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)' }}>{agent.role}</div>
                    </YStack>
                  </XStack>

                  {active ? (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9999,
                        background: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                      }}
                    >
                      <Check size={11} strokeWidth={3} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9999,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </YStack>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Section 2: Invite Humans / Teammates */}
          <YStack gap="$1.5">
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Multiplayer Teammates
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false)
                multiplayerStore.openInvite()
              }}
              className="tap"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(129, 140, 248, 0.2))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <UserPlus size={14} style={{ color: '#60a5fa' }} />
              <span>Invite Teammate via Email</span>
            </button>
          </YStack>
        </div>
      )}
    </div>
  )
}
