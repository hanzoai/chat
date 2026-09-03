/**
 * Projects, and the people who can see them.
 *
 * `/v1/projects` is keyed by the validated principal's org and never by
 * anything in the request, so there is exactly one org here — the caller's —
 * and no switcher: a control that changed the org would change nothing the
 * server reads. The org's name comes off the account the session already read,
 * so this module asks for no second identity.
 *
 * `people.list({ owner })` is the org's directory, read through IAM's SCIM
 * surface. It is where a member count comes from; nothing publishes a plan or
 * a tier, so neither is shown.
 */
import type { Person } from '@hanzo/ai'

import { client, ESTATE } from '../data/origin.ts'
import { invalidate, useRead } from '../data/query.ts'

/** A project row, as `/v1/projects` answers it. `slug` is what addresses it. */
export type Project = {
  id: string
  slug: string
  name: string
  description?: string
  framework?: string
  visibility?: string
  status?: string
  liveUrl?: string
  starred?: boolean
  updatedAt?: number
}

const all = ['projects'] as const

/** Every project the caller's org owns. */
export const useProjects = (enabled: boolean) =>
  useRead<Project[]>(
    ['projects', 'list'],
    () => client(ESTATE).http.json<Project[]>({ method: 'GET', path: '/v1/projects' }),
    { enabled },
  )

/** The org's users. `owner` is the org, which the account names. */
export const usePeople = (owner: string | undefined, enabled: boolean) =>
  useRead<Person[]>(
    ['people', owner ?? ''],
    () => client(ESTATE).people.list({ owner: owner as string }),
    { enabled: enabled && Boolean(owner) },
  )

/** Creates a project in the caller's org. `name` is the only required field. */
export const create = async (name: string, description?: string) => {
  await client(ESTATE).http.json({
    method: 'POST',
    path: '/v1/projects',
    body: { name, ...(description ? { description } : {}) },
  })
  invalidate(all)
}

/** Bookmarks a project for the caller alone, or takes that bookmark back. */
export const star = async (slug: string, on: boolean) => {
  await client(ESTATE).http.json({
    method: on ? 'PUT' : 'DELETE',
    path: `/v1/projects/${slug}/star`,
  })
  invalidate(all)
}
