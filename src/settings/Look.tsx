import { Paragraph, YStack } from '@hanzo/ui'
import { rows } from '@hanzo/ui/glass'

import { Toggle } from './General.tsx'
import { compact, full } from './prefs.ts'

/**
 * How the conversation reads.
 *
 * Two decisions, and both of them are the thread's: how wide a turn is allowed
 * to be, and how far apart two of them sit. `Thread` takes a measure and a gap,
 * so each row here lands on a prop rather than on a wish.
 *
 * There is no theme picker. Hanzo Chat is dark — `<Hanzo>` mounts one theme and
 * nothing in this client can retune it — so a Light row would store a choice
 * nothing can honour, which is the one thing a settings screen must never do.
 *
 * Text size, density and accent are not here either, and that is not the same
 * kind of absence: `<Hanzo>` reads them from the device on mount, so they are
 * already honoured — they are just set once for every Hanzo surface rather than
 * per app, which is the whole reason they live outside this screen.
 */
export function Look() {
  return (
    <YStack rowGap="$4" paddingVertical="$2">
      <YStack {...rows}>
        <Toggle
          pref={full}
          name="Full width"
          note="Answers fill the column instead of holding a reading measure."
        />
        <Toggle pref={compact} name="Close spacing" note="Turns sit nearer to each other." />
      </YStack>
      <Paragraph fontSize="$1" color="$color11">
        Text size, density and accent belong to your Hanzo account and are already in force here —
        set them once and every Hanzo surface follows.
      </Paragraph>
    </YStack>
  )
}

export default Look
