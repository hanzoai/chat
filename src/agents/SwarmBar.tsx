/**
 * Which agents this conversation is addressing.
 *
 * The chips are the org's own agents, read from `/v1/agents` — there is no
 * roster of specialists shipped in the client, so an org that has defined none
 * sees none rather than five that do not exist. Selecting one is local: no
 * route records who a conversation is addressed to.
 */
import { Check, Plus, Users } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useEffect, useRef, useState } from 'react'
import type { Agent } from '@hanzo/ai'

import { useMultiplayer } from '~/presence/store'
import { none, swarmStore, unread, useAgents, useSwarm } from './store'

/** An agent's face: the glyph somebody picked, or its initial. */
const face = (agent: Agent) => agent.emoji || agent.name.charAt(0).toUpperCase()

export const SwarmBar = () => {
  const { activeAgentIds } = useSwarm()
  const { participants } = useMultiplayer()
  const agents = useAgents()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false)
    }
    if (isMenuOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [isMenuOpen])

  const listed = agents.data ?? []
  const selected = listed.filter((a) => activeAgentIds.includes(a.name))

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
        <XStack alignItems="center" gap="$2" flexWrap="wrap" flex={1}>
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
              border: isMenuOpen
                ? '1px solid rgba(52, 211, 153, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              color: isMenuOpen ? '#34d399' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={13} style={{ color: isMenuOpen ? '#34d399' : '#ffffff' }} />
            <span>Add</span>
          </button>

          {selected.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => swarmStore.toggleAgent(agent.name)}
              className="tap"
              title={agent.description || agent.model}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(52, 211, 153, 0.14)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#34d399',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              <span>{face(agent)}</span>
              <span>{agent.name}</span>
            </button>
          ))}

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
      </XStack>

      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 320,
            borderRadius: 14,
            background:
              'linear-gradient(180deg, rgba(24, 24, 30, 0.95) 0%, rgba(14, 14, 18, 0.95) 100%)',
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
          <YStack gap="$1.5">
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.45)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Your Agents
            </div>

            {agents.error ? (
              <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                {unread}
              </SizableText>
            ) : listed.length === 0 && !agents.pending ? (
              <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                {none}
              </SizableText>
            ) : (
              listed.map((agent) => {
                const active = activeAgentIds.includes(agent.name)
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => swarmStore.toggleAgent(agent.name)}
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
                          background: 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {face(agent)}
                      </div>
                      <YStack>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{agent.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)' }}>
                          {agent.description || agent.model}
                        </div>
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
              })
            )}
          </YStack>
        </div>
      )}
    </div>
  )
}
