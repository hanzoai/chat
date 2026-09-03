/**
 * Automations — the org's flows on `/v1/auto`, and what they have run.
 *
 * The page projection and the record are two different shapes, deliberately:
 * `GET /v1/auto/flows` answers rows carrying an id, a status and its clocks,
 * and only `GET /v1/auto/flows/{id}` carries the version a flow's display name
 * and trigger live on. A list of opaque ids is not a list, so `useFlows` reads
 * the page and then each row's record — one read per flow, which is what the
 * contract offers rather than a name invented to fill the column.
 *
 * `status` is the trigger's arming, not a run's: ENABLED means a POLLING
 * trigger holds a cron schedule on the durable engine and a WEBHOOK trigger
 * holds a subscription. A MANUAL flow arms nothing and still runs on demand,
 * which is why Run is offered whatever the status says.
 *
 * Nothing publishes a next firing time or a lifetime run total, so neither is
 * read. The last run is the head of `/v1/auto/runs`, which is newest first.
 */
import { client, ESTATE } from '../data/origin'
import { invalidate, useRead } from '../data/query'

/** A flow row joined to its own record. Unix milliseconds on both clocks. */
export type Flow = {
  id: string
  /** ENABLED or DISABLED — whether the trigger is armed. */
  status?: string
  updated?: number
  /** From the flow's latest version; absent until it has one. */
  name?: string
  /** MANUAL, POLLING or WEBHOOK, as the version's trigger states it. */
  strategy?: string
}

/** One recorded run. */
export type Run = {
  id: string
  flowId?: string
  status?: string
  startTime?: number
  finishTime?: number
}

type Detail = {
  id: string
  status?: string
  updated?: number
  version?: { displayName?: string; trigger?: { strategy?: string } }
}

const flows = ['auto'] as const

const record = async (id: string): Promise<Flow> => {
  const one = await client(ESTATE).http.json<Detail>({ method: 'GET', path: `/v1/auto/flows/${id}` })
  return {
    id: one.id,
    ...(one.status ? { status: one.status } : {}),
    ...(one.updated ? { updated: one.updated } : {}),
    ...(one.version?.displayName ? { name: one.version.displayName } : {}),
    ...(one.version?.trigger?.strategy ? { strategy: one.version.trigger.strategy } : {}),
  }
}

/** Every automation in the org, most-recently-updated first. */
export const useFlows = (enabled: boolean) =>
  useRead<Flow[]>(
    ['auto', 'flows'],
    async () => {
      const page = await client(ESTATE).http.json<{ data?: { id: string }[] }>({
        method: 'GET',
        path: '/v1/auto/flows',
        query: { limit: 50 },
      })
      return Promise.all((page.data ?? []).map((row) => record(row.id)))
    },
    { enabled },
  )

/** One flow's run history, newest first. */
export const useRuns = (flowId: string | null, enabled: boolean) =>
  useRead<Run[]>(
    ['auto', 'runs', flowId ?? ''],
    async () => {
      const page = await client(ESTATE).http.json<{ data?: Run[] }>({
        method: 'GET',
        path: '/v1/auto/runs',
        query: { flowId: flowId as string, limit: 20 },
      })
      return page.data ?? []
    },
    { enabled: enabled && Boolean(flowId) },
  )

/** Arms or disarms a flow's trigger. */
export const arm = async (id: string, on: boolean) => {
  await client(ESTATE).http.json({ method: 'POST', path: `/v1/auto/flows/${id}/${on ? 'enable' : 'disable'}` })
  invalidate(flows)
}

/** Starts one durable run now, whatever the trigger is. */
export const start = async (id: string) => {
  await client(ESTATE).http.json({ method: 'POST', path: `/v1/auto/flows/${id}/run` })
  invalidate(flows)
}

/** Creates a flow and its first draft version. It is created DISABLED. */
export const add = async (displayName: string) => {
  await client(ESTATE).http.json({ method: 'POST', path: '/v1/auto/flows', body: { displayName } })
  invalidate(flows)
}
