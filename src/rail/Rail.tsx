import { Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { Sidebar, SidebarHeader, SidebarNewChat } from '@hanzo/ui/chat'
import { scrim } from '@hanzo/ui/glass'
import { HanzoMark } from '@hanzo/ui/product'
import { useState, type ReactNode } from 'react'

import type { Convo } from '~/data/types'
import { Find } from './Find'
import { Hits } from './Hits'
import { List } from './List'

/**
 * The left column — the SET, as a place on the page.
 *
 * THIS FILE IS THE ONLY PLACE THE THREE WIDTHS ARE WRITTEN. `Sidebar` takes a
 * width and has no idea it can be collapsed, which is the right shape for it:
 * a component that knew about collapsing would have to know about the drawer
 * too, and about which breakpoint decides. So the peek and the drawer are this
 * wrapper's, the column inside is the shell's, and both read the same three
 * numbers — because two defaults are how a column came to reflow underneath a
 * wrapper animating over it.
 *
 * Three states, one column:
 *
 *   open    260  the list, in flow
 *   rail     56  the mark and compose, in flow — collapsed is not gone
 *   drawer  320  over the page, with a scrim, below the breakpoint
 *
 * Collapsing narrows the column; it does not slide it away and it does not
 * unmount it. Keeping the column is what keeps the corner occupied, and a
 * corner that empties is why controls that belong to a sidebar end up re-homed
 * into a header and never come back.
 *
 * In `drawer` the column is positioned ABSOLUTELY, so it needs a positioned
 * ancestor — the shell mounts it inside the relative row that also holds the
 * thread. Without one it anchors to the page and the scrim covers the document
 * rather than the workspace.
 *
 * There is no hover-to-expand. A rail that widens because a pointer crossed it
 * moves the page out from under whatever the pointer was reaching for.
 *
 * The query lives here and nowhere else. It is the state that decides which of
 * two middles renders, and both of them are in this column — pushing it up to
 * the shell would make a second owner of a fact only this file consumes.
 * `onQuery` is offered for a surface that wants the server to answer instead;
 * the local rule still applies to whatever comes back, so the count in the
 * heading and the rows under it cannot disagree.
 */
export const OPEN = 260
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

  const ask = (next: string) => {
    setQuery(next)
    onQuery?.(next)
  }

  // Opening a conversation from a drawer closes it: the drawer covers the very
  // thread it just navigated to.
  const reach = (c: Convo) => {
    onOpen(c)
    if (drawer) onOpenChange(false)
  }

  const column = (width: number) => (
    <Sidebar width={width}>
      <SidebarHeader title={title} onCollapse={() => onOpenChange(false)} />
      <SidebarNewChat onPress={onNew} />
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
        {/* The dim is a token, not `black`: a solid wall does not dim the page
            behind a floating panel, it deletes it. */}
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
      <YStack height="100%" data-testid="rail">
        {column(OPEN)}
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
      {/* In the rail the mark means EXPAND, and it is the only thing that can:
          a 56px column whose one affordance opened something else would leave
          the reader no way back to their own list. */}
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
      {/* The glyph is a wrapped `SizableText` and not the Button's own label,
          because a `fontSize` on a Button does not reach the text host it
          paints — the size prop's rung does, and at the rung a 36px control
          uses, a `+` is a speck beside the mark above it. */}
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
