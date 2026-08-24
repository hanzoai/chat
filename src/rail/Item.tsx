import { Spinner, XStack, YStack } from '@hanzo/ui'
import { SidebarItem } from '@hanzo/ui/chat'
import { useState } from 'react'

import type { Convo } from '~/data/types'

import { named } from './group'
import { Menu, Pointer, type Verbs } from './Menu'
import { Rename } from './Rename'

/**
 * ONE conversation, as a row.
 *
 * `SidebarItem` is the row — its height, its clamp to a single line, its
 * active fill and its press target all come from @hanzo/ui/chat, so the rail
 * and every other Hanzo sidebar are the same list. What is added here is what
 * the shell deliberately does not take: the verbs, the right-click, the inline
 * rename, and the spinner that says an answer is arriving into a conversation
 * you are not looking at.
 *
 * The kebab sits ABOVE the row's right edge rather than beside it. Beside it,
 * the active fill would stop short of the column and the highlighted row would
 * be a different width from its neighbours — a difference the eye reads as a
 * broken row long before it reads as a menu.
 *
 * Revealing it is local state, not a `group` container query: `group` emits
 * `container-type: inline-size`, and a container cannot size itself from its
 * contents, so a content-sized control inside one collapses to its padding.
 * Two booleans cost less than a stylesheet that has to undo a prop.
 *
 * Editing state lives here because the row is what gets replaced. The menu asks
 * for an edit and this decides what an edit looks like; the manager answers the
 * same ask with a field in its own cell.
 */
export interface ItemProps {
  convo: Convo
  active?: boolean
  /** A turn is streaming into this conversation. */
  busy?: boolean
  on?: Verbs
  onOpen: (c: Convo) => void
}

const NONE: Verbs = {}

export function Item({ convo, active = false, busy = false, on = NONE, onOpen }: ItemProps) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const rename = on.rename
  const edit = rename ? () => setEditing(true) : undefined

  if (editing) {
    return (
      <Rename
        value={named(convo)}
        onCommit={(title) => {
          setEditing(false)
          rename?.(convo, title)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // Shown while the pointer is on the row, while its own panel is up, and on
  // the row you are reading — which is the row a keyboard reaches first.
  const shown = hovered || open || active

  return (
    <Pointer convo={convo} on={on} edit={edit}>
      <XStack
        position="relative"
        alignItems="center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <YStack flex={1} minWidth={0}>
          <SidebarItem
            active={active}
            onPress={() => onOpen(convo)}
            icon={busy ? <Spinner size={14} /> : undefined}
          >
            {named(convo)}
          </SidebarItem>
        </YStack>
        <XStack
          position="absolute"
          right={2}
          top={0}
          bottom={0}
          alignItems="center"
          opacity={shown ? 1 : 0}
          pointerEvents={shown ? 'auto' : 'none'}
        >
          <Menu convo={convo} on={on} edit={edit} open={open} onOpenChange={setOpen} />
        </XStack>
      </XStack>
    </Pointer>
  )
}
