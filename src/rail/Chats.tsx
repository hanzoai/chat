import { Button, ScrollView, SizableText, XStack, YStack } from '@hanzo/ui'
import { selected } from '@hanzo/ui/glass'
import { DataTable, EmptyState, PageHeader, type Column } from '@hanzo/ui/product'
import { useMemo, useState } from 'react'

import { hits, named, when, type Convo } from './group'
import { Find } from './Find'
import { Menu, type Verbs } from './Menu'
import { Rename } from './Rename'

/**
 * Every conversation, on a page of its own — the manager the rail's list is a
 * summary of.
 *
 * It exists because a 260px column can show a title and nothing else. Here
 * there is room for when a conversation was last touched, for archived ones,
 * and for finding something across the whole account rather than the page of it
 * the rail happens to have loaded.
 *
 * It mounts the SAME `Menu` the rail's rows do, so a conversation has one set
 * of verbs wherever it is looked at. That is the whole reason this screen is in
 * this module and not in a screens folder of its own: it is another view of the
 * SET, and the set's rules live together.
 *
 * The table is `DataTable` — its skeleton rows, its horizontal scroll on a
 * phone and its sort caret are the fleet's, so four duplicated table stacks and
 * a virtual-table dependency all go.
 *
 * There is no page run. `/v1/chat/convos` is cursor-paged, so there is no page
 * three to jump to, and a numbered control over a cursor API is a promise the
 * server cannot keep. One honest control asks for the next cursor.
 */
export interface ChatsProps {
  convos: readonly Convo[]
  loading?: boolean
  /** Which side of the archive the server is answering with. */
  archived?: boolean
  onArchived?: (archived: boolean) => void
  on?: Verbs
  onOpen: (c: Convo) => void
  onNew?: () => void
  /** There is another cursor to spend. */
  more?: boolean
  onEnd?: () => void
}

const NONE: Verbs = {}

/**
 * The mark the empty state stands behind — three hairlines, shortening: a list
 * with nothing in it, drawn from the border token so it retunes with the theme.
 * Four lines of geometry rather than an icon package the app does not carry.
 */
const Mark = ({ size = 24 }: { size?: number }) => (
  <YStack width={size} height={size} justifyContent="center" gap={Math.max(2, Math.round(size / 8))}>
    <YStack height={1} width="100%" backgroundColor="$borderColor" />
    <YStack height={1} width="70%" backgroundColor="$borderColor" />
    <YStack height={1} width="45%" backgroundColor="$borderColor" />
  </YStack>
)

/**
 * Which set is on screen. `selected()` is the fleet's one "you are here" look,
 * and the reason it is worth reaching for rather than spelling: inside a nested
 * theme scope `$color` re-bases to the SAME value as its quiet neighbour, so a
 * chip that highlights itself with `$color` paints exactly like the one it is
 * meant to stand out from — a state with no picture, and nothing in the markup
 * looks wrong.
 */
function Side({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const look = selected(on)
  return (
    <XStack
      role="button"
      tabIndex={0}
      aria-pressed={on}
      cursor="pointer"
      onPress={onPress}
      backgroundColor={look.backgroundColor}
      borderRadius="$3"
      paddingHorizontal="$3"
      paddingVertical="$1.5"
      hoverStyle={{ backgroundColor: '$color3' }}
    >
      <SizableText fontSize="$2" color={look.color}>
        {label}
      </SizableText>
    </XStack>
  )
}

export function Chats({
  convos,
  loading = false,
  archived = false,
  onArchived,
  on = NONE,
  onOpen,
  onNew,
  more = false,
  onEnd,
}: ChatsProps) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const rows = useMemo(() => hits(convos, query), [convos, query])
  const rename = on.rename

  const columns: Column<Convo>[] = [
    {
      key: 'title',
      header: 'Conversation',
      render: (c) =>
        editing === c.id ? (
          <Rename
            value={named(c)}
            onCommit={(title) => {
              setEditing(null)
              rename?.(c, title)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          // The title is the target, not the row. A whole-row press would fire
          // from inside the verbs cell too, so opening a menu would also open
          // the conversation behind it.
          <XStack role="button" tabIndex={0} cursor="pointer" onPress={() => onOpen(c)} minWidth={0}>
            <SizableText fontSize="$3" color="$color12" numberOfLines={1}>
              {named(c)}
            </SizableText>
          </XStack>
        ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      width: 120,
      mono: true,
      render: (c) => (
        <SizableText fontSize="$2" color="$color11">
          {when(c.updatedAt)}
        </SizableText>
      ),
    },
    {
      key: 'verbs',
      header: '',
      width: 56,
      align: 'right',
      render: (c) => (
        <Menu convo={c} on={on} edit={rename ? () => setEditing(c.id) : undefined} />
      ),
    },
  ]

  const bare = !loading && rows.length === 0 && query.trim() === ''

  return (
    <YStack flex={1} minHeight={0} backgroundColor="$background">
      <ScrollView flex={1}>
        <YStack
          width="100%"
          maxWidth={960}
          alignSelf="center"
          padding="$4"
          gap="$4"
          data-testid="chats"
        >
          <PageHeader
            title="Chats"
            subtitle="Every conversation in this account."
            actions={
              onNew ? (
                <Button variant="outline" size="sm" onPress={onNew}>
                  New chat
                </Button>
              ) : undefined
            }
          />

          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <YStack flex={1} minWidth={220}>
              <Find value={query} onChange={setQuery} placeholder="Search all chats" />
            </YStack>
            {onArchived ? (
              <XStack gap="$1" alignItems="center">
                <Side label="Active" on={!archived} onPress={() => onArchived(false)} />
                <Side label="Archived" on={archived} onPress={() => onArchived(true)} />
              </XStack>
            ) : null}
          </XStack>

          {bare ? (
            <EmptyState
              icon={Mark}
              title={archived ? 'Nothing archived' : 'No conversations yet'}
              description={
                archived
                  ? 'Archiving a conversation takes it out of the rail and keeps it here.'
                  : 'Every chat you start is kept in your account, so you can come back to it.'
              }
              bullets={[
                'Pin the ones you return to and they sit above the rest.',
                'Rename a conversation and the name is what search reads.',
              ]}
              primary={onNew ? { label: 'New chat', onPress: onNew } : undefined}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              loading={loading}
              rowKey={(c) => c.id}
              empty={`Nothing matches “${query.trim()}”.`}
            />
          )}

          {more && onEnd ? (
            <Button variant="outline" size="sm" alignSelf="center" onPress={onEnd}>
              Show older
            </Button>
          ) : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
