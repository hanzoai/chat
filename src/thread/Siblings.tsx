/**
 * "‹ 2 / 3 ›" — which of a fork's answers you are reading.
 *
 * Editing a question or asking again does not overwrite the old turn; it adds a
 * sibling under the same parent. Without this control those answers exist and
 * are unreachable, which reads as data loss.
 *
 * The count is announced politely: the reader pressed the arrow, so they know
 * something changed — what they cannot see from the keyboard is WHERE they
 * landed.
 */
import { ChevronLeft, ChevronRight } from '@hanzogui/lucide-icons-2'
import { Button, SizableText, XStack } from '@hanzo/ui'

export interface SiblingsProps {
  index: number
  count: number
  onPick: (index: number) => void
}

export const Siblings = ({ index, count, onPick }: SiblingsProps) => {
  if (count < 2) return null

  const first = index <= 0
  const last = index >= count - 1

  return (
    <XStack alignItems="center" gap="$1" aria-label="Other answers">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={first}
        onPress={() => onPick(index - 1)}
        aria-label="Previous answer"
      >
        <ChevronLeft size={15} />
      </Button>
      <SizableText size="$1" color="$quiet" role="status" aria-live="polite">
        {index + 1} / {count}
      </SizableText>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={last}
        onPress={() => onPick(index + 1)}
        aria-label="Next answer"
      >
        <ChevronRight size={15} />
      </Button>
    </XStack>
  )
}
