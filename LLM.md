# Hanzo Chat

AI chat interface with multi-model support,
MCP integration, agents, and RAG. Live at **hanzo.chat**.

**Repo**: `github.com/hanzoai/chat`
**Upstream**: Chat (MIT) — internal package names kept (`@hanzochat/*`)
**Package**: `@hanzochat/chat`
**Runtime**: Node.js 20 (Alpine)

## Branding

- Hanzo red `#fd4444` replaces OpenAI green `#10a37f` (Tailwind, CSS vars, emails)
- APP_TITLE: `Hanzo Chat`
- CUSTOM_FOOTER: `Powered by Hanzo AI`
- Hanzo geometric H logo throughout
- 34 language files updated

## Commands

```bash
# Install (NOT npm ci -- workspace peer deps break it)
npm install          # .npmrc has legacy-peer-deps=true

# Build
npm run build:packages   # Build data-provider, data-schemas, api, client-package
npm run frontend         # Build all packages + client

# Dev
npm run backend:dev      # API server (nodemon, port 3080)
npm run frontend:dev     # Client dev server

# Test
npm run test:all         # All workspace tests
npm run test:client      # Client tests
npm run test:api         # API tests
npm run e2e              # Playwright e2e tests

# Lint/Format
npm run lint             # ESLint
npm run format           # Prettier
```

## Workspace Structure

```
api/                 # Express backend (port 3080)
  server/            # Entry point, routes, controllers, middleware
  models/            # Model wrappers over the store (see "The store" below)
client/              # React frontend (Vite)
  src/components/    # UI components
  src/routes/        # Client-side routing
  src/store/         # State management
packages/
  data-provider/     # Shared data layer (@hanzochat/data-provider)
  data-schemas/      # Validation schemas
  api/               # API client package (@hanzochat/api)
  client/            # Shared client components
  agents/            # Agent definitions
  mcp/               # MCP server integration
```

## Configuration

- `chat.yaml` (or ConfigMap `chat-config` -> `/app/chat.yaml`)
- `hanzo-chat.example.yaml` - Hanzo-specific example config
- `.env` for secrets

Key env vars:
```
OPENAI_BASE_URL=http://llm.hanzo.svc.cluster.local:4000/v1  # Internal LLM gateway
CHAT_SQLITE_PATH=           # Embedded SQLite store (prod: /var/lib/hanzo/chat/chat.db)
CHAT_STORE_SQLITE=          # CSV of collections served from SQLite (prod: all 29)
JWT_SECRET=                 # Auth token signing
CREDS_KEY= CREDS_IV=        # Credential encryption
```

## Route namespace

Everything the Express app serves lives under `/v1/chat/` — health, auth,
images, every resource router. Exactly two things answer at the top level, and
neither is an API: the built assets (`/assets`, `/fonts`, `/manifest.json`,
`/sw.js`) and the SPA catch-all that backs `/login`, `/c/*`, `/share/*` and
`/auth/callback`. Anything else at the root is a bug — put it in the namespace.

- Health is `/v1/chat/health` (registered ahead of the middleware stack, returns
  the literal `OK`). Probes MUST use it: the SPA catch-all answers any other
  path with 200 text/html, so a wrong probe path stays green through a total API
  failure.
- Login is `POST /v1/chat/auth/iam/session` — the @hanzo/iam SPA runs
  Authorization-Code + PKCE in the browser and POSTs its token here. The
  server-initiated `/v1/chat/auth/openid[/callback]` pair is a dormant fallback.
- Images are served at `/v1/chat/images/` and the stored filepath IS that URL.
  Conversations written before the move hold `/images/…`; the server answers
  those with one permanent redirect, and `isServedImage` (data-provider — the
  one place that knows the namespace) recognises both. Nothing writes the old
  prefix. Do not add a second image namespace.

## K8s Deployment

