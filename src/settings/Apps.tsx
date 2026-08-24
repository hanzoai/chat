import { Button, Paragraph, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { row, rows } from '@hanzo/ui/glass'
import { StatusTag } from '@hanzo/ui/product'

import type { McpServer, McpStatus } from '~/data/types'

export interface AppsProps {
  /** `GET /v1/chat/mcp/servers`. */
  servers?: McpServer[]
  /** `GET /v1/chat/mcp/connection/status`, keyed by server name. */
  status?: Record<string, McpStatus>
  loading?: boolean
  /** `POST /v1/chat/mcp/:serverName/reinitialize`. */
  onConnect?: (server: string) => void
}

/**
 * The apps this account has connected, and whether each one is reachable.
 *
 * The composer's tools menu decides which of them a MESSAGE may use; this
 * decides whether they are attached at all. Same servers, two questions — so
 * the row here carries the connect action and no checkbox, and the menu there
 * carries the checkbox.
 *
 * Every configured server is listed, not the subset the chat menu offers: a
 * server kept out of that menu still holds an account of yours, and hiding it
 * here is how a connection becomes impossible to revoke.
 *
 * `connectionState` reaches `StatusTag` unchanged — `connected`, `connecting`,
 * `error` are already the words its tone table reads — so there is no second
 * vocabulary for one state anywhere in this file.
 */
export function Apps({ servers, status, loading, onConnect }: AppsProps) {
  if (loading) {
    return (
      <YStack paddingVertical="$6" alignItems="center">
        <Spinner />
      </YStack>
    )
  }

  if (!servers || servers.length === 0) {
    return (
      <YStack rowGap="$2" paddingVertical="$4">
        <SizableText fontSize="$3" fontWeight="500" color="$color">
          No apps connected
        </SizableText>
        <Paragraph fontSize="$1" color="$color11">
          An app the deployment configures shows up here with the state of its connection, and can
          be reconnected from this list.
        </Paragraph>
      </YStack>
    )
  }

  return (
    <YStack {...rows} marginVertical="$2">
      {servers.map((server) => {
        const state = status?.[server.serverName]?.connectionState
        return (
          <XStack key={server.serverName} {...row}>
            <YStack minWidth={0} rowGap="$1">
              <SizableText fontSize="$3" fontWeight="500" color="$color" numberOfLines={1}>
                {server.title ?? server.serverName}
              </SizableText>
              {server.description ? (
                <Paragraph fontSize="$1" color="$color11" numberOfLines={2}>
                  {server.description}
                </Paragraph>
              ) : null}
            </YStack>
            <XStack alignItems="center" gap="$3" flexShrink={0}>
              <StatusTag status={state} />
              {/* Reconnecting is offered for everything that is not already
                  connected, `error` included — that IS the state a reconnect is
                  for, and a row reporting a failure with nothing to do about it
                  is a dead end. */}
              {onConnect && state !== 'connected' ? (
                <Button size="sm" variant="outline" onPress={() => onConnect(server.serverName)}>
                  Connect
                </Button>
              ) : null}
            </XStack>
          </XStack>
        )
      })}
    </YStack>
  )
}

export default Apps
