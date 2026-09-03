import { createBrowserRouter, Navigate } from 'react-router'

import { Boundary } from './shell/Boundary'
import { Callback } from './shell/Callback'
import { Chat } from './shell/Chat'
import { Login } from './shell/Login'
import { Root } from './shell/Root'

/**
 * Where the app is mounted, from the document that served it.
 *
 * `<base href>` is the ONE statement of that, and `data/api.ts` reads the same
 * tag to build its URLs — one source, two readers, so an app served under a
 * sub-path cannot have a router that knows and a URL table that does not.
 */
const base = document.querySelector('base')?.getAttribute('href') ?? '/'

/**
 * Every URL this client answers, in one table.
 *
 *   /               a conversation that has no id yet
 *   /c/:id          that same conversation, once it has one
 *   /login          where a refusal sends you
 *   /auth/callback  where the identity provider sends you back
 *   *               home, because every path this client has ever meant is a
 *                   conversation or a way back to one
 *
 * `/` and `/c/:id` are deliberately the SAME screen rather than a screen and a
 * redirect: starting a conversation is not a different page from continuing
 * one, and a `/c/new` that redirects is a second name for `/` that has to be
 * kept in step with it. A first message arrives at `/?q=…`, and the id appears
 * in the bar when the server gives one.
 *
 * The splat is what keeps a stale bookmark from looking like a crash. `/register`,
 * `/welcome`, `/agents`, `/d/…` — every address this product ever answered and
 * no longer does — used to fall through to the router's own error page, which
 * prints a status code and a "download error logs" button at a URL a person
 * typed. Ranked last, it catches only what nothing else claims.
 *
 * Two routes sit OUTSIDE `Root`, and both are the doorway:
 * `/login` and `/auth/callback` are where a session begins and ends, and drawing the product's
 * chrome around a page whose whole job is to hand the browser somewhere else
 * would paint a conversation list nobody can use for the half-second before the
 * navigation.
 */
export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login />, errorElement: <Boundary /> },
    { path: '/auth/callback', element: <Callback />, errorElement: <Boundary /> },
    {
      element: <Root />,
      errorElement: <Boundary />,
      children: [
        { path: '/', element: <Chat /> },
        { path: '/c/:id', element: <Chat /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: base },
)
