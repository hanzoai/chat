import { Spinner } from '@hanzo/ui'
import { SidebarItem } from '@hanzo/ui/chat'

import type { Convo } from '../data/types'

import { named } from './group'

/**
 * ONE conversation, as a row.
 *
 * `SidebarItem` is the row — its height, its clamp to a single line, its
 * active fill and its press target all come from @hanzo/ui/chat, so the rail
 * and every other Hanzo sidebar are the same list. What is added here is the
 * one thing the shell does not take: the spinner that says an answer is
 * arriving into a conversation you are not looking at.
 *
 * The kebab is gone, and with it the right-click and the inline rename. Pin,
 * rename, share, export, archive and delete were six verbs over a server that
 * does not answer them, and `/v1/agents/chat/conversations` is GET-only — so
 * the row offers what a row can do, which is open.
 */
export interface ItemProps {
  convo: Convo
  active?: boolean
  /** A turn is streaming into this conversation. */
  busy?: boolean
  onOpen: (c: Convo) => void
}

export function Item({ convo, active = false, busy = false, onOpen }: ItemProps) {
  return (
    <SidebarItem
      active={active}
      onPress={() => onOpen(convo)}
      icon={busy ? <Spinner size={14} /> : undefined}
    >
      {named(convo)}
    </SidebarItem>
  )
}
