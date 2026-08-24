/**
 * Openings — what to say when there is nothing to say yet.
 *
 * A chip SENDS. It is not a draft you then have to finish, so every `text` is a
 * complete question standing on its own and the short `label` is only the
 * caption on it.
 *
 * Two by default, not six, and they name DIFFERENT things the product does. The
 * row that read Summarize / Explain / Brainstorm was three ways of saying "it
 * answers questions", which the box above it already says; the row is for what
 * you would not otherwise guess.
 *
 * An agent's author may write their own openings, and an author who wrote none
 * meant none — the defaults are for a plain model chat, and are not poured into
 * a conversation somebody has already furnished.
 */
import { Button, SizableText, XStack } from '@hanzo/ui'

export interface Starter {
  /** The caption. */
  label: string
  /** What is actually sent. */
  text: string
}

const HOUSE: Starter[] = [
  {
    label: 'Write code',
    text:
      'Write a Python script that renames every file in a folder to a slugified version of its name.',
  },
  {
    label: 'Make an image',
    text: 'Make an image of a paper boat crossing a puddle at night, lit by a streetlight.',
  },
]

/**
 * The handful of placeholders an author may write into an opening.
 *
 * Time only. `{{current_user}}` is not among them: a starter is authored once
 * and read by everyone, and a name substituted into a shared prompt is the
 * reader's identity travelling into somebody else's text.
 */
export const filled = (text: string, at = new Date()): string => {
  // `sv` is the locale whose ordinary date IS the ISO one — the one place a
  // locale tag is used for its format rather than for a reader's language.
  const day = at.getDay()
  return text
    .replace(/\{\{current_date\}\}/gi, `${at.toLocaleDateString('sv')} (${day})`)
    .replace(/\{\{current_datetime\}\}/gi, `${at.toLocaleString('sv')} (${day})`)
    .replace(/\{\{iso_datetime\}\}/gi, at.toISOString())
}

export interface StartersProps {
  /** The author's openings. Absent means a plain chat, which gets the house
   *  pair; an empty array means the author chose none, which is honoured. */
  starters?: Starter[]
  disabled?: boolean
  onPick: (text: string) => void
}

/** How many fit before the row stops being a row. */
const MOST = 4

export const Starters = ({ starters, disabled = false, onPick }: StartersProps) => {
  const row = (starters ?? HOUSE).slice(0, MOST)
  if (row.length === 0) return null

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      flexWrap="wrap"
      gap="$2"
      data-testid="starters"
    >
      {row.map(({ label, text }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          borderRadius="$10"
          disabled={disabled}
          title={label}
          onPress={() => onPick(filled(text))}
        >
          <SizableText fontSize="$2" color="$color11" numberOfLines={1}>
            {label}
          </SizableText>
        </Button>
      ))}
    </XStack>
  )
}