- 2 replicas, port 3080
- Ingress: `hanzo.chat` (primary) + `chat.hanzo.ai` (301 → hanzo.chat)
- Probes: `/v1/chat/health`
- Secret: `chat-secrets` (JWT_SECRET, CREDS_KEY/IV)
- Store: embedded SQLite on the `chat-app-db` PVC — no database service
- CI: `docker-publish.yml` -> `hanzoai/chat:latest` on Docker Hub
- Image: `hanzoai/chat:latest` (amd64 only)

## Docker Build Notes

- Uses `npm install` not `npm ci` (workspace peer dep issues)
- `--max-old-space-size=4096` for client build
- jemalloc preloaded for memory efficiency
- `uv` bundled for MCP server support
- `dompurify` must be in `client/package.json` (externalized by bundler)

## Guest Chat (anonymous preview)

Off by default (`ALLOW_GUEST_CHAT=false`). When enabled, the landing IS the chat
composer (ChatGPT-style): an unauthenticated visitor renders the real chat view —
composer, starter cards, model picker — WITHOUT logging in, scoped to the free
Zen model (`GUEST_MODEL`, default `zen5-flash`) via the `Hanzo` custom endpoint
(`api.hanzo.ai`). Prod uses `GUEST_MESSAGE_MAX=2`. Exhausting the quota returns
`402 {type:'GUEST_LIMIT'}` and the client opens the existing OpenID/hanzo.id login.

The login gate is ONE component for every not-signed-in outcome. `requireLogin(reason)`
(`client/src/utils/login.ts`, beside `startHanzoLogin`) dispatches `loginRequired`;
`components/Auth/LoginGate.tsx` renders the reason's copy and the hanzo.id PKCE
redirect. Reasons: `limit` (402 GUEST_LIMIT, quota spent) and `anonymous` (401 —
the guest bearer lapsed or was never minted). Both submit paths
(`useResumableSSE.startGeneration`, `useSSE`'s 401-after-failed-refresh) ask for the
gate instead of handing the refusal to `errorHandler`, because a refused request has
no answer to render — a 401 used to surface as `Something went wrong. Here's the
specific error message we encountered: "Unauthorized"` (passport's bare body) in the
message list. `Messages/Content/Error.tsx` maps any Unauthorized body shape to
`com_error_unauthorized` so no other path can print it either. `Root` mounts the gate
for every `!isAuthenticated` visitor, not only a minted guest.

Client render path (guest === chat, not a marketing gate):
- `AuthContext` auto-acquires a guest token when `startupConfig.allowGuestChat`
  is true (`silentRefresh` fallback + a dedicated effect closing the config race);
  sets `isGuest=true`, `isAuthenticated=false`. `useAuthRedirect` keeps guests on
  the chat surface (only truly anonymous, non-guest, non-guest-enabled users go to
  `/login`). `Root` shows the chat shell for `isAuthenticated || isGuest`.
- `ChatRoute` renders `ChatView` for `canChat = isAuthenticated || isGuest`; the
  `/v1/chat/models` + `/v1/chat/endpoints` queries run for guests (both routes use
  `requireGuestOrJwtAuth` and return the guest-scoped single-model config), and the
  roles gate treats a guest as loaded (guests have no agent access). Files:
  `client/src/routes/{ChatRoute,useAuthRedirect}.tsx`, `hooks/useGuestAuth.ts`,
  `hooks/AuthContext.tsx`, `components/Auth/LoginGate.tsx`.

Security model (fail-closed, server-enforced):
- `POST /v1/chat/auth/guest` issues a short-lived guest JWT (`{guest:true}`,
  per-token random id) signed with `JWT_SECRET`. Rate-limited per IP
  (`guestTokenLimiter`, `GUEST_TOKEN_MAX`/`GUEST_TOKEN_WINDOW`) so tokens can't be
  spam-minted.
- `requireGuestOrJwtAuth` (chat-completion + guest-safe bootstrap routes: models,
  endpoints, user, convos, favorites, agents `/chat/active`) accepts guest tokens;
  the standard `jwt` strategy rejects them everywhere else (no DB user), so every
  other route stays closed. `enforceGuestScope` pins endpoint+model and strips
  agents/tools/files/spec/preset. Guests use the shared, capped guest gateway key
  `GUEST_API_KEY` (the KMS `chat-guest-key`; `HANZO_API_KEY` is the dev fallback),
  resolved in `packages/api/src/endpoints/custom/initialize.ts` — the guest key's
  OWN org is metered+capped at the gateway, and per-user `hk-` billing is skipped
  for `guest` principals (they carry no forwardable bearer and no `X-Org-Id`).
- `guestMessageLimiter` enforces the quota against the REAL client IP
  (`utils/guestClientIp` → Cloudflare `CF-Connecting-IP`, falls back to `req.ip`),
  NOT the token — clearing cookies / incognito / minting a fresh token does NOT
  reset it. The store is `limiterCache`, which returns `undefined` when `USE_REDIS`
  is off → `express-rate-limit` uses its in-process MemoryStore. That store is
  authoritative at the live deploy's `replicas: 1` + `Recreate` (never two live
  pods to round-robin); Redis is NOT required (it was killed platform-wide). The
  only reset is a pod restart — operational, not attacker-triggerable. If guest
  chat ever scales past one replica, set `USE_REDIS=true` so the count holds
  across pods.
- Key files: `api/server/services/guestConfig.js`,
  `api/server/controllers/auth/GuestController.js`,
  `api/server/middleware/{requireGuestOrJwtAuth,enforceGuestScope}.js`,
  `api/server/middleware/limiters/{guestLimiters,guestMessageLimiter}.js`,
  `api/server/utils/guestClientIp.js`,
  router wiring in `api/server/routes/agents/index.js`.
- Env: `ALLOW_GUEST_CHAT`, `GUEST_MODEL` (prod `zen5-flash`), `GUEST_ENDPOINT`
  (`Hanzo`), `GUEST_MESSAGE_MAX` (prod `2`), `GUEST_TOKEN_EXPIRY`, `GUEST_TOKEN_MAX`,
  `GUEST_TOKEN_WINDOW`. Requires the shared, capped guest key `GUEST_API_KEY`
  (KMS `chat-guest-key`; falls back to `HANZO_API_KEY`). No Redis dependency at
  `replicas: 1` — the in-process MemoryStore is the quota's single source of truth.

## Cloud Agents (canonical /v1/agents)

Chat can RUN a user's canonical Hanzo Cloud agents (cloud `/v1/agents`, the ONE
production agent registry) from the thread — alongside the Chat-legacy local
agent builder, which is untouched.

