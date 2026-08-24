# Hanzo Chat

The clean-room replacement for `hanzoai/chat`. Same product, rebuilt on the
Hanzo stack instead of the fork's: `@hanzo/ui` components on the `@hanzo/gui`
runtime, `react-router`, nothing else for the interface.

It takes the `chat` name when it lands — same move as `iam2`, which was written
beside `iam` and became it. `chat2` is the name of the rewrite, not of the
product.

## What is not here

No Tailwind and no Radix: no utility classes, no config file, no PostCSS
pipeline to run one, and none of the shadcn/cva/cmdk/sonner layer that sits on
top of them.

That is not an omission to fill in later. A utility class is a browser-only
instruction, so every one of them caps the app at the browser and forks the
scale it renders at. Styling here is theme tokens and component props —
`$background`, `$color12`, `$borderColor`, `padding="$4"` — resolved by the gui
config that `<Hanzo>` mounts, which is why the same tree renders on web, native
and desktop, and why the type scale moves for the whole product from one place.

`hanzo.app` is the proof this works at size: 366 gui atomic classes and zero
Tailwind in production.

## Layout

One home per concern. A thing that belongs to two of them belongs to neither and
goes down a level.

| module          | owns                                                          |
| --------------- | ------------------------------------------------------------- |
| `src/shell`     | the page: providers, routes, the sign-in gate, the palette     |
| `src/rail`      | the SET of conversations: the left column, a row and its verbs |
| `src/thread`    | ONE conversation, rendered — turns, parts, markdown            |
| `src/compose`   | the draft and its journey out — the payload and the stream     |
| `src/settings`  | which model answers, and every persisted preference behind it  |
| `src/data`      | the wire and the identity — URLs, fetch, session, store        |

`src/App.tsx` is the whole URL surface, and `src/data/api.ts` is the whole URL
table. Nothing outside `src/data` knows an API host: the client is served beside
the API and calls `/v1/chat/*` same-origin, which the dev proxy in
`vite.config.ts` makes true on localhost too.

## Run

```sh
pnpm install
pnpm dev         # http://localhost:3090
pnpm typecheck
pnpm build
```
