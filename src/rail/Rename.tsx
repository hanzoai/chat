import { Input } from '@hanzo/ui'
import { useRef, useState } from 'react'

/**
 * Renaming one conversation, in place.
 *
 * The field replaces the row rather than opening a dialog, because the thing
 * being renamed is the row and a modal over a 260px column hides the very list
 * that gives the name its context.
 *
 * Three ways out, one answer: Enter and blur keep the draft, Escape drops it.
 * `settled` is what makes that true rather than nearly true — committing on
 * Enter moves focus and fires blur, so without the latch the same edit is saved
 * twice, and the second save races the first one's response.
 *
 * An unchanged or empty draft cancels instead of committing. A rename that
 * writes the name it already had is a request that costs a round trip and can
 * only fail, and a blank title would leave a row nobody can aim at.
 */
export interface RenameProps {
  value: string
  onCommit: (title: string) => void
  onCancel: () => void
}

export function Rename({ value, onCommit, onCancel }: RenameProps) {
  const [draft, setDraft] = useState(value)
  const settled = useRef(false)

  const settle = (keep: boolean) => {
    if (settled.current) return
    settled.current = true
    const next = draft.trim()
    if (keep && next !== '' && next !== value) onCommit(next)
    else onCancel()
  }

  return (
    <Input
      value={draft}
      autoFocus
      aria-label="Conversation title"
      onChangeText={(v: string) => setDraft(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          settle(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          settle(false)
        }
      }}
      onBlur={() => settle(true)}
      backgroundColor="$background"
      borderColor="$borderColor"
      color="$color"
    />
  )
}
