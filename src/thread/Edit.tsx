/**
 * Rewriting a turn.
 *
 * Saving does not overwrite: it asks again from this point, and the old answer
 * stays reachable through `Siblings`. That is why this is a small form and not a
 * text field with an autosave — the reader is starting a branch, and the moment
 * of pressing Save is the moment they decide to.
 *
 * Enter saves and Shift+Enter writes a line, decided by `sends` — the SAME
 * function the composer uses, so the two fields cannot drift apart, and the IME
 * case (a keystroke belonging to a candidate window, not to us) is answered once
 * for both.
 */
import { Button, Textarea, XStack, YStack } from '@hanzo/ui'
import { sends } from '@hanzo/ui/chat'
import { accent } from '@hanzo/ui/glass'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface EditProps {
  value: string
  onSave: (text: string) => void
  onCancel: () => void
}

export const Edit = ({ value, onSave, onCancel }: EditProps) => {
  const [draft, setDraft] = useState(value)
  const field = useRef<HTMLTextAreaElement | null>(null)

  // The caret belongs at the END. `autoFocus` alone puts it at character zero,
  // in front of the sentence being revised.
  useEffect(() => {
    const el = field.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const ready = draft.trim().length > 0
  const save = () => {
    if (ready) onSave(draft)
  }

  return (
    <YStack width="100%" gap="$2">
      <Textarea
        ref={field}
        value={draft}
        onChangeText={setDraft}
        maxHeight={320}
        aria-label="Edit message"
        onKeyDown={(event) => {
          // The field declares a native-shaped key event beside the DOM one, and
          // the two share no `key`. On web the DOM event is what arrives, so the
          // shape is named here rather than widened at the field.
          const e = event as KeyboardEvent<HTMLTextAreaElement>
          // `e.nativeEvent`, never `e`: React's synthetic event carries neither
          // `isComposing` nor `keyCode`, which is two of the three IME signals.
          if (sends(e.key, e.nativeEvent)) {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
      />
      <XStack gap="$2" justifyContent="flex-end">
        <Button variant="outline" size="sm" onPress={onCancel}>
          Cancel
        </Button>
        {/* The label is handed straight to the Button so ITS text host paints
            it. A wrapper here would resolve `$color` inside the button's own
            theme scope and come out at the quiet grey. */}
        <Button {...accent} size="sm" disabled={!ready} onPress={save}>
          Save
        </Button>
      </XStack>
    </YStack>
  )
}
