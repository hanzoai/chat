/**
 * The directory: which transports this org can send through, and what one room
 * actually said.
 *
 * It used to browse a network of public rooms with member counts and a Follow
 * button. There is no discovery route, no membership and no follow — so what it
 * shows now is the two things the server does answer: `/v1/channels`, which
 * reports every transport whether or not it is connected precisely so "no
 * Slack" and "Slack is down" read differently, and the messages of the room
 * selected in the rail, grouped out of `/v1/channels/inbox`.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { X } from '@hanzogui/lucide-icons-2'
import { useEffect } from 'react'

import { why } from '~/data/missing'
import { channelsStore, refusal, speaker, useChannels, useTransports, when } from './store'

const Note = ({ children }: { children: string }) => (
  <SizableText size="$1" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' }}>
    {children}
  </SizableText>
)

export const BrowseChannelsModal = () => {
  const { browsing, rooms, selected, signedIn } = useChannels()
  const transports = useTransports(signedIn && browsing)
  const room = rooms.find((r) => r.key === selected)

  useEffect(() => {
    if (!browsing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') channelsStore.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [browsing])

  if (!browsing) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => channelsStore.close()}
    >
      <YStack
        width="100%"
        maxWidth={640}
        maxHeight="85vh"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0e0e12"
        style={{ overflow: 'hidden', boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)' }}
        onClick={(e: any) => e.stopPropagation()}
        data-testid="browse-channels-modal"
      >
        <XStack
          alignItems="center"
          justifyContent="space-between"
          padding="$4"
          borderBottomWidth={1}
          borderColor="rgba(255, 255, 255, 0.08)"
        >
          <YStack gap="$0.5">
            <SizableText size="$3" fontWeight="700" style={{ color: '#ffffff' }}>
              Channels
            </SizableText>
            <SizableText size="$1" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              The transports your org has connected, and what has arrived on them.
            </SizableText>
          </YStack>
          <button
            type="button"
            onClick={() => channelsStore.close()}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </XStack>

        <YStack gap="$3" padding="$4" style={{ overflowY: 'auto' }}>
          {!signedIn ? (
            <Note>{why.anonymous}</Note>
          ) : transports.error ? (
            <Note>{refusal(transports.error)}</Note>
          ) : (
            (transports.data ?? []).map((transport) => (
              <XStack
                key={transport.id}
                alignItems="center"
                justifyContent="space-between"
                gap="$3"
                padding="$3"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.08)"
                backgroundColor="rgba(255, 255, 255, 0.03)"
              >
                <YStack gap="$0.5" minWidth={0}>
                  <XStack alignItems="center" gap="$2">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 9999,
                        background: transport.connected ? '#34d399' : 'rgba(255, 255, 255, 0.25)',
                      }}
                    />
                    <SizableText size="$2" fontWeight="700" style={{ color: '#ffffff' }}>
                      {transport.id}
                    </SizableText>
                  </XStack>
                  <SizableText size="$1" style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                    {transport.connected
                      ? `${transport.accountLabel || transport.account || 'connected'} · DMs ${transport.dmPolicy || 'unset'} · groups ${transport.groupPolicy || 'unset'}`
                      : 'Not connected.'}
                  </SizableText>
                </YStack>
                {transport.pendingPairing ? (
                  <SizableText
                    size="$1"
                    style={{
                      flexShrink: 0,
                      padding: '3px 8px',
                      borderRadius: 9999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: 'rgba(251, 191, 36, 0.15)',
                      color: '#fbbf24',
                    }}
                  >
                    {transport.pendingPairing} waiting to pair
                  </SizableText>
                ) : null}
              </XStack>
            ))
          )}

          {room ? (
            <YStack gap="$2" paddingTop="$2" borderTopWidth={1} borderColor="rgba(255, 255, 255, 0.08)">
              <SizableText
                size="$1"
                style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)' }}
              >
                {room.channel} · {room.roomId} · {room.roomKind}
              </SizableText>
              {room.messages.map((message) => (
                <YStack key={message.id} gap="$0.5">
                  <XStack alignItems="center" gap="$2">
                    <SizableText size="$1" style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>
                      {speaker(message)}
                    </SizableText>
                    <SizableText size="$1" style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.35)' }}>
                      {when(message.createdAt)}
                    </SizableText>
                  </XStack>
                  <SizableText size="$1" style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                    {message.text}
                  </SizableText>
                </YStack>
              ))}
            </YStack>
          ) : null}
        </YStack>
      </YStack>
    </div>
  )
}
