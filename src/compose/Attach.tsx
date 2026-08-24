/**
 * Everything that can go into a turn, behind one `+`.
 *
 * Files and tools used to be two controls and are one, because a person opening
 * this has a single question — what else goes into this message — and answering
 * it in two places makes them ask which one to open first.
 *
 * NOTHING IS GREYED OUT. A row says what it can do in THIS conversation ("Add
 * photos" where only pictures can be read, "Add files" where anything can),
 * because a disabled control with a tooltip explains a rule instead of applying
 * it. A capability this deployment does not have simply has no row.
 *
 * A tool the menu turns on becomes a chip above the field, so the turn never
 * carries anything invisible.
 */
import { Button, DropdownMenu } from '@hanzo/ui'
import type { MenuItemSpec } from '@hanzo/ui/product'
import { useRef } from 'react'

import type { Switch } from '~/compose/draft'
import type { Tools } from '~/compose/submit'
import { accepts, type Takes } from '~/compose/upload'

export interface AttachProps {
  /** What the provider can read. Names the row. */
  takes?: Takes
  disabled?: boolean
  tools: Tools
  /** MCP servers this deployment offers, by name. */
  servers?: string[]
  /** What this conversation may carry. A capability that is absent has no row. */
  can?: { files?: boolean; search?: boolean; code?: boolean }
  onFiles: (chosen: FileList | null) => void
  onTool: (which: Switch) => void
  onServer: (name: string) => void
}

export const Attach = ({
  takes = 'files',
  disabled = false,
  tools,
  servers = [],
  can = { files: true, search: true, code: true },
  onFiles,
  onTool,
  onServer,
}: AttachProps) => {
  const input = useRef<HTMLInputElement>(null)

  const items: MenuItemSpec[] = []

  if (can.files !== false) {
    items.push({
      key: 'files',
      label: takes === 'photos' ? 'Add photos' : 'Add files',
      onSelect: () => input.current?.click(),
    })
  }

  const toggles = (
    [
      {
        key: 'web_search',
        label: 'Search the web',
        on: tools.web_search,
        show: can.search !== false,
      },
      { key: 'execute_code', label: 'Write code', on: tools.execute_code, show: can.code !== false },
    ] satisfies { key: Switch; label: string; on: boolean | undefined; show: boolean }[]
  ).filter((t) => t.show)

  if (items.length > 0 && toggles.length > 0) items.push({ type: 'separator', key: 'after-files' })

  for (const t of toggles) {
    items.push({
      key: t.key,
      label: t.label,
      selected: t.on === true,
      // The menu stays open: turning on search and then code is one visit, and
      // a menu that shuts after each pick makes the second one a second trip.
      closeOnSelect: false,
      onSelect: () => onTool(t.key),
    })
  }

  if (servers.length > 0) {
    items.push({ type: 'label', key: 'servers', label: 'Connected' })
    for (const name of servers) {
      items.push({
        key: `mcp-${name}`,
        label: name,
        selected: tools.mcp?.includes(name) === true,
        closeOnSelect: false,
        onSelect: () => onServer(name),
      })
    }
  }

  return (
    <>
      {/* The one file input. Opened by the row above rather than shown, because
          a bare file input has a label nobody can write and a look nobody can
          theme. Off-screen rather than `display:none`: a hidden input is not
          reachable by assistive technology, and this one is the only way in. */}
      <input
        ref={input}
        type="file"
        multiple
        accept={accepts(takes)}
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}
        onChange={(e) => {
          onFiles(e.target.files)
          // Cleared so choosing the SAME file twice still raises a change.
          e.target.value = ''
        }}
      />
      <DropdownMenu
        items={items}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label="Add to this message"
            data-testid="attach"
          >
            +
          </Button>
        }
      />
    </>
  )
}
