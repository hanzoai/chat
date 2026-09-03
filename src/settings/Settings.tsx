import { useMedia } from '@hanzo/gui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollView,
  Separator,
  SizableText,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hanzo/ui'
import { selected } from '@hanzo/ui/glass'
import { useState, type ReactNode } from 'react'

import { Account, type AccountProps } from './Account'
import { AiSettings } from './AiSettings'
import { General } from './General'
import { Look } from './Look'
import { McpSettings } from './McpSettings'
import type { Served } from '../data/types'

export interface SettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Everything the deployment serves, for the model picker. */
  served?: Served
  /** Who is signed in, and the verbs that end the session or the account. */
  account?: AccountProps
}

/**
 * A keystroke, as much of one as this reads.
 *
 * gui types a stack's `onKeyDown` in the cross-platform shape, which names no
 * key — on the web the DOM event is what actually arrives. Naming the two
 * fields once beats asserting a type at every use.
 */
interface Stroke {
  key?: string
  preventDefault?: () => void
}

/** A section of this screen: what it is called, and what it shows. */
interface Tab {
  id: string
  label: string
  panel: (p: SettingsProps) => ReactNode
}

/**
 * Five comprehensive sections for all preferences.
 */
const TABS: readonly Tab[] = [
  { id: 'general', label: 'General', panel: (p) => <General served={p.served} /> },
  { id: 'ai', label: 'AI & Swarm', panel: () => <AiSettings /> },
  { id: 'mcp', label: 'MCP & Skills', panel: () => <McpSettings /> },
  { id: 'look', label: 'Look', panel: () => <Look /> },
  { id: 'account', label: 'Account', panel: (p) => <Account {...p.account} /> },
]

/**
 * Everything a reader chooses, in one dialog.
 *
 * The dialog is mounted only while it is open. `@hanzo/ui`'s Dialog measures
 * the viewport whether or not there is anything on screen, so a shut one costs
 * a media subscription per surface that can open it and shows nothing for it.
 *
 * The strip is a rail beside the panels on a wide screen and a wrapping row
 * above them on a narrow one, and `orientation` follows the same boolean — so
 * what assistive tech is told about the arrow keys is what the arrow keys
 * actually do.
 */
export function Settings(props: SettingsProps) {
  const { open, onOpenChange } = props
  const [at, setAt] = useState<string>(TABS[0].id)
  const media = useMedia()
  const wide = media.md

  /* Selecting a section also moves focus to it. The keystroke is handled on the
     strip, where it bubbles to from whichever trigger has focus, so without
     this the highlight would move and the focus ring would stay behind. */
  const go = (id: string) => {
    setAt(id)
    if (typeof document === 'undefined') return
    document.getElementById(`settings-tab-${id}`)?.focus()
  }

  const step = (by: number) => {
    const from = TABS.findIndex((tab) => tab.id === at)
    go(TABS[(from + by + TABS.length) % TABS.length].id)
  }

  const keys = (e: Stroke) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault?.()
        step(1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault?.()
        step(-1)
        break
      case 'Home':
        e.preventDefault?.()
        go(TABS[0].id)
        break
      case 'End':
        e.preventDefault?.()
        go(TABS[TABS.length - 1].id)
        break
    }
  }

  if (!open) return null

  return (
    <Dialog open modal onOpenChange={onOpenChange}>
      <DialogContent maxWidth={760} maxHeight="90dvh" overflow="hidden">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Kept in this browser, and in force the moment you set them.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <Tabs
          value={at}
          onValueChange={setAt}
          orientation={wide ? 'vertical' : 'horizontal'}
          flexDirection={wide ? 'row' : 'column'}
          gap="$4"
          minHeight={0}
        >
          {/* `minWidth={0}` is what lets the narrow strip wrap at all: a flex
              item refuses to shrink under its content without it, so it never
              reaches a width it would wrap at and the last sections are simply
              painted outside the box. */}
          <TabsList
            aria-label="Sections"
            onKeyDown={keys}
            flexDirection={wide ? 'column' : 'row'}
            flexWrap={wide ? 'nowrap' : 'wrap'}
            flexShrink={0}
            height="auto"
            minWidth={wide ? 168 : 0}
            alignItems="stretch"
            justifyContent="flex-start"
            alignSelf={wide ? 'flex-start' : 'stretch'}
            backgroundColor={wide ? 'transparent' : '$hover'}
            padding={wide ? 0 : 3}
            gap={wide ? 4 : 2}
          >
            {TABS.map((tab) => {
              const on = tab.id === at
              /* `selected()` is spread for the ground AND read for the label:
                 a theme scope re-bases `$color` inside a nested surface, so a
                 highlighted row that lets its text resolve on its own paints
                 exactly like its neighbours. One recipe, both halves. */
              const look = selected(on)
              return (
                <TabsTrigger
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  value={tab.id}
                  height={36}
                  flexGrow={wide ? 0 : 1}
                  justifyContent={wide ? 'flex-start' : 'center'}
                  paddingHorizontal="$3"
                  {...look}
                >
                  <SizableText fontSize="$2" fontWeight="500" color={look.color}>
                    {tab.label}
                  </SizableText>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* `flexBasis: auto` beside the grow. `TabsContent` ships `flex: 1`,
              which in the react-native model means a basis of ZERO — right in a
              fixed-height pane, and in a box that sizes to its content it IS
              the size, so the panel measures nothing while its rows paint
              underneath it. */}
          <ScrollView maxHeight="62dvh" width="100%" flexGrow={1} flexBasis="auto" minWidth={0}>
            {TABS.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                tabIndex={-1}
                flexGrow={1}
                flexBasis="auto"
                minWidth={0}
              >
                {tab.panel(props)}
              </TabsContent>
            ))}
          </ScrollView>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default Settings