- Two surfaces, ONE run path: the `/agent <name> [prompt]` slash command and the
  @mention picker (cloud agents appear as a `cloudAgent` type). Both funnel
  through `useRunCloudAgent` → `POST /v1/chat/agents/cloud/:name/run`. The @mention /
  `/agent` picker arms `/agent <name> ` in the composer; submit is intercepted in
  `ChatForm` (`parseAgentCommand`) and dispatched to the run path.
- Server proxy + auth (token never reaches the browser): the chat backend reads
  the user's hanzo.id token from the server-side session
  (`req.session.openidTokens.idToken`, then `accessToken`, then the httpOnly
  cookies) and forwards it as `Authorization: Bearer` to cloud. Cloud's
  `SanitizeIdentity` (HIP-0026) validates it and pins `X-Org-Id` from the `owner`
  claim, so a user only ever reaches their OWN org's agents — chat never asserts
  an org. `requireJwtAuth` gates the proxy (guests rejected); missing token →
  honest 401, never a service-token fallback (fail-secure). Agent name is
  validated against cloud's handle grammar (traversal/SSRF guard); it is NOT an
  open proxy (three fixed endpoints). Principal guard: the on-behalf-of decision
  keys off the VALIDATED principal (`req.user.provider==='openid'`), not the
  mutable `token_provider` refresh-strategy cookie, so a local user (who never
  carries a hanzo.id token) can't run under a stale OpenID session. EVERY
  forwarded token — id_token preferred, access_token fallback, from session or
  the httpOnly cookie — must pass `isForwardableToken`: a decodable JWT whose
  `sub` EQUALS `req.user.openidId` (binding MANDATORY — absent `openidId`/`sub`
  or a mismatch ⇒ no forward, no fail-open) and is unexpired. Decode-only is
  sound because cloud does the authoritative JWKS validation over the SAME claims,
  so it runs as exactly that `sub`; the gate only ever removes a token. An
  unbindable/expired/foreign token yields an honest 401, never a fabricated or
  wrong-principal run.
