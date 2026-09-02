import {
  Bot,
  Compass,
  Hash,
  Lock,
  Plus,
  Users,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { channelsStore, useChannels, type ChatRoom } from './store'

export const ChannelSection = () => {
  const { rooms, activeRoomId } = useChannels()

  const channels = rooms.filter((r) => r.type === 'channel')
  const dms = rooms.filter((r) => r.type === 'dm')
  const groups = rooms.filter((r) => r.type === 'group')

  const getGroupLabel = (r: ChatRoom) => {
    if (r.name) return r.name
    // Informal group label derived from participant count
    return `Group (${r.members.length} members)`
  }

  return (
    <YStack gap="$2" paddingVertical="$1">
      {/* Channels Section */}
      <YStack gap="$0.5">
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2" paddingBottom="$1">
          <SizableText size="$1" fontWeight="700" color="$faint" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            Channels
          </SizableText>
          <XStack alignItems="center" gap="$1">
            <button
              type="button"
              onClick={() => channelsStore.openBrowse()}
              title="Explore & Follow Global Channels"
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

            <button
              type="button"
              onClick={() => channelsStore.openCreate('channel')}
              title="Create new channel"
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
            >
              <Plus size={11} />
            </button>
          </XStack>
        </XStack>

        {channels.map((chan) => {
          const isActive = chan.id === activeRoomId
          return (
            <button
              key={chan.id}
              type="button"
              onClick={() => channelsStore.setActiveRoom(chan.id)}
              className="tap"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
            >
              <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                {chan.isPrivate ? (
                  <Lock size={12} color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'} />
                ) : (
                  <Hash size={13} color={isActive ? '#34d399' : 'rgba(255, 255, 255, 0.4)'} />
                )}
                <SizableText
                  size="$1"
                  fontWeight={isActive ? '600' : '400'}
                  color="$ink"
                  numberOfLines={1}
                  style={{
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                    fontSize: 12,
                  }}
                >
                  {chan.name}
                </SizableText>
              </XStack>

              {chan.unreadCount && chan.unreadCount > 0 ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '18px',
                    textAlign: 'center',
                    background: '#34d399',
                    color: '#000000',
                    flexShrink: 0,
                  }}
                >
                  {chan.unreadCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </YStack>

      {/* Direct Messages & Agents Section */}
      <YStack gap="$0.5" paddingTop="$1">
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2" paddingBottom="$1">
          <SizableText size="$1" fontWeight="700" color="$faint" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            Direct Messages & Agents
          </SizableText>
          <button
            type="button"
            onClick={() => channelsStore.openCreate('dm')}
            title="New Direct Message"
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
          >
            <Plus size={11} />
          </button>
        </XStack>

        {dms.map((dm) => {
          const isActive = dm.id === activeRoomId
          const isAgent = dm.name?.startsWith('@')
          return (
            <button
              key={dm.id}
              type="button"
              onClick={() => channelsStore.setActiveRoom(dm.id)}
              className="tap"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
            >
              <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                {isAgent ? (
                  <Bot size={13} color={isActive ? '#818cf8' : 'rgba(129, 140, 248, 0.6)'} />
                ) : (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 9999,
                      background: '#34d399',
                      boxShadow: '0 0 4px #34d399',
                    }}
                  />
                )}
                <SizableText
                  size="$1"
                  fontWeight={isActive ? '600' : '400'}
                  color="$ink"
                  numberOfLines={1}
                  style={{
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                    fontSize: 12,
                  }}
                >
                  {dm.name}
                </SizableText>
              </XStack>

              {dm.unreadCount && dm.unreadCount > 0 ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '18px',
                    textAlign: 'center',
                    background: isAgent ? '#818cf8' : '#34d399',
                    color: '#000000',
                    flexShrink: 0,
                  }}
                >
                  {dm.unreadCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </YStack>

      {/* Informal Groups Section */}
      <YStack gap="$0.5" paddingTop="$1">
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2" paddingBottom="$1">
          <SizableText size="$1" fontWeight="700" color="$faint" style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            Informal Groups
          </SizableText>
          <button
            type="button"
            onClick={() => channelsStore.openCreate('group')}
            title="Create informal group"
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
          >
            <Plus size={11} />
          </button>
        </XStack>

        {groups.map((grp) => {
          const isActive = grp.id === activeRoomId
          return (
            <button
              key={grp.id}
              type="button"
              onClick={() => channelsStore.setActiveRoom(grp.id)}
              className="tap"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.12s ease',
              }}
            >
              <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                <Users size={13} color={isActive ? '#fbbf24' : 'rgba(251, 191, 36, 0.6)'} />
                <SizableText
                  size="$1"
                  fontWeight={isActive ? '600' : '400'}
                  color="$ink"
                  numberOfLines={1}
                  style={{
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                    fontSize: 12,
                  }}
                >
                  {getGroupLabel(grp)}
                </SizableText>
              </XStack>
            </button>
          )
        })}
      </YStack>
    </YStack>
  )
}
