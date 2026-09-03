/**
 * MCP Skills & Native Connectors Settings Tab.
 */
import { Blocks, ExternalLink, Power } from '@hanzogui/lucide-icons-2'
import { Paragraph, SizableText, XStack, YStack } from '@hanzo/ui'
import { row, rows } from '@hanzo/ui/glass'
import { mcpStore, useMcp } from '../mcp/store.ts'

export function McpSettings() {
  const { servers } = useMcp()

  return (
    <YStack rowGap="$5" paddingVertical="$2">
      <XStack alignItems="center" justifyContent="space-between">
        <YStack rowGap="$1">
          <SizableText fontSize="$3" fontWeight="600" color="$color">
            Installed MCP Connectors & Skills
          </SizableText>
          <Paragraph fontSize="$1" color="$color11">
            Native stdio CLI binaries and SSE tool servers connected to your agent swarm.
          </Paragraph>
        </YStack>

        <button
          type="button"
          onClick={() => mcpStore.open()}
          className="tap"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#ffffff',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={12} />
          <span>Manage in Hub (⌘M)</span>
        </button>
      </XStack>

      {/* Installed Servers List */}
      <YStack {...rows}>
        {servers.map((server) => {
          const isConnected = server.status === 'connected'

          return (
            <XStack key={server.id} {...row} alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap="$2.5" flex={1} minWidth={0}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isConnected ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Blocks size={14} />
                </div>
                <YStack minWidth={0} flex={1}>
                  <XStack alignItems="center" gap="$2">
                    <SizableText fontSize="$2" fontWeight="600" color="$color">
                      {server.name}
                    </SizableText>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: isConnected ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                        color: isConnected ? '#34d399' : 'rgba(255, 255, 255, 0.4)',
                      }}
                    >
                      {server.toolsCount} tools • v{server.version}
                    </span>
                  </XStack>
                  <Paragraph fontSize="$1" color="$color11" numberOfLines={1}>
                    {server.description}
                  </Paragraph>
                </YStack>
              </XStack>

              <button
                type="button"
                onClick={() => mcpStore.toggleServerStatus(server.id)}
                className="tap"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  borderRadius: 6,
                  background: isConnected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  border: isConnected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
                  color: isConnected ? '#f87171' : '#34d399',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Power size={11} />
                <span>{isConnected ? 'Disable' : 'Enable'}</span>
              </button>
            </XStack>
          )
        })}
      </YStack>
    </YStack>
  )
}
