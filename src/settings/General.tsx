import { Paragraph, SizableText, Switch, XStack, YStack } from '@hanzo/ui'
import { row, rows } from '@hanzo/ui/glass'

import { Model } from './Model'
import type { Served } from './models'
import { model, steps, temporary, usePref, type Pref } from './prefs'

/**
 * One preference, as a line: the name, what it does under it, the switch hard
 * right.
 *
 * It takes the preference itself rather than a value and a setter, so a row
 * cannot be pointed at one name and made to write another, and it subscribes to
 * that one name alone — a screen of these re-renders a line at a time.
 *
 * The name is `$color` and the sentence under it is `$color11`. Both halves
 * matter: written at the same grey, a row has no first thing to read.
 */
export function Toggle({ pref, name, note }: { pref: Pref<boolean>; name: string; note: string }) {
  const [on, set] = usePref(pref)
  const label = `${pref.key}-name`

  return (
    <XStack {...row}>
      <YStack minWidth={0} rowGap="$1">
        <SizableText id={label} fontSize="$3" fontWeight="500" color="$color">
          {name}
        </SizableText>
        <Paragraph fontSize="$1" color="$color11">
          {note}
        </Paragraph>
      </YStack>
      <Switch checked={on} onCheckedChange={set} aria-labelledby={label} />
    </XStack>
  )
}

export interface GeneralProps {
  /** Everything the deployment serves. The model picker reads it. */
  served?: Served
}

/**
 * How the app behaves — which model answers, and what it does with a turn.
 *
 * There is no "Enter to send" here, and its absence is the rule rather than an
 * omission: the composer owns that keystroke (`sends()` in `@hanzo/ui/chat`,
 * which also knows an IME has first claim on the key) and takes no prop to
 * change it. A switch nothing reads is worse than no switch, so it is not
 * offered.
 */
export function General({ served }: GeneralProps) {
  const [chosen, choose] = usePref(model)

  return (
    <YStack rowGap="$5" paddingVertical="$2">
      {/* The picker is a line of its own rather than a control hard right: it
          takes the width its longest model name needs, and a `row` would make
          the name and the picker fight for the same line on a phone. */}
      <YStack rowGap="$2">
        <SizableText fontSize="$3" fontWeight="500" color="$color">
          Model
        </SizableText>
        <Model {...served} value={chosen} onChange={choose} placeholder="The default model" />
        <Paragraph fontSize="$1" color="$color11">
          Which model answers when you start a conversation. Any conversation can still be moved to
          another one from the composer.
        </Paragraph>
      </YStack>

      <YStack {...rows}>
        <Toggle
          pref={temporary}
          name="Temporary conversations"
          note="A new conversation is not kept after you leave it."
        />
        <Toggle
          pref={steps}
          name="Open every step"
          note="A tool call arrives showing its work instead of folded away."
        />
      </YStack>
    </YStack>
  )
}

export default General