- id_token persistence is DECOUPLED from the refresh strategy: OIDC login ALWAYS
  persists the on-behalf-of BEARER (id_token + access_token) to
  `req.session.openidTokens` (server-side only), regardless of
  `OPENID_REUSE_TOKENS`. It does NOT persist the OIDC refresh credential in the
  decoupled default — the session refreshes via the local JWT cookie, so
  `session.openidTokens.refreshToken` is written ONLY in REUSE mode (where
  `refreshController`/`logoutController` read it). That keeps login, refresh AND
  logout on the local-JWT path byte-identical to a non-OpenID login; that flag
  SOLELY gates whether `/v1/chat/auth/refresh` performs the OIDC refresh-grant.
  The ~1h id_token is used while valid; durable refresh (hanzo.id OIDC
  refresh or an RFC-8693 token-exchange from the chat session) is a tracked
  FOLLOW-UP — the login-breaking refresh-grant is NOT enabled here.
- Abuse limits (a run is a real billable completion): a per-user rate limiter
  (`cloudAgentLimiter`, `CLOUD_AGENT_USER_MAX`/`CLOUD_AGENT_WINDOW`) guards the
  whole `/cloud` router; the client caps input by UTF-8 **bytes** (128 KiB), caps
  the buffered response (4 MiB → 502), and sheds load past a process-wide in-flight
  ceiling (`CLOUD_AGENT_MAX_CONCURRENT`, 503).
- Key files: backend `api/server/services/CloudAgentsClient.js`,
  `api/server/routes/agents/cloud.js` (mounted `/cloud` in
  `api/server/routes/agents/index.js`); data layer
  `packages/data-provider/src/{types/cloudAgents.ts,api-endpoints.ts,data-service.ts}`;
  client `client/src/hooks/Agents/useRunCloudAgent.ts`,
  `client/src/utils/agentCommand.ts`,
  `client/src/components/Chat/Input/AgentsCommand.tsx`, and the @mention wiring in
  `client/src/hooks/Input/useMentions.ts` + `Mention.tsx`.
- Env: `HANZO_CLOUD_URL` (optional; falls back to the `OPENAI_BASE_URL` host).
- Convergence path (later): chat's Chat-legacy `/v1/chat/agents` CRUD should
  converge onto cloud `/v1/agents`; this step only ADDS cloud-agent RUN.

## Unified cloud architecture (2026-07) — investigate-before-ripping map

hanzo.chat is the **chat view** of the Hanzo AI cloud (sibling to hanzo.app =
builder, console = admin). This section is the honest map of what is ALREADY
unified onto the Go backend (`api.hanzo.ai/v1`) vs the one real seam that is not.
Verified by full call-graph + route-table trace; do NOT rip blind.

### What already routes through the Go backend `api.hanzo.ai/v1` (no shadow LLM)

- **Chat completions**: client `useSSE` → `POST /v1/chat/agents/chat/Hanzo` (all
  chat, incl. plain-model, goes through the agents framework) → custom-endpoint
  resolver (`packages/api/src/endpoints/custom/initialize.ts`) reads
  `HANZO_API_KEY` + literal `baseURL https://api.hanzo.ai/v1` from the loaded
  config → LangChain OpenAI client → **`POST https://api.hanzo.ai/v1/chat/completions`**
  (SSE stream, resumable via `GenerationJobManager`). Per-user `hk-` key +
  per-org Commerce debit; fail-closed 402. THIS is the one inference path.
