/**
 * Something the assistant ran on the way to the answer.
 *
 * ONE component for every tool. The version this replaces had eight — a search,
 * a retrieval, a code run, a progress ring, an in-flight call, an analysis — and
 * each drew its own disclosure, its own spinner and its own idea of "finished".
 * They differ in a NAME, a STATE and a BODY, which is exactly what `Step` takes.
 *
 * A call with nothing to show gets no chevron, because `Step` offers a
 * disclosure only when there is something behind it.
 */
import { Step, type Ran } from '@hanzo/ui/chat'
import type { ReactNode } from 'react'

import { Fence } from './Fence'
import type { Call } from './tree'

/** Tools whose name is machinery. Everything else reads fine as it arrives. */
const NAMES: Record<string, string> = {
  execute_code: 'Ran code',
  web_search: 'Searched the web',
  file_search: 'Searched files',
  image_gen_oai: 'Made an image',
  image_edit_oai: 'Edited an image',
}

/** How much of the arguments fits on the header line beside the name. */
const BRIEF = 96

const json = (args: Call['args']): string => {
  if (args == null) return ''
  if (typeof args === 'string') return args
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return ''
  }
}

/** One line of the arguments, for the header. Newlines would move the chevron. */
const brief = (args: string) => {
  const line = args.replace(/\s+/g, ' ').trim()
  return line.length > BRIEF ? `${line.slice(0, BRIEF)}…` : line
}

/**
 * A code run's arguments are a program, not a payload, so it is fenced in its
 * own language rather than shown as JSON with the newlines escaped.
 */
const program = (args: string): { language: string; body: string } | null => {
  try {
    const parsed: unknown = JSON.parse(args)
    if (parsed && typeof parsed === 'object') {
      const { lang, code } = parsed as { lang?: unknown; code?: unknown }
      if (typeof code === 'string') {
        return { language: typeof lang === 'string' ? lang : 'text', body: code }
      }
    }
  } catch {
    /* Half an object, mid-stream. The JSON branch below still shows it. */
  }
  return null
}

export interface ToolProps {
  call: Call
  /** The turn is still arriving, so a call with no output yet is still running. */
  busy?: boolean
}

export const Tool = ({ call, busy = false }: ToolProps) => {
  const name = call.name ?? 'Tool'
  const args = json(call.args)
  const done = call.output != null && call.output !== ''
  const status: Ran = !done && busy ? 'running' : 'done'

  const body: ReactNode[] = []
  const code = name === 'execute_code' ? program(args) : null
  if (code) body.push(<Fence key="in" language={code.language} value={code.body} />)
  else if (args) body.push(<Fence key="in" language="json" value={args} />)
  if (call.output) body.push(<Fence key="out" value={call.output} />)

  return (
    <Step name={NAMES[name] ?? name} status={status} detail={brief(args)}>
      {/* `undefined`, not an empty array: a step with a body it cannot fill
          still draws a chevron and still takes a keyboard stop. */}
      {body.length > 0 ? body : undefined}
    </Step>
  )
}
