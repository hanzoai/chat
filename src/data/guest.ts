/**
 * Who a visitor is before they sign in.
 *
 * Anonymous means anonymous: there is no account behind this and no credential
 * in front of it. The value exists so the composer has a name to render and the
 * shell has something to hold; the server never sees it and never trusts it.
 * What a guest may do is decided there, from the absence of a bearer — which is
 * also why becoming one cannot fail and asks nobody's permission.
 */
import type { User } from '~/data/types'

export const GUEST = 'guest'

export const guest = (): User => ({
  id: GUEST,
  role: GUEST,
  username: GUEST,
  name: 'Guest',
})

/** Whether a person is the anonymous one. */
export const isGuest = (user: User | null | undefined): boolean => user?.id === GUEST
