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

import type { ToolCall } from '../data/types.ts'
import { Fence } from './Fence.tsx'

/** Tools whose name is machinery. Everything else reads fine as it arrives. */
const NAMES: Record<string, string> = {
  execute_code: 'Ran code in sandbox',
  web_search: 'Searched the web',
  file_search: 'Searched workspace files',
  image_gen_oai: 'Generated image',
  image_edit_oai: 'Edited image',
  read_file: 'Read local file',
  write_file: 'Synthesized file',
  list_directory: 'Inspected directory tree',
  grep_search: 'Searched code patterns',
  find_by_name: 'Matched files by pattern',
  github_create_pr: 'Opened GitHub Pull Request',
  github_get_issue: 'Fetched GitHub issue',
  github_list_repos: 'Listed repositories',
  git_status: 'Checked git status',
  query_sql: 'Executed PostgreSQL query',
  vector_search: 'pgvector semantic search',
  describe_schema: 'Extracted database schema',
  k8s_get_pods: 'Inspected Kubernetes Pods',
  k8s_container_exec: 'Ran container command',
  k8s_stream_logs: 'Streamed sandbox logs',
  search_web: 'Searched live web',
  fetch_page: 'Extracted page content',
  gmail_list_messages: 'Queried Gmail inbox',
  gmail_get_message: 'Read email thread',
  gmail_send_message: 'Sent email message',
  calendar_list_events: 'Retrieved Google Calendar events',
  drive_search_files: 'Searched Google Drive',
}

/** The server's word for how a call went, in the four this renders. */
const RAN: Record<string, Ran> = {
  in_progress: 'running',
  completed: 'done',
  cancelled: 'cancelled',
  failed: 'error',
}

/** How much of the arguments fits on the header line beside the name. */
const BRIEF = 96

const json = (args: ToolCall['args']): string => {
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
  call: ToolCall
  /** The turn is still arriving, so a call with no output yet is still running. */
  busy?: boolean
}

export const Tool = ({ call, busy = false }: ToolProps) => {
  const args = json(call.args)
  const done = call.output != null && call.output !== ''
  // The server's own word when it gave one; otherwise the only thing that can
  // be known from here — output means finished, and nothing yet means running
  // while the turn is still arriving.
  const status: Ran = (call.status ? RAN[call.status] : undefined) ?? (!done && busy ? 'running' : 'done')

  const body: ReactNode[] = []
  const code = call.name === 'execute_code' ? program(args) : null
  if (code) body.push(<Fence key="in" language={code.language} value={code.body} />)
  else if (args) body.push(<Fence key="in" language="json" value={args} />)
  if (call.output) body.push(<Fence key="out" value={call.output} />)

  return (
    <Step name={NAMES[call.name] ?? call.name} status={status} detail={brief(args)}>
      {/* `undefined`, not an empty array: a step with a body it cannot fill
          still draws a chevron and still takes a keyboard stop. */}
      {body.length > 0 ? body : undefined}
    </Step>
  )
}
