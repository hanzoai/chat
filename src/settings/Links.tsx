import {
  Anchor,
  Button,
  Dialog,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@hanzo/ui'
import { ConfirmDelete, DataTable, DialogTemplate, type Column } from '@hanzo/ui/product'
import { useMemo, useState } from 'react'

import type { Share } from '~/data/types'
import { when } from './Archive'

export interface LinksProps {
  /** `GET /v1/chat/share`. */
  links?: Share[]
  loading?: boolean
  /** `DELETE /v1/chat/share/:shareId`. */
  onRevoke?: (shareId: string) => Promise<void>
}

/**
 * What you have published, and the one way to unpublish it.
 *
 * These are the only addresses in the product that answer with no session at
 * all, so this list is the whole of what a stranger can reach — which is why it
 * is a screen of its own rather than a mark on each conversation. Revoking asks
 * first: the link stops working for everyone holding it, including whoever was
 * reading when you pressed.
 */
export function Links({ links, loading, onRevoke }: LinksProps) {
  const [pending, setPending] = useState<Share | null>(null)

  const columns = useMemo<Column<Share>[]>(
    () => [
      {
        key: 'title',
        header: 'Conversation',
        render: (link) => (
          <Anchor href={`/share/${link.shareId}`} target="_blank" rel="noopener noreferrer">
            <SizableText fontSize="$2" color="$color12" numberOfLines={1}>
              {link.title || 'Untitled'}
            </SizableText>
          </Anchor>
        ),
      },
      {
        key: 'createdAt',
        header: 'Shared',
        width: 150,
        align: 'right',
        mono: true,
        render: (link) => (
          <SizableText fontSize="$1" color="$color11">
            {when(link.createdAt)}
          </SizableText>
        ),
      },
      {
        key: 'do',
        header: '',
        width: 120,
        align: 'right',
        render: (link) =>
          onRevoke ? (
            <XStack justifyContent="flex-end">
              <Button size="sm" variant="destructive" onPress={() => setPending(link)}>
                Revoke
              </Button>
            </XStack>
          ) : null,
      },
    ],
    [onRevoke],
  )

  return (
    <YStack rowGap="$3" paddingVertical="$2">
      <Paragraph fontSize="$1" color="$color11">
        Anyone holding one of these addresses can read that conversation without signing in. A link
        is a snapshot — what is said afterwards stays private until it is published again.
      </Paragraph>
      <ScrollView maxHeight="50dvh" width="100%">
        <DataTable
          columns={columns}
          rows={links ?? []}
          loading={loading}
          rowKey={(link) => link.shareId}
          empty="Nothing shared. A link you make from a conversation shows up here."
        />
      </ScrollView>
      {pending && onRevoke ? (
        <Dialog open modal onOpenChange={() => setPending(null)}>
          <DialogTemplate title="Revoke link" showCancel={false}>
            <ConfirmDelete
              message={`Revoke the link to “${pending.title || 'Untitled'}”? It stops working for everyone holding it, including anyone reading right now.`}
              confirmLabel="Revoke"
              run={() => onRevoke(pending.shareId)}
              onDone={() => setPending(null)}
            />
          </DialogTemplate>
        </Dialog>
      ) : null}
    </YStack>
  )
}

export default Links
