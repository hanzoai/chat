import { SizableText, View } from '@hanzo/ui'
import { useEffect, useState } from 'react'

/**
 * The line a screen reader hears when something happened off-screen.
 *
 * A sighted reader learns that a conversation was deleted, that a link was
 * copied, that eleven chats matched, because the page visibly changed. Somebody
 * driving this by keyboard and speech learns none of it unless it is SAID, and
 * a live region is the only way to say something without moving focus.
 *
 * ONE region, mounted for the life of the app in `Root`. That is not tidiness:
 * a live region has to be in the document BEFORE its text changes or assistive
 * tech has nothing to watch, so a region that mounts along with its message
 * announces nothing. `polite` because none of this interrupts — a refusal that
 * must interrupt is `Failure`, which is `assertive` and lives in the thread.
 *
 * It is positioned off-screen with STYLE PROPS, never an `.sr-only` class. A
 * utility class is a browser-only instruction and this tree renders on native
 * too; a 1×1 clipped box is the same thing said in a way every host understands.
 * It is not `display: none` and not `visibility: hidden`, because both of those
 * remove the region from the accessibility tree and it would go silent.
 */
const voices = new Set<(text: string) => void>()

export const Announce = () => {
  const [text, setText] = useState('')

  useEffect(() => {
    voices.add(setText)
    return () => {
      voices.delete(setText)
    }
  }, [])

  return (
    <View
      role="status"
      aria-live="polite"
      aria-atomic="true"
      position="absolute"
      width={1}
      height={1}
      overflow="hidden"
      pointerEvents="none"
    >
      {/* A bare string child of a gui stack renders nothing at all and throws
          nothing, so the text goes inside the type primitive like every other
          string in this app. */}
      <SizableText>{text}</SizableText>
    </View>
  )
}
