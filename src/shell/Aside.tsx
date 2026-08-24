import { Badge, Fill, SizableText, XStack, YStack } from '@hanzo/ui'
import { Aside as Column, HeaderButton } from '@hanzo/ui/chat'
import { row, rows } from '@hanzo/ui/glass'
import { X } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'

import type { Convo } from '~/data/types'

export interface AsideProps {
  /** The conversation on screen, or `null` before it has one. */
  convo: Convo | null
  onClose: () => void
  /** Panes the thread contributes — sources, an artifact. */
  children?: ReactNode
}

/** A date somebody can read, or nothing at all. Never "Invalid Date". */
const on = (iso?: string | null): string | null => {
  if (!iso) return null
  const at = new Date(iso)
  return Number.isNaN(at.getTime())
    ? null
    : at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** One line of the card: what it is called, and what it says. */
const Fact = ({ name, children }: { name: string; children: ReactNode }) => (
  <XStack {...row}>
    <SizableText fontSize="$2" color="$color11" shrink={0}>
      {name}
    </SizableText>
    <SizableText fontSize="$2" color="$color12" numberOfLines={1}>
      {children}
    </SizableText>
  </XStack>
)

/**
 * The right column — what this conversation IS, as opposed to what was said in
 * it.
 *
 * Its own column, never an overlay. An overlay would sit on top of the prose
 * somebody opened it to compare against, which is the one thing a details panel
 * must not do; the shell simply does not render it when the window is too
 * narrow to hold one (`useNarrow`), rather than folding it into a sheet that
 * covers the thread.
 *
 * It carries the FACTS the shell already holds — the model that answered, when
 * the conversation started, what it is labelled — because those are the
 * conversation's identity and the shell owns identity here (it is what the tab
 * and the header title are drawn from). Anything about the CONTENT arrives as
 * `children` from the thread, which is the only module that knows what a
 * citation or an artifact is.
 */
export const Aside = ({ convo, onClose, children }: AsideProps) => {
  const started = on(convo?.createdAt)
  const changed = on(convo?.updatedAt)
  const files = convo?.files?.length ?? 0
  const tags = convo?.tags ?? []

  return (
    <Column>
      <XStack items="center" justify="space-between" gap="$2">
        <SizableText fontSize="$2" fontWeight="500" color="$color12">
          Details
        </SizableText>
        <HeaderButton label="Close details" onPress={onClose}>
          <X size={16} />
        </HeaderButton>
      </XStack>

      <Fill>
        <YStack gap="$3">
          <YStack {...rows}>
            <Fact name="Model">{convo?.model ?? 'Not chosen yet'}</Fact>
            {convo?.endpoint ? <Fact name="Served by">{convo.endpoint}</Fact> : null}
            {started ? <Fact name="Started">{started}</Fact> : null}
            {changed ? <Fact name="Last reply">{changed}</Fact> : null}
            {files ? <Fact name="Attachments">{String(files)}</Fact> : null}
          </YStack>

          {tags.length ? (
            <XStack gap="$2" flexWrap="wrap">
              {tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </XStack>
          ) : null}

          {children}
        </YStack>
      </Fill>
    </Column>
  )
}
