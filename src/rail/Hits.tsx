import { SizableText, YStack } from '@hanzo/ui'
import { SidebarScroll, SidebarSection } from '@hanzo/ui/chat'
import { useMemo } from 'react'

import { hits, type Convo } from './group'
import { Item } from './Item'
import type { Verbs } from './Menu'

/**
 * What finding one found.
 *
 * FLAT, not banded. A date band answers "when did I last touch this", which is
 * the question a reader browsing the whole set is asking; someone who has typed
 * three letters is asking "which one is it", and slicing eleven results across
 * six headings buries the answer under its own scaffolding.
 *
 * The rows are `Item`, so a result carries the same verbs, the same right-click
 * and the same rename as the same conversation in the list above it. A search
 * result that cannot be renamed is a second, weaker kind of row.
 *
 * The matching rule is `hits()` in `group.ts` and it is applied here rather
 * than by the caller: the count in the heading and the rows under it then
 * cannot disagree, which is exactly what happens when one is filtered upstream
 * and the other downstream.
 *
 * Nothing-found is two quiet lines, not a full-bleed empty state: this is a
 * column, and a bordered card with a call to action inside 260px is a poster
 * where a sentence was wanted. The full-page manager is where an `EmptyState`
 * has the room to earn its space.
 */
export interface HitsProps {
  convos: readonly Convo[]
  query: string
  activeId?: string | null
  busy?: readonly string[]
  on?: Verbs
  onOpen: (c: Convo) => void
}

export function Hits({ convos, query, activeId, busy, on, onOpen }: HitsProps) {
  const found = useMemo(() => hits(convos, query), [convos, query])
  const running = useMemo(() => new Set(busy ?? []), [busy])
  const asked = query.trim()

  return (
    <SidebarScroll>
      {found.length > 0 ? (
        <SidebarSection label={found.length === 1 ? '1 result' : `${found.length} results`}>
          {found.map((c) => (
            <Item
              key={c.id}
              convo={c}
              active={c.id === activeId}
              busy={running.has(c.id)}
              on={on}
              onOpen={onOpen}
            />
          ))}
        </SidebarSection>
      ) : (
        <YStack paddingHorizontal="$3" paddingVertical="$3" gap="$1">
          <SizableText fontSize="$2" color="$color12">
            Nothing matches “{asked}”.
          </SizableText>
          <SizableText fontSize="$1" color="$color11">
            Search reads conversation titles and their tags.
          </SizableText>
        </YStack>
      )}
    </SidebarScroll>
  )
}
