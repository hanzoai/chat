import { Button, Dialog, ScrollView, SizableText, XStack, YStack } from '@hanzo/ui'
import { ConfirmDelete, DataTable, DialogTemplate, type Column } from '@hanzo/ui/product'
import { useMemo, useState } from 'react'

import type { Convo } from '~/data/types'

/**
 * A date, written the way this browser writes dates.
 *
 * `Intl` already knows the reader's locale and calendar, so there is nothing
 * here to configure and nothing to translate. Day and month with no time: these
 * two tables answer "when did I do this", not "at what minute".
 *
 * It lives beside the first table that needed one and `Links` reads it from
 * here — one spelling of a date across both, rather than two that agree until
 * somebody edits one.
 */
export const when = (at?: string | null) => {
  if (!at) return ''
  const on = new Date(at)
  return Number.isNaN(on.getTime())
    ? ''
    : on.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export interface ArchiveProps {
  /** `GET /v1/chat/convos?isArchived=true`. */
  archived?: Convo[]
  loading?: boolean
  /** `POST /v1/chat/convos/archive`, back to the list. */
  onRestore?: (conversationId: string) => void
  /** `DELETE /v1/chat/convos`. */
  onDelete?: (conversationId: string) => Promise<void>
}

/** A conversation that reached this table has an id; this is the read. */
const idOf = (convo: Convo) => convo.conversationId ?? ''

/**
 * The conversations you put away.
 *
 * A conversation is archived rather than deleted precisely because it might be
 * wanted again, so restoring is one press and reversible, and deleting is the
 * only thing here that asks twice.
 *
 * `DataTable` draws it — skeleton rows in the real column layout while it
 * loads, so the wait has the shape of the answer, and one honest line when
 * there is nothing rather than a spinner that never stops.
 */
export function Archive({ archived, loading, onRestore, onDelete }: ArchiveProps) {
  const [pending, setPending] = useState<Convo | null>(null)

  const columns = useMemo<Column<Convo>[]>(
    () => [
      {
        key: 'title',
        header: 'Conversation',
        render: (convo) => (
          <SizableText fontSize="$2" color="$color12" numberOfLines={1}>
            {convo.title || 'Untitled'}
          </SizableText>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Archived',
        width: 150,
        align: 'right',
        mono: true,
        render: (convo) => (
          <SizableText fontSize="$1" color="$color11">
            {when(convo.updatedAt)}
          </SizableText>
        ),
      },
      {
        key: 'do',
        header: '',
        width: 190,
        align: 'right',
        render: (convo) => (
          <XStack gap="$2" justifyContent="flex-end">
            {onRestore ? (
              <Button size="sm" variant="outline" onPress={() => onRestore(idOf(convo))}>
                Restore
              </Button>
            ) : null}
            {onDelete ? (
              <Button size="sm" variant="destructive" onPress={() => setPending(convo)}>
                Delete
              </Button>
            ) : null}
          </XStack>
        ),
      },
    ],
    [onRestore, onDelete],
  )

  return (
    <YStack paddingVertical="$2">
      <ScrollView maxHeight="50dvh" width="100%">
        <DataTable
          columns={columns}
          rows={archived ?? []}
          loading={loading}
          rowKey={idOf}
          empty="Nothing archived. A conversation you put away shows up here."
        />
      </ScrollView>
      {pending && onDelete ? (
        <Dialog open modal onOpenChange={() => setPending(null)}>
          <DialogTemplate title="Delete conversation" showCancel={false}>
            <ConfirmDelete
              message={`Delete “${pending.title || 'Untitled'}”? Every message in it goes too, and none of it can be brought back.`}
              confirmLabel="Delete"
              run={() => onDelete(idOf(pending))}
              onDone={() => setPending(null)}
            />
          </DialogTemplate>
        </Dialog>
      ) : null}
    </YStack>
  )
}

export default Archive
