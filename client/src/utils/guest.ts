import { SystemRoles } from '@hanzochat/data-provider';
import type { TUser } from '@hanzochat/data-provider';

/**
 * Who a visitor is before they sign in.
 *
 * Anonymous means anonymous: there is no account behind this and no credential
 * in front of it. The value exists so the composer has a name to render and the
 * app has something to hold; the server never sees it and never trusts it. What
 * a guest is allowed to do is decided there, from the absence of a bearer.
 */
export const guestUser = (): TUser =>
  ({
    id: 'guest',
    role: SystemRoles.GUEST,
    username: 'guest',
    name: 'Guest',
    email: '',
  }) as unknown as TUser;
