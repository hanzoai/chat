/**
 * What you can do to a turn once it has arrived.
 *
 * Copy always; rewrite your own question; ask again and rate the answer. The
 * verbs differ by who spoke, so `mine` decides which appear rather than each
 * control deciding for itself and four of them agreeing by accident.
 *
 * Nothing here renders when there is nothing to do — an answer still arriving
 * has no text to copy and no rating to give, and a row of dead controls under it
 * is worse than no row.
 */
import { Pencil, RefreshCw, ThumbsDown, ThumbsUp } from '@hanzogui/lucide-icons-2'
import { Button, XStack } from '@hanzo/ui'
import { CopyButton, TooltipAnchor } from '@hanzo/ui/product'

import type { Vote } from './tree'

export interface ActionsProps {
  /** The turn as text — what copy puts on the clipboard. */
  text: string
  /** The turn was written by the reader. */
  mine: boolean
  /** How this answer was rated, if it was. */
  vote?: Vote | null
  /** Rewrite this turn. Absent, the turn is not editable. */
  onEdit?: () => void
  /** Ask for this answer again. */
  onRetry?: () => void
  /** Rate it, or take the rating back by pressing the same one twice. */
  onVote?: (vote: Vote | null) => void
}

/** Whether the row has anything in it. Keeps the caller from guessing. */
export const acts = ({ text, onEdit, onRetry, onVote }: ActionsProps): boolean =>
  Boolean(text) || Boolean(onEdit) || Boolean(onRetry) || Boolean(onVote)

export const Actions = (props: ActionsProps) => {
  const { text, mine, vote, onEdit, onRetry, onVote } = props
  if (!acts(props)) return null

  return (
    <XStack alignItems="center" gap="$1">
      {text ? <CopyButton value={text} size={28} /> : null}

      {onEdit ? (
        <TooltipAnchor description={mine ? 'Edit question' : 'Edit answer'}>
          <Button variant="ghost" size="icon-sm" onPress={onEdit}>
            <Pencil size={14} />
          </Button>
        </TooltipAnchor>
      ) : null}

      {onRetry ? (
        <TooltipAnchor description="Ask again">
          <Button variant="ghost" size="icon-sm" onPress={onRetry}>
            <RefreshCw size={14} />
          </Button>
        </TooltipAnchor>
      ) : null}

      {onVote ? (
        <>
          <TooltipAnchor description="Good answer">
            <Button
              variant="ghost"
              size="icon-sm"
              opacity={vote === 'thumbsUp' ? 1 : 0.7}
              aria-pressed={vote === 'thumbsUp'}
              onPress={() => onVote(vote === 'thumbsUp' ? null : 'thumbsUp')}
            >
              <ThumbsUp size={14} />
            </Button>
          </TooltipAnchor>
          <TooltipAnchor description="Bad answer">
            <Button
              variant="ghost"
              size="icon-sm"
              opacity={vote === 'thumbsDown' ? 1 : 0.7}
              aria-pressed={vote === 'thumbsDown'}
              onPress={() => onVote(vote === 'thumbsDown' ? null : 'thumbsDown')}
            >
              <ThumbsDown size={14} />
            </Button>
          </TooltipAnchor>
        </>
      ) : null}
    </XStack>
  )
}
