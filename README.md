# Hanzo Chat

A chat client, and the package the desktop is built from. Vite and React draw
it, `@hanzo/ui` supplies the components on the `@hanzo/gui` runtime, and
`@hanzo/ai` is the only thing that speaks to a server.

One bundle serves three products. `src/brand.ts` states a record per brand — its
organization, issuer, name, mark, and the hosts it answers on — and `wear()`
writes the title, icon and theme onto the document before the first render, so
`hanzo.chat`, `lux.chat` and `zoolabs.io` are one build wearing three faces.
Adding a brand is adding a record; nothing derives a name from a hostname, and
no name for the product comes from the server.

## The wire

There is no HTTP client here. `src/data/origin.ts` builds one `createAiClient`
per origin and that client owns the base URL, the bearer, the stale-token retry
and the SSE decode, so no path to the API appears in this repository at all. A
model's address is `origin/model`, so choosing a model chooses where it runs —
the estate under the visitor's IAM token, or an engine on this machine under the
key the shell started it with. Nothing downstream of the picker knows there is
more than one place.

| what | call | route |
| --- | --- | --- |
| a turn | `chat.completions.create({stream:true})` | `POST /v1/chat/completions` |
| history | `threads.list()`, `threads.get(id)` | `GET /v1/agents/chat/conversations` |
| the menu | `models.list()` | `GET /v1/models` |
| the visitor | `account.get()` | `GET /v1/ai/account` |

Identity is `@hanzo/iam`, handed to the client structurally as one token source
with one refresh, so no credential logic lives here either. `src/data/api.ts`
names four addresses and they are all the issuer's, because they are full-page
navigations the SDK does not make. `VITE_HANZO_API` moves the API without moving
the identity, which is the one arrangement a local cloud needs.

Where the server has no route, `src/data/missing.ts` says so and names the
method it waits on. Nothing is stubbed and nothing is disabled: a control that
cannot be pressed is a promise, so it is absent instead.

## Layout

One home per concern. A thing belonging to two of them belongs to neither and
goes down a level.

| module | owns |
| --- | --- |
| `src/shell` | the page — providers, routes, the sign-in gate, the palette |
| `src/rail` | the set of conversations, and a row's verbs |
| `src/thread` | one conversation rendered — turns, parts, markdown |
| `src/compose` | the draft and its journey out — the payload, the turn in flight |
| `src/data` | the client, the session, the store, and what the server cannot do |
| `src/settings` | which model answers, and every preference behind it |

The rest are rooms reached from the palette: `agents`, `artifact`, `automations`,
`boards`, `channels`, `mcp`, `plugins`, `presence`, `projects`, `shortcuts`,
`tasks`, `terminal`, `theme`.

## Styling

No Tailwind, no Radix, no shadcn, and no `cn()`. Not an omission to fill in
later — a utility class is a browser-only instruction, so each one caps the app
at the browser and forks the scale it renders at. Styling is theme tokens and
component props resolved by the gui config that `<Hanzo>` mounts, which is why
one tree renders on web, native and desktop and why the type scale moves for the
whole product from one place.

## Building on it

The package publishes its modules as built JavaScript beside their declarations,
so anything under `src` is reachable by its own path and a consumer compiles
nothing:

```tsx
import { Thread } from '@hanzo/chat/thread/Thread'
import { Compose } from '@hanzo/chat/compose/Compose'
import { client, ESTATE } from '@hanzo/chat/data/origin'
```

`@hanzo/vite` states the resolution the runtime needs — react-native-web, the
web-first extension order, one copy of gui — so a consumer's config is that call
and its own plugins:

```ts
import { hanzo } from '@hanzo/vite'
import react from '@vitejs/plugin-react'

const config = hanzo(
  { plugins: [react()], define: { 'process.env': '{}' } },
  { root: import.meta.dirname },
)

export default {
  ...config,
  optimizeDeps: {
    rollupOptions: { resolve: { extensions: (config.resolve as { extensions: string[] }).extensions } },
  },
}
```

`@hanzo/desktop` is this package plus what only a machine has, so a desktop is a
fork of that rather than a second copy of this.

## Verifying

```sh
CI=true pnpm install --no-frozen-lockfile
pnpm dev          # localhost:3090, /v1 proxied so calls stay same-origin
pnpm typecheck
pnpm test         # 31 assertions, node --test, no framework
pnpm build
```

`noUnusedLocals` is on, so dead code fails the build — un-export a symbol and
the compiler names it if nothing uses it. To prove the brand table without a
browser, import `src/brand.ts` once per host with a stubbed
`globalThis.window.location.hostname`; to prove the routes without a token, grep
the built bundle for `/v1/`.
