/**
 * The reasoning behind an answer.
 *
 * Open while it is arriving, closed once the answer is — reasoning is worth
 * watching live and worth folding away afterwards, and the two are the same
 * region, not two components.
 *
 * The moment the reader touches the chevron, their choice wins and keeps
 * winning. `defaultOpen` cannot express that: it is read once at mount, so a
 * step that started closed never opens when the tokens start, and one that
 * started open snaps shut under the reader's hand when they stop.
 */
import { Step } from '@hanzo/ui/chat'
import { useState } from 'react'

import { Prose } from './Prose'

export interface ThinkProps {
  text: string
  /** Still arriving. */
  busy?: boolean
}

export const Think = ({ text, busy = false }: ThinkProps) => {
  const [chose, setChose] = useState<boolean | null>(null)

  return (
    <Step
      name="Reasoning"
      status={busy ? 'running' : 'done'}
      open={chose ?? busy}
      onOpenChange={setChose}
    >
      <Prose source={text} />
    </Step>
  )
}
