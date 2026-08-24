/**
 * What this turn is carrying, and how to take it back off.
 *
 * A tool chosen in the `+` menu and a file dropped on the thread both leave the
 * composer looking identical, so the turn goes out holding things nobody can
 * see. A chip is the smallest thing that says otherwise: what it is, and one
 * way to remove it.
 *
 * This is not a tool palette. The old row drew every tool the deployment had,
 * lit or unlit, with a pin per tool and a mode for rearranging them — a control
 * surface for a question nobody asked. This draws only what is ON.
 *
 * Backspace with the caret at the head of the field takes the last one off: the
 * gesture that already removes the thing to the left of the caret, applied to
 * the thing that actually is to the left of the caret. It costs nothing —
 * Backspace at offset zero does nothing otherwise.
 */
import { Button, SizableText, Spinner, XStack } from '@hanzo/ui'
import { X } from '@hanzogui/lucide-icons-2'
import { useEffect, useRef, type RefObject } from 'react'

import type { Switch } from '~/compose/draft'
import type { Attached, Tools } from '~/compose/submit'

/** What each tool is called where a reader can see it. The menu that turns
 *  them on reads the same names, so a chip and its row never disagree. */
export const TOOL: Record<Switch, string> = {
  web_search: 'Search the web',
  execute_code: 'Write code',
  file_search: 'Search files',
}

export interface ChipsProps {
  files: Attached[]
  tools: Tools
  onTake: (fileId: string) => void
  onTool: (which: Switch) => void
  onServer: (name: string) => void
  /** The field, so Backspace at its head removes the last chip. */
  field?: RefObject<HTMLTextAreaElement | null>
}

interface One {
  id: string
  label: string
  /** Still on its way. A tool is never this; a file is, until the bytes land. */
  coming?: boolean
  off: () => void
}

const Chip = ({ label, coming, off }: Omit<One, 'id'>) => (
  <XStack
    role="listitem"
    alignItems="center"
    gap="$2"
    borderRadius="$10"
    borderWidth={1}
    borderColor="$borderColor"
    backgroundColor="$color2"
    paddingLeft="$3"
    paddingRight="$1"
    // No vertical padding: the remove control is an icon-sized Button and sets
    // the height, which is the same height as every other control on the row.
    // Padding here would make the chips the one thing that does not line up.
    maxWidth={240}
  >
    <SizableText fontSize="$1" color="$color12" numberOfLines={1}>
      {label}
    </SizableText>
    {/* Arriving, without a number. The browser reports nothing useful about a
        multipart upload's progress, and a bar that moves on a guess is a worse
        answer than a mark that says honestly "not here yet". */}
    {coming === true && <Spinner size={12} />}
    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onPress={off}>
      <X size={12} />
    </Button>
  </XStack>
)

export const Chips = ({ files, tools, onTake, onTool, onServer, field }: ChipsProps) => {
  const on: One[] = []
  for (const which of Object.keys(TOOL) as Switch[]) {
    if (tools[which] === true) {
      on.push({ id: `tool-${which}`, label: TOOL[which], off: () => onTool(which) })
    }
  }
  for (const name of tools.mcp ?? []) {
    on.push({ id: `mcp-${name}`, label: name, off: () => onServer(name) })
  }
  for (const file of files) {
    on.push({
      id: `file-${file.file_id}`,
      label: file.filename,
      coming: !file.here,
      off: () => onTake(file.file_id),
    })
  }

  // Capture, so this runs before the field's own handler decides the key
  // belongs to it. Bound ONCE and reading the last chip through a ref: which
  // chip is last changes on every render, and rebinding a DOM listener that
  // often is how one of them ends up bound twice.
  const last = useRef<(() => void) | null>(null)
  last.current = on.length > 0 ? on[on.length - 1].off : null
  useEffect(() => {
    const box = field?.current
    if (!box) return
    const key = (e: KeyboardEvent) => {
      const off = last.current
      if (!off || e.key !== 'Backspace') return
      if (box.selectionStart !== 0 || box.selectionEnd !== 0) return
      e.preventDefault()
      off()
    }
    box.addEventListener('keydown', key, true)
    return () => box.removeEventListener('keydown', key, true)
  }, [field])

  if (on.length === 0) return null

  return (
    <XStack
      role="list"
      aria-label="On this message"
      alignItems="center"
      gap="$2"
      // The chips share the toolbar row with the controls, so they take what
      // is left of it and wrap inside that — a row of six attachments makes
      // the toolbar two lines tall rather than pushing the send button off it.
      flexWrap="wrap"
      flexShrink={1}
      minWidth={0}
      data-testid="chips"
    >
      {on.map(({ id, ...chip }) => (
        <Chip key={id} {...chip} />
      ))}
    </XStack>
  )
}
