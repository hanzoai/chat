/**
 * The header's people stack.
 *
 * The avatars are the org's roster, self first. There is no status dot: nothing
 * on this wire publishes who is online, and a dot lit for everybody is worse
 * than no dot at all. An empty stack is a roster that has not landed or was
 * refused, and the panel behind it says which.
 *
 * The swarm and terminal toggles ride here because this is the header's control
 * cluster; their state belongs to `~/agents` and `~/terminal`.
 */
import { Terminal, Users, Zap } from '@hanzogui/lucide-icons-2'
import { XStack } from '@hanzo/ui'

import { initial, label, tint } from './person'
import { multiplayerStore, useMultiplayer } from './store'
import { terminalStore, useTerminal } from '~/terminal/store'
import { swarmStore, useSwarm } from '~/agents/store'

export const PresenceStack = () => {
  const { participants } = useMultiplayer()
  const { isOpen: isTerminalOpen } = useTerminal()
  const { swarmMode } = useSwarm()

  return (
    <XStack alignItems="center" gap="$2">
      {/* Multi-Agent Swarm Toggle */}
      <button
        type="button"
        onClick={() => swarmStore.setSwarmMode(!swarmMode)}
        className="tap"
        title="Toggle Multi-Agent Swarm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 6,
          background: swarmMode
            ? 'linear-gradient(135deg, rgba(129, 140, 248, 0.25), rgba(52, 211, 153, 0.25))'
            : 'rgba(255, 255, 255, 0.04)',
          border: swarmMode
            ? '1px solid rgba(129, 140, 248, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          color: swarmMode ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Zap size={12} style={{ color: swarmMode ? '#34d399' : 'currentColor' }} />
        <span>Swarm</span>
      </button>

      {/* Cloud Sandbox & Terminal Toggle */}
      <button
        type="button"
        onClick={() => terminalStore.toggle()}
        className="tap"
        title="Toggle Cloud Sandbox & Terminal"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 6,
          background: isTerminalOpen ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
          border: isTerminalOpen
            ? '1px solid rgba(52, 211, 153, 0.35)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          color: isTerminalOpen ? '#34d399' : 'rgba(255, 255, 255, 0.75)',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Terminal size={12} />
        <span>Terminal</span>
      </button>

      {/* The org's people */}
      <div
        onClick={() => multiplayerStore.openInvite()}
        title="Your organization"
        style={{ display: 'flex', alignItems: 'center', marginLeft: 4, cursor: 'pointer' }}
      >
        {participants.slice(0, 3).map((p, idx) => (
          <div
            key={p.id}
            title={label(p)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 9999,
              background: tint(p),
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              border: '2px solid #09090b',
              marginLeft: idx === 0 ? 0 : -6,
              opacity: p.active === false ? 0.4 : 1,
            }}
          >
            {initial(p)}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => multiplayerStore.openInvite()}
        className="tap"
        title="Your organization"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 9px',
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Users size={12} />
        <span>Team</span>
      </button>
    </XStack>
  )
}
