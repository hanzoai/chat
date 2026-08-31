import { Paragraph, SizableText, Spinner, XStack } from '@hanzo/ui'
import { SidebarScroll, SidebarSection } from '@hanzo/ui/chat'
import { useEffect, useMemo, useRef } from 'react'

import type { Convo } from '~/data/types'

import { group, id } from './group'
import { Item } from './Item'

/**
 * The set, as the rail draws it: banded by when, newest first, pinned above.
 *
 * The bands come from `group()` and nothing here re-decides them. The scroller
 * is `SidebarScroll`, which is what keeps the header and the account foot
 * pinned while only the middle moves.
 *
 * The next page arrives because a one-pixel mark at the foot of the list came
 * into view, not because a page number was clicked: the conversations route is
 * cursor-paged, so there is no page N to ask for and a numbered control would
 * be a promise the API cannot keep. The observer is armed only while there IS
 * a next cursor, so a list at its end asks for nothing.
 *
 * There is no virtualization, deliberately. A plain scroller renders every row,
 * which is correct up to a few hundred of them and is one fewer measurement
 * cache to keep in step with a row whose height changes when it starts editing.
 * Virtualize when a measured list needs it, not before.
 */
export interface ListProps {
  convos: readonly Convo[]
  activeId?: string | null
  /** Conversations with a turn in flight. */
  busy?: readonly string[]
  onOpen: (c: Convo) => void
  /** The foot came into view and there is another cursor to spend. */
  onEnd?: () => void
  more?: boolean
  loading?: boolean
  empty?: string
}

export function List({
  convos,
  activeId,
  busy,
  onOpen,
  onEnd,
  more = false,
  loading = false,
  empty = 'No conversations yet. Every chat you start is kept here.',
}: ListProps) {
  const bands = useMemo(() => group(convos), [convos])
  const running = useMemo(() => new Set(busy ?? []), [busy])
  const foot = useRef<HTMLDivElement | null>(null)
  const count = convos.length

  useEffect(() => {
    const mark = foot.current
    if (!mark || !onEnd || !more) return
    if (typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver((seen) => {
      if (seen.some((one) => one.isIntersecting)) onEnd()
    })
    watch.observe(mark)
    return () => watch.disconnect()
  }, [onEnd, more, count])

  return (
    <SidebarScroll>
      {bands.map((band) => (
        <SidebarSection key={band.label} label={band.label}>
          {band.convos.map((c) => (
            <Item
              key={id(c)}
              convo={c}
              active={id(c) === activeId}
              busy={running.has(id(c))}
              onOpen={onOpen}
            />
          ))}
        </SidebarSection>
      ))}

      {bands.length === 0 && !loading ? (
        <Paragraph paddingHorizontal="$3" paddingVertical="$2" fontSize="$1" color="$color11">
          {empty}
        </Paragraph>
      ) : null}

      {loading ? (
        <XStack alignItems="center" justifyContent="center" gap="$2" paddingVertical="$3">
          <Spinner size={14} />
          <SizableText fontSize="$1" color="$color11">
            Loading
          </SizableText>
        </XStack>
      ) : null}

      {/* The mark the observer watches. A real element with no size and no
          voice — `aria-hidden`, because a scroll position is not content. */}
      <div ref={foot} aria-hidden style={{ height: 1 }} />
    </SidebarScroll>
  )
}
