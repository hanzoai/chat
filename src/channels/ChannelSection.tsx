/**
 * The rooms people have written to, in the rail.
 *
 * ONE list, where there used to be three. The wire has no channel-versus-DM-
 * versus-group of its own: it stamps each message with `roomKind` — "dm",
 * "group" or "thread" — which records WHICH POLICY admitted it, so the kind
 * rides the row rather than splitting the list into sections the server does
 * not have.
 *
 * A row is written with the platform's own id, because that is the only name
 * there is: a Slack conversation is `C024BE91L` and a Telegram chat is a signed
 * integer. Dressing one up would be inventing a name nobody sent.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { Compass, Hash, MessageSquare } from '@hanzogui/lucide-icons-2'

import { why } from '~/data/missing'
import { channelsStore, refusal, useChannels, when } from './store'

const Note = ({ children }: { children: string }) => (
  <SizableText
    size="$1"
    color="$faint"
    style={{ padding: '4px 8px', fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}
  >
    {children}
  </SizableText>
)

export const ChannelSection = () => {
  const { rooms, pending, error, signedIn, selected } = useChannels()

  return (
    <YStack gap="$0.5" paddingVertical="$1">
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2" paddingBottom="$1">
        <SizableText
          size="$1"
          fontWeight="700"
          color="$faint"
          style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}
        >
          Channels
        </SizableText>
        <button
          type="button"
          onClick={() => channelsStore.open()}
          title="Connected transports"
          className="tap"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
          }}
          data-testid="browse-channels-trigger"
        >
          <Compass size={11} />
        </button>
      </XStack>

      {!signedIn ? (
        <Note>{why.anonymous}</Note>
      ) : error ? (
        <Note>{refusal(error)}</Note>
      ) : pending && !rooms.length ? (
        <Note>Reading…</Note>
      ) : !rooms.length ? (
        <Note>Nothing has arrived. Someone has to message the bot first.</Note>
      ) : (
        rooms.map((room) => {
          const active = room.key === selected
          return (
            <button
              key={room.key}
              type="button"
              onClick={() => {
                channelsStore.select(room.key)
                channelsStore.open()
              }}
              className="tap"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 2,
                padding: '5px 8px',
                borderRadius: 6,
                background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <XStack alignItems="center" gap="$2" minWidth={0}>
                {room.roomKind === 'dm' ? (
                  <MessageSquare size={12} color="rgba(255, 255, 255, 0.4)" />
                ) : (
                  <Hash size={13} color={active ? '#34d399' : 'rgba(255, 255, 255, 0.4)'} />
                )}
                <SizableText
                  size="$1"
                  color="$ink"
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                  }}
                >
                  {room.roomId}
                </SizableText>
                <SizableText size="$1" color="$faint" style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.35)' }}>
                  {room.channel}
                </SizableText>
              </XStack>
              <SizableText
                size="$1"
                color="$faint"
                numberOfLines={1}
                style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)', paddingLeft: 21 }}
              >
                {when(room.lastAt)} · {room.last.text}
              </SizableText>
            </button>
          )
        })
      )}
    </YStack>
  )
}
