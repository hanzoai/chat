import { Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { Sidebar, SidebarHeader, SidebarNewChat } from '@hanzo/ui/chat'
import { scrim } from '@hanzo/ui/glass'
import { HanzoMark } from '@hanzo/ui/product'
import { Blocks, Kanban, LayoutGrid, ListTodo } from '@hanzogui/lucide-icons-2'
import { useRef, useState, type ReactNode } from 'react'

import { boardStore } from '~/boards/store'
import { ChannelSection } from '~/channels/ChannelSection'
import { mcpStore } from '~/mcp/store'
import { swarmStore } from '~/agents/store'
import { taskQueueStore } from '~/tasks/store'
import type { Convo } from '~/data/types'
import { Find } from './Find'
import { Hits } from './Hits'
import { List } from './List'

export const OPEN = 270
export const RAIL = 56
const DRAWER = 320

export interface RailProps {
  convos: readonly Convo[]
  activeId?: string | null
  /** Conversations with a turn in flight. */
  busy?: readonly string[]
  loading?: boolean
  /** There is another cursor to spend. */
  more?: boolean
  onEnd?: () => void

  open: boolean
  onOpenChange: (open: boolean) => void
  /** Below the breakpoint the column is an overlay. The shell decides when. */
  drawer?: boolean

  title?: string
  onOpen: (c: Convo) => void
  onNew: () => void
  /** Open the full-page manager. Absent → the row is not offered. */
  onAll?: () => void
  onQuery?: (query: string) => void
  /** The foot: `<Account/>` signed in, `<Visitor/>` signed out. */
  account?: ReactNode
}

export function Rail({
  convos,
  activeId,
  busy,
  loading,
  more,
  onEnd,
  open,
  onOpenChange,
  drawer = false,
  title = 'Hanzo Chat',
  onOpen,
  onNew,
  onAll,
  onQuery,
  account,
}: RailProps) {
  const [query, setQuery] = useState('')
  const [width, setWidth] = useState(OPEN)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(OPEN)

  const ask = (next: string) => {
    setQuery(next)
    onQuery?.(next)
  }

  const reach = (c: Convo) => {
    onOpen(c)
    if (drawer) onOpenChange(false)
  }

  const onMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const delta = moveEvent.clientX - startX.current
      const nextWidth = Math.min(480, Math.max(210, startWidth.current + delta))
      setWidth(nextWidth)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const column = (w: number) => (
    <Sidebar width={w}>
      <SidebarHeader title={title} onCollapse={() => onOpenChange(false)} />
      <SidebarNewChat onPress={onNew} />
      <button
        type="button"
        onClick={() => swarmStore.openHub()}
        className="tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 13,
          fontWeight: 600,
          color: '#ffffff',
          cursor: 'pointer',
          marginTop: 4,
          marginBottom: 6,
          width: '100%',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
        data-testid="rail-agents-and-apps"
      >
        <LayoutGrid size={15} style={{ color: '#60a5fa' }} />
        <span>Agents and Apps</span>
      </button>

      {/* Workspace & Build Tools Section */}
      <YStack gap="$1" marginBottom="$2">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          <button
            type="button"
            onClick={() => boardStore.open()}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            data-testid="rail-boards-link"
          >
            <Kanban size={13} style={{ color: '#34d399' }} />
            <span>Boards</span>
          </button>

          <button
            type="button"
            onClick={() => taskQueueStore.open()}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            data-testid="rail-tasks-link"
          >
            <ListTodo size={13} style={{ color: '#fbbf24' }} />
            <span>Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => mcpStore.open()}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            data-testid="rail-mcp-link"
          >
            <Blocks size={13} style={{ color: '#f472b6' }} />
            <span>MCP Hub</span>
          </button>
        </div>
      </YStack>

      {/* Channels Section */}
      <ChannelSection />

      <Find value={query} onChange={ask} />

      {query.trim() === '' ? (
        <List
          convos={convos}
          activeId={activeId}
          busy={busy}
          onOpen={reach}
          onEnd={onEnd}
          more={more}
          loading={loading}
        />
      ) : (
        <Hits
          convos={convos}
          query={query}
          activeId={activeId}
          busy={busy}
          onOpen={reach}
        />
      )}

      {onAll ? (
        <XStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          alignItems="center"
          minHeight={32}
          paddingHorizontal="$2"
          borderRadius="$3"
          onPress={onAll}
          hoverStyle={{ backgroundColor: '$color3' }}
          data-testid="rail-all-chats"
        >
          <SizableText fontSize="$2" color="$color11">
            All chats
          </SizableText>
        </XStack>
      ) : null}

      {account}
    </Sidebar>
  )

  if (drawer) {
    if (!open) return null
    return (
      <>
        <YStack
          {...scrim}
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          zIndex={40}
          onPress={() => onOpenChange(false)}
          aria-hidden
        />
        <YStack
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          zIndex={41}
          data-testid="rail-drawer"
        >
          {column(DRAWER)}
        </YStack>
      </>
    )
  }

  if (open) {
    return (
      <YStack height="100%" position="relative" data-testid="rail">
        {column(width)}
        {/* Resizer Handle Bar */}
        <div
          onMouseDown={onMouseDownResizer}
          style={{
            position: 'absolute',
            top: 0,
            right: -3,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Drag to resize sidebar"
        >
          <div
            style={{
              width: 2,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#34d399')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          />
        </div>
      </YStack>
    )
  }

  return (
    <YStack
      width={RAIL}
      height="100%"
      alignItems="center"
      gap="$1"
      padding="$2"
      backgroundColor="$panel"
      borderRightWidth={1}
      borderColor="$borderColor"
      data-testid="rail"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Show conversations"
        aria-expanded={false}
        onPress={() => onOpenChange(true)}
        data-testid="rail-expand"
      >
        <HanzoMark size={20} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="New chat" onPress={onNew}>
        <SizableText fontSize="$8" lineHeight={20} color="$color11">
          +
        </SizableText>
      </Button>
      <YStack flex={1} />
      {account}
    </YStack>
  )
}
