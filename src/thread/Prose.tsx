/**
 * The words of a turn.
 *
 * An answer is markdown; what YOU typed is not. Running a question through a
 * parser is a small betrayal — `**` around a word disappears, a lone `#` becomes
 * a headline, and the line breaks you put in are silently joined. So a user turn
 * renders verbatim, line for line, the way it was written.
 *
 * Verbatim is a paragraph PER LINE rather than one paragraph told to preserve
 * whitespace: `white-space` is a browser instruction, and the same tree renders
 * where there is no CSS. Splitting is the platform-independent spelling of the
 * same intent, and it costs one `split`.
 */
import { Paragraph, YStack } from '@hanzo/ui'

import { Markdown } from './markdown'

export interface ProseProps {
  source: string
  /** Render exactly as written — no parser. True for anything a person typed. */
  verbatim?: boolean
}

export const Prose = ({ source, verbatim = false }: ProseProps) => {
  if (!verbatim) return <Markdown source={source} />

  return (
    <YStack width="100%" minWidth={0} flexShrink={1}>
      {source.split('\n').map((line, i) => (
        // A blank line is a blank line: a paragraph with nothing in it collapses
        // to zero height, so the gap the writer left would not survive.
        <Paragraph key={i}>{line === '' ? ' ' : line}</Paragraph>
      ))}
    </YStack>
  )
}
