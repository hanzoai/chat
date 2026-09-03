/**
 * The board, which is the org's work seen through `/v1/todo`.
 *
 * WHICH board is a filter, not an address: `/v1/todo/board` with a key is that
 * repository's board and without one is the whole org's, through the same
 * projection — so the two can never disagree about what a column means. The
 * columns are the server's five (`backlog todo in_progress done canceled`) and
 * a move is a PATCH of `status`, because on a forge row the column IS a label
 * and writing it anywhere else would let the two contradict each other.
 *
 * Searching is a different route rather than a filter over what is held:
 * `/v1/todo/board` takes no query text, `/v1/todo/issues` does, and it answers
 * across every board in the org. Its rows are the thinner `issueHit`, which is
 * why `hit()` narrows one to the fields a card draws instead of pretending the
 * two shapes are one.
 *
 * There is no delete and no checklist here because there is no route for
 * either, and no create-a-board because `POST /v1/todo/projects` answers 405 on
 * purpose: a board IS a repository on the forge, and creating one is a forge
 * act with forge permissions.
 */
import { client, ESTATE } from '../data/origin.ts'
import { invalidate, useRead } from '../data/query.ts'

/** The five columns the server recognises. An unknown value is refused with 400. */
export const COLUMNS = ['backlog', 'todo', 'in_progress', 'done', 'canceled'] as const
export type Column = (typeof COLUMNS)[number]

/** Never empty: an unset priority is the value `none`. */
export const PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const
export type Priority = (typeof PRIORITIES)[number]

/** A board — a repository on the forge, or an index board. `key` addresses it. */
export type Board = {
  id: string
  key: string
  name: string
  description?: string
}

/** A work item, as `/v1/todo/board` projects it. */
export type Issue = {
  id: string
  identifier: string
  projectKey: string
  number: number
  title: string
  description?: string
  status: Column
  priority: Priority
  kind: string
  labels: string[]
  assignee?: string
  repo?: string
  source?: string
  updatedAt?: number
}

/** A search hit narrowed to what a card draws. The rest of `Issue` is not on it. */
type Hit = {
  project: string
  number: number
  title: string
  status: Column
  priority: Priority
  kind: string
  assignee?: string
}

const hit = (one: Hit): Issue => ({
  id: `${one.project}#${one.number}`,
  identifier: `${one.project}#${one.number}`,
  projectKey: one.project,
  number: one.number,
  title: one.title,
  status: one.status,
  priority: one.priority,
  kind: one.kind,
  labels: [],
  ...(one.assignee ? { assignee: one.assignee } : {}),
})

const work = ['todo'] as const

/** The boards this caller can see. `key` is what every other route addresses. */
export const useBoards = (enabled: boolean) =>
  useRead<Board[]>(
    ['todo', 'boards'],
    () => client(ESTATE).http.json<Board[]>({ method: 'GET', path: '/v1/todo/projects' }),
    { enabled },
  )

/** One board's issues, or every board's when `key` is empty. */
export const useIssues = (key: string, enabled: boolean) =>
  useRead<Issue[]>(
    ['todo', 'issues', key],
    () =>
      client(ESTATE).http.json<Issue[]>({
        method: 'GET',
        path: '/v1/todo/board',
        query: key ? { key } : {},
      }),
    { enabled },
  )

/** Issues matching `q` across every board in the org. */
export const useSearch = (q: string, enabled: boolean) =>
  useRead<Issue[]>(
    ['todo', 'search', q],
    async () => {
      const found = await client(ESTATE).http.json<{ issues?: Hit[] }>({
        method: 'GET',
        path: '/v1/todo/issues',
        query: { q },
      })
      return (found.issues ?? []).map(hit)
    },
    { enabled: enabled && q.trim().length > 0 },
  )

/** Files a work item onto `key`'s board, opened as the caller. */
export const file = async (
  key: string,
  item: { title: string; description?: string; status?: Column; priority?: Priority },
) => {
  await client(ESTATE).http.json({ method: 'POST', path: `/v1/todo/projects/${key}/issues`, body: item })
  invalidate(work)
}

/** Renames, rewrites, re-prioritises, reassigns or moves a card. Absent fields are left alone. */
export const edit = async (
  key: string,
  num: number,
  patch: {
    title?: string
    description?: string
    status?: Column
    priority?: Priority
    assignee?: string
  },
) => {
  await client(ESTATE).http.json({
    method: 'PATCH',
    path: `/v1/todo/projects/${key}/issues/${num}`,
    body: patch,
  })
  invalidate(work)
}

/** Takes an issue: it becomes the caller's and moves to `in_progress`. */
export const claim = async (key: string, num: number) => {
  await client(ESTATE).http.json({ method: 'POST', path: `/v1/todo/projects/${key}/issues/${num}/claim` })
  invalidate(work)
}
