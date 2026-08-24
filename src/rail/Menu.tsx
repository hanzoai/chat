import { Button, DropdownMenu } from '@hanzo/ui'
import { ContextMenu, type MenuItemSpec } from '@hanzo/ui/product'
import type { ReactElement } from 'react'

import type { Convo } from '~/data/types'

import { named } from './group'

/**
 * The ONE verb set for a conversation: pin, rename, share, export, archive,
 * delete.
 *
 * `verbs()` is the list and it is the whole list. Both anchors read it — the
 * kebab (`Menu`) and the right-click (`Pointer`) — so a conversation cannot
 * offer one set of actions in the rail and a different set in the manager,
 * which is what happened while the kebab menu and the row's context menu were
 * two files with two orders and two ideas of what was destructive.
 *
 * A verb renders only when its handler is supplied. That is the honest form: a
 * deployment with sharing switched off shows no Share row rather than a row
 * that answers 404, and nothing here has to know why it is absent.
 *
 * The two anchors do not share a RENDERER, because @hanzo/ui does not offer
 * one: `DropdownMenu` takes the spec and builds its own compound parts, while
 * `ContextMenu` renders the same spec into a panel at the cursor. One spec, two
 * mountings, no third row component — and none of the pointer-rect arithmetic
 * the hand-rolled right-click anchoring needed.
 *
 * THERE IS NO CONFIRM HERE, and that is a boundary rather than an omission.
 * A menu ASKS; what "delete" means — a confirm and a request, or a request and
 * an undo — is the surface's, and the surface is the one holding the request.
 * Putting a dialog in this file would give the rail two homes for it (the row
 * mounts a menu, the manager mounts another) and would make the menu own a
 * network call. `ConfirmDelete` from `@hanzo/ui/product` is what the handler
 * reaches for; it does not belong on this side of the callback.
 */
export interface Verbs {
  /** Commit a new title. The menu only ASKS for an edit — see `edit` below. */
  rename?: (c: Convo, title: string) => void
  pin?: (c: Convo, on: boolean) => void
  share?: (c: Convo) => void
  export?: (c: Convo) => void
  archive?: (c: Convo, on: boolean) => void
  delete?: (c: Convo) => void
}

/**
 * The list.
 *
 * `edit` is separate from `Verbs.rename` on purpose: renaming is two things —
 * starting an edit, which is the surface's (an inline field in the rail, a cell
 * in the manager), and saving one, which is the product's. Braiding them is how
 * a menu ends up owning a text field.
 *
 * Ordered as a reader expects rather than as the code grew: the reversible
 * things first, the destructive one last and alone behind a rule.
 */
export const verbs = (c: Convo, on: Verbs, edit?: () => void): MenuItemSpec[] => {
  const rows: MenuItemSpec[] = []
  const { pin, share, archive } = on
  const send = on.export
  const drop = on.delete

  if (pin) {
    rows.push({
      key: 'pin',
      label: c.isPinned === true ? 'Unpin' : 'Pin',
      shortcut: 'P',
      selected: c.isPinned === true,
      onSelect: () => pin(c, c.isPinned !== true),
    })
  }
  if (on.rename && edit) {
    rows.push({ key: 'rename', label: 'Rename', shortcut: 'R', onSelect: edit })
  }
  if (share) rows.push({ key: 'share', label: 'Share', onSelect: () => share(c) })
  if (send) rows.push({ key: 'export', label: 'Export', onSelect: () => send(c) })
  if (archive) {
    rows.push({
      key: 'archive',
      label: c.isArchived === true ? 'Unarchive' : 'Archive',
      onSelect: () => archive(c, c.isArchived !== true),
    })
  }
  if (drop) {
    if (rows.length > 0) rows.push({ type: 'separator', key: 'before-delete' })
    rows.push({
      key: 'delete',
      label: 'Delete',
      shortcut: 'D',
      destructive: true,
      onSelect: () => drop(c),
    })
  }
  return rows
}

export interface MenuProps {
  convo: Convo
  on: Verbs
  /** Start an inline rename. Absent → the menu offers no Rename row. */
  edit?: () => void
  /** Controlled, so a row can keep its kebab visible while the panel is up. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * The kebab.
 *
 * The trigger is a `Button` rather than one of the sidebar's icon buttons
 * because `DropdownMenu` opens through `asChild`: it hands its press handling
 * to the element it is given, and an element that does not spread its residual
 * props swallows them — leaving a control that looks right and opens nothing.
 *
 * `size="icon-sm"` is what makes it square. A hand-spread width and height
 * loses to the library's own padding rule and draws the glyph in a box a few
 * pixels wide.
 *
 * `⋯` is a typographic character rather than an icon: it inherits the label's
 * ink and the size's type rung, it renders on every platform, and it costs no
 * icon package.
 */
export function Menu({ convo, on, edit, open, onOpenChange }: MenuProps) {
  const rows = verbs(convo, on, edit)
  if (rows.length === 0) return null
  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      items={rows}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Options for ${named(convo)}`}>
          ⋯
        </Button>
      }
    />
  )
}

export interface PointerProps {
  convo: Convo
  on: Verbs
  edit?: () => void
  /** The right-clickable row. Its own `onContextMenu` is composed, not replaced. */
  children: ReactElement
}

/** The same verbs, at the pointer. Nothing here measures or anchors anything. */
export function Pointer({ convo, on, edit, children }: PointerProps) {
  const rows = verbs(convo, on, edit)
  if (rows.length === 0) return children
  return <ContextMenu items={rows}>{children}</ContextMenu>
}