- **Code interpreter** → `CHAT_CODE_BASEURL` = cloud `/v1/exec`.
- **Web search** → `webSearch` block (searxng+firecrawl contracts) = cloud
  `/v1/websearch`.
- **Cloud agents** → `POST /v1/chat/agents/cloud/:name/run` server-proxies to cloud
  `/v1/agents` with the user's hanzo.id bearer (see "Cloud Agents" section).
- **Model list**: curated **zen-only** (`fetch:false`) in the loaded config —
  NO raw upstream names (brand policy). Authoritative prod list lives in the
  `chat-config` ConfigMap (`universe infra/k8s/chat/configmap.yaml`); repo
  `chat.yaml` mirrors it (one way).

### DEAD residue — do NOT treat as a live backend

- `config.yaml` (LiteLLM `model_list`/`litellm_params`), `docker/Dockerfile.{simple,dev,custom_ui}`
  (`CMD litellm`), `deploy/migrations/*` (`LiteLLM_*` Prisma tables),
  `CONTRIBUTING.md` (upstream LiteLLM's), `scripts/cleanup-{litellm,hanzo-chat}.sh`:
  all **unreferenced** by any compose/k8s/helm/Dockerfile.multi. Prod runs
  `node server/index.js` and hits `api.hanzo.ai/v1` directly — NO local litellm
  sidecar. This is upstream merge residue; safe to delete in a dedicated sweep.

### The store: SQLite, not Mongo

**There is no MongoDB.** The cutover finished: `chat-docdb` is deleted from the
cluster, `MONGO_URI` is unset, `connectDb()` logs `SQLite-only mode, skipping
MongoDB connection` and returns null, and all 29 domains
(`Conversation,Message,Preset,…,Balance,Transaction`) are served from one
embedded SQLite file at `CHAT_SQLITE_PATH=/var/lib/hanzo/chat/chat.db` on the
`chat-app-db` PVC. The seam is `CHAT_STORE_SQLITE` (prod sets all 29);
`applySqliteOverrides` in `packages/data-schemas/src/models/index.ts` swaps the
mongoose models for `DocModel`s. The `CHAT_STORE_DUALWRITE` mirror that carried
the migration is **removed** — its purpose was keeping Mongo current as a
rollback target, and there is no Mongo to roll back to.

Read this before deleting anything else Mongo-shaped:

- **`express-mongo-sanitize` is NOT vestigial. Keep it.** The store speaks
  Mongo-*shaped* queries: `stores/sqlite/engine.ts` interprets `$eq $ne $in
  $nin $gt $gte $lt $lte $exists $regex $not $and $or $nor` in filters and
  `$set $unset $inc $push $pull $addToSet` in updates. A `{"$ne": null}` that
  reaches a filter is operator injection against SQLite exactly as it was
  against Mongo. The guard outlived the database it is named for.
- **mongoose is still a real dependency**, and removing it is a migration, not
  a sweep. Every schema in `packages/data-schemas/src/schema/*` (34 files) is a
  mongoose `Schema`; `createModels(mongoose)` builds mongoose models first and
  `applySqliteOverrides` replaces them. `mongoose.Types.ObjectId` is the id
  generator throughout.
- **The mongoose path is still the repo default.** Nothing in this tree sets
  `CHAT_STORE_SQLITE` — prod sets it in the operator App CR (`universe
  infra/k8s/operator/crs/chat.yaml`). Unset, `createModels` returns pure
  mongoose. Tests run that way.
- **`mongoMeili` (`models/plugins/mongoMeili.ts`) is the mongoose path's search
  driver**, superseded in prod by `stores/sqlite/meili.ts` (`attachMeili` wires
  `onMutate` + `meiliSearch` onto the DocModels and does its own idempotent
  `ensureIndex`). It is still applied to the convo/message schemas whenever
  `MEILI_HOST`+`MEILI_MASTER_KEY` are set, so it runs a redundant index-ensure
  at boot and logs `[mongoMeili] Error checking index …: fetch failed` when it
  races the cloud shim. Harmless but noisy; it goes when mongoose goes.
- **`keyvMongo` is gone; durable cache state is `durableCache` on SQLite.**
  Two namespaces need to outlive the process — `CacheKeys.BANS` (the ban
  record) and `CacheKeys.ENCODED_DOMAINS` (an action tool's domain; forgetting
  it orphans the tool). Both went through `keyvMongo`, which threw
  `Mongoose connection not ready` on first touch once `MONGO_URI` went unset.
  They now go through `durableCache(namespace, ttl)`
  (`packages/api/src/cache/cacheFactory.ts`) → `KeyvSqlite`
  (`packages/api/src/cache/keyvSqlite.ts`) → a two-column `keyv` table on the
  same `sharedDatabase()` connection the document store uses. Redis, when
  configured, still wins — `durableCache` is `standardCache` with SQLite as the
  fallback instead of process memory.
  - `sharedDatabase()` / `closeSharedDatabase()` (`stores/sqlite/index.ts`) are
    the ONE connection for the process. `createModels` builds its handle over
    it rather than opening a second writer against the same WAL.
  - `BAN_VIOLATIONS` is safe to switch on. `checkBan` also carries upstream
    #12324's fixes, which the fork had dropped on the floor — it kept the tests
    and lost the implementation, so the suite crashed on an unhandled rejection
    and the middleware still coerced the ban record to a boolean
    (`Number(true.expiresAt)` → `NaN` → a memo entry with no expiry, IP-keyed,
    blocking whoever inherits that address).

### IAM-native auth (HIP-0111) — federated to hanzo.id, LIVE

- **Prod (backend-proxied)**: Chat passport `openid-client` strategy,
  OIDC **discovery** from `${OPENID_ISSUER}` = `https://hanzo.id`
  (`/.well-known/openid-configuration`; discovery fetched via in-cluster
  `iam.hanzo.svc` to dodge the CF hairpin), client_id **`hanzo-chat`**, callback
  `/v1/chat/auth/openid/callback`. Local email/password is OFF in prod
  (`ALLOW_EMAIL_LOGIN=false`, `ALLOW_REGISTRATION=false`); social OIDC only.
  Files: `api/strategies/openidStrategy.js`, `api/server/iamLogin.js`,
  `api/server/routes/auth.js`. This IS IAM-native (federated), just not the
  console `@hanzo/iam-js-sdk` shape.
- **Static/IAM SPA mode** (`Dockerfile.static`, not the live prod deploy): browser
  `@hanzo/iam` `BrowserIamSdk` PKCE straight to hanzo.id
  (`client/src/utils/iam.ts`, `OAuthCallback.tsx`). ⚠️ INCONSISTENCY: uses
  client_id **`app-chat`** while prod uses `hanzo-chat` — align to `hanzo-chat`.
  `@hanzo/iam` is pinned `^0.4.0` (HIP-0111 wants ≥0.11.0); this path is dormant.

### One shell, one accent, one menu

Chat used to carry TWO cross-app headers: `@hanzogui/shell`'s on the landing and
`@hanzo/ui/navigation`'s in the app. The second was resolved with `require()`
inside a try/catch — `require` does not exist in a Vite ESM browser bundle, so
the catch swallowed the ReferenceError and the component returned `null` for
every signed-in and guest visitor. **`@hanzo/ui` (the shadcn library) is retired
and is gone from chat**: `Nav/HanzoHeader.tsx` and `Nav/NetworkWallet.tsx` are
deleted, the dependency is out of `client/package.json`, and the two dead
`node_modules/@hanzo/ui/dist/**` globs are out of `tailwind.config.cjs`.

- **Shell chrome** = `@hanzogui/shell` only (HanzoHeader / HanzoAppHeader /
  HanzoFooter / HanzoPreFooterCTA / MeetHanzoMenu / HanzoAppLauncher). It is
  self-contained — inline styles + `theme.ts` tokens — so it drops into Vite
  with no provider. **The product still has NO cross-app nav.** `Chat/Header.tsx`
  mounts `HanzoAppLauncher`, but that header does not paint on the default
  screen: driving live hanzo.chat as a guest finds no `<header>`, no
  `absolute top-0 h-14` div, and the string "Meet Hanzo" nowhere in the body.
  Deleting the dead header removed the second implementation; it did not close
  the gap. `HanzoAppHeader` is the shell's signed-in header and is the way to
  close it — it is `position: sticky`, `height: 56`, so `Root.tsx`'s
  `calc(100dvh - bannerHeight)` must subtract it too or the composer falls off
  the bottom. That is a layout change, not a sweep.
- **Tailwind must scan the shell.** A distributed library that paints itself
  with utility class names (`bg-[#0e0e13]`, `z-[101]`, `border-white/[0.06]`)
  renders transparent and unstacked in a host that never scans it. 45 of the
  147 class names in `@hanzogui/shell/dist` had no rule in chat's stylesheet;
  `tailwind.config.cjs` now includes `../node_modules/@hanzogui/shell/dist/**`.
- **Accent.** `@hanzo/brand` ships violet `--hanzo-accent: #8b5cf6` as the shared
  Hanzo accent and the shell reads it via `var(--hanzo-accent, #ffffff)`, which
  put a violet "New chat" CTA beside a white "Get Started Free" CTA in one frame.
  `style.css` overrides `--hanzo-accent` (and hover/muted/soft/rgb) to white —
  the mechanism `@hanzo/brand` documents for a host that does not take violet.
  Chat is monochrome; nothing in chat's own source reads the token.
- **`@hanzo/gui`** = a **Tamagui** fork (Next.js 15 / React 19, RN-web). Forcing
  it into the Vite/React18 client is a ground-up rewrite of a live product; the
  convergence target inside chat is `@hanzochat/client`'s own primitives —
  `DropdownPopup` (Ariakit; `.popover-ui` is REAL CSS, not a scanned class
  string) is the canonical anchored menu, 28 call sites.

### Config filename caveat

`loadCustomConfig.js` defaults to **`chat.yaml`** (`CONFIG_PATH || <root>/chat.yaml`).
Prod sets `CONFIG_PATH=/app/chat.yaml` (ConfigMap mount). Repo ships
`chat.yaml` (reference); a deploy that doesn't set `CONFIG_PATH` to it (or
provide `chat.yaml`) falls back to the built-in `openAI` endpoint. `OPENAI_BASE_URL`
in `compose.prod.yml` is inert here (built-in openAI reads `OPENAI_REVERSE_PROXY`).

