/**
 * A fenced code block.
 *
 * `Code` already owns the frame, the label bar, the sideways scroll and the copy
 * control, so this is only the join between markdown's `pre > code` and it.
 *
 * NO HIGHLIGHTER. A highlighter emits class names, and a class name is a
 * browser-only instruction — the one thing this client does not ship. Plain
 * monospace reads perfectly well, and the alternative that keeps the rule is a
 * grammar set that emits themed text nodes, which is a bundle decision to make
 * with numbers rather than a default to fall into.
 *
 * A ```mermaid fence is code, and renders as code. A diagram renderer is 800kB
 * to draw what the text already says.
 */
import { Code } from '@hanzo/ui/chat'

export interface FenceProps {
  /** The word after the backticks. Shown in the label bar. */
  language?: string
  value: string
}

export const Fence = ({ language, value }: FenceProps) => (
  <Code language={language || 'text'} value={value}>
    {value}
  </Code>
)
