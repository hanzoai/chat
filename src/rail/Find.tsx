import { Button, Input } from '@hanzo/ui'

/**
 * Finding one.
 *
 * The field filters IN PLACE — it does not open a second surface. The sidebar's
 * own header offers an `onSearch` callback for surfaces that put search
 * somewhere else; a 260px column already holds the list the question is about,
 * so sending the reader to a different screen to ask about it is a trip with
 * nothing at the end.
 *
 * Escape clears rather than blurs. A cleared field is the state the reader
 * wants back — the whole list — and blurring leaves them looking at a filtered
 * one with no focus to fix it from.
 *
 * The clear control renders only when there is something to clear: a permanent
 * one is an affordance that does nothing most of the time, and `×` beside an
 * empty field reads as a way to dismiss the field itself.
 */
export interface FindProps {
  value: string
  onChange: (query: string) => void
  placeholder?: string
}

export function Find({ value, onChange, placeholder = 'Search chats' }: FindProps) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChangeText={(v: string) => onChange(v)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && value !== '') {
          e.preventDefault()
          onChange('')
        }
      }}
      backgroundColor="$background"
      borderColor="$borderColor"
      color="$color"
      placeholderTextColor="$color11"
      endAdornment={
        value === '' ? undefined : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onPress={() => onChange('')}
          >
            ×
          </Button>
        )
      }
    />
  )
}
