/**
 * Who else is in the org, and whether the roster panel is open.
 *
 * The roster is `people.list({ owner })` — IAM's SCIM directory,
 * `GET /v1/iam/scim/v2/Users?owner=<org>`. It is the only thing on this wire
 * that knows a teammate's name, and reading the whole list takes an
 * administrator: an ordinary person is refused, which is a real answer the
 * panel reports rather than an empty list.
 *
 * Two things this module used to claim, and the server does not:
 *
 * There is NO presence. Nothing publishes who is online, typing or idle, so the
 * green dot is gone rather than lit for everybody. SCIM's `active` is whether an
 * account is enabled, not whether somebody is at their desk, and rendering one
 * as the other is the same lie with a citation.
 *
 * There is NO invite. SCIM's POST provisions a person FROM an identity provider
 * and takes an administrator; `@hanzo/ai` binds no method for it; and
 * `editor`/`viewer` are not words this wire knows — a person is active or not,
 * and an administrator or not. Nothing ties a person to a conversation at all.
 *
 * `openInvite` keeps its name because three surfaces outside this module call
 * it. What it opens is the roster.
 */
import { useCallback, useSyncExternalStore } from 'react'
import type { Person } from '@hanzo/ai'

import { client, ESTATE } from '../data/origin'
import { useRead } from '../data/query'
import { useSession } from '../data/session'

export type MultiplayerState = {
  /** Whether the roster panel is open. */
  isInviteOpen: boolean
  /** The org's people, self first. Empty until the read lands, or if refused. */
  participants: Person[]
  /** The read is in flight. */
  pending: boolean
  /** Why the roster is empty, when it is. `APIError` 403 means not an admin. */
  error: unknown
}

let open = false

const listeners = new Set<() => void>()

const notify = () => {
  for (const fn of listeners) fn()
}

const set = (next: boolean) => {
  if (open === next) return
  open = next
  notify()
}

export const multiplayerStore = {
  openInvite: () => set(true),
  closeInvite: () => set(false),
}

const listen = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const held = () => open

/**
 * The org's people.
 *
 * `service: false` because a directory of teammates is people; the service
 * accounts are the same org's robots and belong on an operator's screen.
 *
 * Self is sorted first. An avatar stack leads with you, and the surfaces that
 * render "everyone else" take the tail — so the order is load-bearing rather
 * than decorative.
 *
 * The key is written here rather than in `~/data/keys` only because this module
 * may not edit that file; it belongs there, beside `keys.user`, as
 * `keys.people(org)`.
 */
const usePeople = () => {
  const { standing, user } = useSession()
  /** IAM's `owner` is the org. `session.tsx` carries it as `User.role`. */
  const org = standing === 'live' ? user?.role : undefined
  const me = user?.username

  return useRead<Person[]>(
    ['people', org ?? ''],
    async () => {
      const people = await client(ESTATE).people.list({ owner: org as string, service: false })
      return me ? [...people].sort((a, b) => Number(b.name === me) - Number(a.name === me)) : people
    },
    { enabled: Boolean(org) },
  )
}

export const useMultiplayer = (): MultiplayerState => {
  const isInviteOpen = useSyncExternalStore(
    useCallback((fn: () => void) => listen(fn), []),
    held,
    held,
  )
  const people = usePeople()

  return {
    isInviteOpen,
    participants: people.data ?? [],
    pending: people.pending,
    error: people.error,
  }
}