## Internal Package Names

These are kept as-is from upstream (npm deps, not worth renaming):
- `@hanzochat/api`, `@hanzochat/client`, `@hanzochat/data-schemas`, `@hanzochat/data-provider`, `@hanzochat/agents`
- Functions: `extractChatParams`, `importChatConvo`
- Type names: `ChatKeys`, `ChatParams`
- Config filename: `chat.yaml` (upstream convention)
- Env var: `CHAT_LOG_DIR`

## Branding Cleanup Log

All user-visible `Chat` / `chat.ai` references replaced with Hanzo equivalents:
- All `chat.ai` URLs -> `hanzo.ai/docs/chat/...`
- `code.chat.ai` -> `hanzo.ai/docs/chat/code-interpreter/...`
- package.json repo URLs -> `github.com/hanzoai/chat`
- package.json homepages -> `hanzo.ai/chat`
- package.json descriptions -> "Hanzo Chat"
- Help/FAQ default URL -> `hanzo.ai/chat`
- Docker Compose MongoDB DB name -> `HanzoChat`
- GitHub workflow repo refs -> `hanzoai/chat`
- MCP User-Agent -> `HanzoChat-MCP-Client`
- JSDoc comments: Chat -> Hanzo Chat
- Log messages: Chat -> Hanzo Chat
- Helm chart URLs -> hanzo.ai/docs/chat/...
