/**
 * Agent runs, as the server records them.
 *
 * A run here is a `Session`: the durable row every surface that executes
 * something in this org hangs its activity off. `sessions.list()` is the flat
 * projection a queue wants, `sessions.get(id)` adds the fifty most recent turns
 * — which is the log this panel prints, rather than lines a client made up.
 *
 * There is no cursor on the listing. The route publishes no continuation, so a
 * caller wanting more asks for a bigger limit; paging on top of it would
 * silently re-read the first page.
 *
 * Steering is a QUEUE, not a signal: `steer` records a command the running
 * agent drains between turns. That is why a stop posted from here survives this
 * tab closing, and why the row does not change the instant the button is
 * pressed — the change arrives when the agent acts on it, so the list is
 * re-read rather than written over optimistically.
 */
import type { Session, SessionCommand, SessionDetail } from '@hanzo/ai'

import { client, ESTATE } from '../data/origin'
import { invalidate, useRead } from '../data/query'

const runs = ['runs'] as const
const one = (id: string) => ['runs', 'one', id] as const

/** Every run in the org, newest activity first. */
export const useRuns = (enabled: boolean) =>
  useRead<Session[]>(['runs', 'list'], () => client(ESTATE).sessions.list({ limit: 50 }), { enabled })

/** One run, with its direct children and its recent turns. */
export const useRun = (id: string | null, enabled: boolean) =>
  useRead<SessionDetail>(one(id ?? ''), () => client(ESTATE).sessions.get(id as string), {
    enabled: enabled && Boolean(id),
  })

/** Record `stop`, `pause` or `resume` against a run, then re-read what it is. */
export const steer = async (id: string, command: SessionCommand) => {
  await client(ESTATE).sessions.steer(id, command)
  invalidate(runs)
}
