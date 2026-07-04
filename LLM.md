# Hanzo Chat

AI chat interface with multi-model support,
MCP integration, agents, and RAG. Live at **hanzo.chat**.

**Repo**: `github.com/hanzoai/chat`
**Upstream**: LibreChat (MIT) — internal package names kept (`@librechat/*`)
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
  db/base/           # Hanzo Base data-layer adapter (replaces MongoDB) — see below
  models/            # Model method wrappers (persist to Base via the adapter)
client/              # React frontend (Vite)
  src/components/    # UI components
  src/routes/        # Client-side routing
  src/store/         # State management
packages/
  data-provider/     # Shared data layer (librechat-data-provider)
  data-schemas/      # Validation schemas
  api/               # API client package (@hanzochat/api)
  client/            # Shared client components
  agents/            # Agent definitions
  mcp/               # MCP server integration
```

## Data Layer — Hanzo Base (MongoDB dropped)

Hanzo Chat does **not** use MongoDB. Persistence runs on **Hanzo Base** (the Go
PocketBase-lineage server; SQLite embedded for dev, Postgres for prod). The
"drop mongo completely" directive (#48) is realised by a thin adapter under
`api/db/base/` that presents a Mongoose-Model-compatible surface backed by the
`@hanzo/base` JS client. There is **one** adapter; every model comes along.

### How it works (one adapter, all models)
`@librechat/data-schemas` builds its schemas with real `mongoose` purely as a
schema DSL, then asks a mongoose instance to turn them into models
(`createModels`/`createMethods`). We hand it a **facade** instead of real
mongoose:

- `api/db/base/mongoose.js` — a `mongoose`-compatible facade. Delegates
  schema/ObjectId/type concerns to real mongoose (never connected) but
  overrides `model()`/`models`/`connect`/`connection`. `model(name, schema)`
  returns a Mongoose-style **constructor** (statics + `new Model(data)` docs).
- `api/db/base/model.js` — `BaseModel`: the Mongoose Model static surface
  (`find/findOne/findOneAndUpdate/create/insertMany/updateOne/updateMany/
  deleteOne/deleteMany/countDocuments/bulkWrite/aggregate/distinct/exists`),
  a chainable/thenable `Query` (`select/sort/limit/skip/lean/populate` +
  `find(A).deleteMany(B)`), and lightweight documents (`toObject/save`).
- `api/db/base/query.js` — a correct in-JS Mongo query/update engine
  (`$or/$and/$in/$nin/$gt../$exists/$regex/$elemMatch`, update ops
  `$set/$unset/$inc/$push/$addToSet/$pull/$setOnInsert`, projection, sort).
  This is the correctness backstop — every predicate is evaluated here.
- `api/db/base/store.js` — the Base backend via `@hanzo/base` `BaseClient`.
  Each model → one Base collection whose records hold the **full document as a
  JSON `data` field** plus promoted scalar columns (from indexed/unique schema
  paths) used only for **filter pushdown** (a guaranteed superset; the JS
  engine then narrows). `@hanzo/base` is ESM-only → loaded via dynamic
  `import()` from this CommonJS code.
- `api/db/base/schema.js` — introspects a Mongoose schema for defaults,
  timestamps, and promotable columns.
- `api/db/base/index.js` — `connectDb()` inits the Base client, health-checks,
  and provisions every registered model's collection (idempotent).

### Wiring (all app code off mongoose)
`api/db/{connect,models,index}.js`, `api/models/index.js`, and every remaining
app file (`Agent`, `inviteUser`, `PermissionService`, `PermissionsController`,
`initializeMCPs`, `migration`) import the facade (`~/db/base`) — not `mongoose`.
The facade itself carries **no `mongoose` runtime dependency** (own ObjectId,
Schema.Types shim, no-op session/connection). `grep "require('mongoose')"` over
non-test `api/` is **zero**; **nothing calls `mongoose.connect`**. `_id` is a
real 24-hex ObjectId string stored inside the document; conversations/messages
remain keyed by their `conversationId`/`messageId` UUIDs.

### Search (FTS on Base/SQLite)
MeiliSearch is dropped. `BaseModel.meiliSearch(query, {filter})` runs a
user-scoped, case-insensitive substring search over content fields flagged
`meiliIndex` (title, text), returning Meili-shaped `{ hits }`. `indexSync.js`
is a no-op (no external index); `/search/enable` reports availability from Base
(set `SEARCH=false` to disable). A future optimisation is a SQLite FTS5 index
instead of the per-user scan.

### Security invariants (do not regress — from blue+red review)
- **Prototype pollution:** `query.js` path helpers reject `__proto__` /
  `constructor` / `prototype` segments (attacker update keys flow in via
  `saveConvo` / conversation import). Keep the guard.
- **`select:false`:** secrets (password, totpSecret, backupCodes, keyHash) are
  excluded from reads by default; only `+field` returns them. `save()` merges
  onto the stored record so a projected load never erases them.
- **Pushdown = SUPERSET:** `store.js buildFilter` must only ever broaden; the JS
  matcher narrows. Never push a predicate that could wrongly exclude — Date
  columns and non-finite numbers are intentionally NOT pushed (Base date-column
  normalization vs ISO would silently drop records).
- **DSL injection:** `quote()` escapes `\` and `'`; verified a crafted
  `conversationId` cannot inject `||`/operators.

### Uniqueness / concurrency
Collections carry a Base **UNIQUE** index on always-present unique keys (`_id`,
`conversationId`, `messageId`, `email`); optional/sparse unique fields
(`googleId`, `openidId`, …) stay plain-indexed to avoid null conflicts, with
logical uniqueness enforced by the adapter upsert. The unique index is the
race-safety net (verified: a duplicate `conversationId` insert is rejected).

### Env / running
```
HANZO_BASE_URL=http://…      # Hanzo Base instance (replaces MONGO_URI)
HANZO_BASE_TOKEN=…           # Base superuser/service token (IAM in prod)
```
Local Base for dev: build a pure-SQLite launcher from `~/work/hanzo/base`
(`base.New()` without the IAM platform plugin), `serve --http=127.0.0.1:8090`;
the first serve prints a 30-min superuser installer token. API prefix is `/v1`.

### Tests
- `api/db/base/query.spec.js`, `api/db/base/model.spec.js` — jest, in-memory
  store, no Base/Mongo needed (CI). `cd api && npx jest db/base`.
- `api/db/base/scripts/live-check.js` — real data-schemas factories vs a live
  Base: createUser + balance grant + findUser + bcrypt + saveConvo + saveMessage,
  verified via raw Base REST. Env-gated (`HANZO_BASE_URL`/`HANZO_BASE_TOKEN`).
- `api/db/base/scripts/boot-smoke.js` — drives the wired `~/db` + `~/models`
  boot path (`connectDb` + `seedDatabase`) against live Base.

### Phased status
- **Phase 1 (done):** adapter + core hot path verified on Base (User, Balance,
  Conversation, Message, Agent, plus Role/Session/Token/Category via the same
  adapter — 29 collections provisioned). Nothing connects to Mongo.
- **Phase 2 (done):** Base/SQLite full-text search replaces MeiliSearch;
  `indexSync` no-op; dead Meili helpers removed. Live-verified real hits.
- **Phase 3 (done):** all app code off `mongoose` (self-contained facade);
  Base UNIQUE indexes on natural keys (race-safety, live-verified);
  `select:false` secrets honored; all Date fields hydrated.
- **Remaining tail (test migration):** ~28 legacy `*.spec.js` still build models
  on real `mongoose` + `mongodb-memory-server` (e.g. `api/models/*.spec.js`).
  They're incompatible with the port (they expect mongoose-backed models) and
  must be migrated to the adapter (in-memory store harness) — that is what gates
  dropping the `mongoose`/`mongodb-memory-server` devDeps and a literal
  `grep -riE 'mongoose|mongodb' api/` = 0. The adapter's own suites
  (`api/db/base/*.spec.js`) are the migration template.
- **Deploy:** build image via CI → `registry.hanzo.ai`, deploy to DOKS with a
  Base instance + IAM service token (`HANZO_BASE_URL`/`HANZO_BASE_TOKEN`), then
  Playwright-verify login+chat+agent+search in the browser. Gated on cluster access.

## Configuration

- `librechat.yaml` (or ConfigMap `chat-config` -> `/app/librechat.yaml`)
- `hanzo-chat.example.yaml` - Hanzo-specific example config
- `.env` for secrets

Key env vars:
```
OPENAI_BASE_URL=http://llm.hanzo.svc.cluster.local:4000/v1  # Internal LLM gateway
MONGO_URI=                  # MongoDB connection
JWT_SECRET=                 # Auth token signing
CREDS_KEY= CREDS_IV=        # Credential encryption
```

## K8s Deployment

- 2 replicas, port 3080
- Ingress: `hanzo.chat` (primary) + `chat.hanzo.ai` (301 → hanzo.chat)
- Secret: `chat-secrets` (MONGO_URI, JWT_SECRET, CREDS_KEY/IV)
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
Zen model (`GUEST_MODEL`, default `zen3-nano`) via the `Hanzo` custom endpoint
(`api.hanzo.ai`). Prod uses `GUEST_MESSAGE_MAX=2`. Exhausting the quota returns
`402 {type:'GUEST_LIMIT'}` and the client opens the existing OpenID/hanzo.id login.

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
  `hooks/AuthContext.tsx`, `components/Auth/GuestLimitDialog.tsx`.

Security model (fail-closed, server-enforced):
- `POST /v1/chat/auth/guest` issues a short-lived guest JWT (`{guest:true}`,
  per-token random id) signed with `JWT_SECRET`. Rate-limited per IP
  (`guestTokenLimiter`, `GUEST_TOKEN_MAX`/`GUEST_TOKEN_WINDOW`) so tokens can't be
  spam-minted.
- `requireGuestOrJwtAuth` (chat-completion route ONLY) accepts guest tokens;
  the standard `jwt` strategy rejects them everywhere else (no DB user), so
  every other route stays closed. `enforceGuestScope` pins endpoint+model and
  strips agents/tools/files/spec/preset. Guests always use the shared, capped
  `HANZO_API_KEY` (per-user `hk-` billing is skipped for `guest` principals).
- `guestMessageLimiter` enforces the quota against the REAL client IP
  (`utils/guestClientIp` → Cloudflare `CF-Connecting-IP`, falls back to `req.ip`),
  NOT the token — clearing cookies / incognito / minting a fresh token does NOT
  reset it. Backed by the shared Redis `limiterCache` so it holds across replicas.
  `USE_REDIS=true` is MANDATORY (a memory store would let a visitor round-robin
  pods to multiply their quota).
- Key files: `api/server/services/guestConfig.js`,
  `api/server/controllers/auth/GuestController.js`,
  `api/server/middleware/{requireGuestOrJwtAuth,enforceGuestScope}.js`,
  `api/server/middleware/limiters/{guestLimiters,guestMessageLimiter}.js`,
  `api/server/utils/guestClientIp.js`,
  router wiring in `api/server/routes/agents/index.js`.
- Env: `ALLOW_GUEST_CHAT`, `GUEST_MESSAGE_MAX`, `GUEST_ENDPOINT`, `GUEST_MODEL`,
  `GUEST_TOKEN_EXPIRY`, `GUEST_TOKEN_MAX`, `GUEST_TOKEN_WINDOW`. Requires
  `HANZO_API_KEY` (the free publishable gateway key) and `USE_REDIS` for the
  shared per-IP quota across replicas.

## Cloud Agents (canonical /v1/agents)

Chat can RUN a user's canonical Hanzo Cloud agents (cloud `/v1/agents`, the ONE
production agent registry) from the thread — alongside the LibreChat-legacy local
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
  The ~1h id_token is used while valid; durable refresh (hanzo.id/Casdoor OIDC
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
- Convergence path (later): chat's LibreChat-legacy `/v1/chat/agents` CRUD should
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
- **Code interpreter** → `LIBRECHAT_CODE_BASEURL` = cloud `/v1/exec`.
- **Web search** → `webSearch` block (searxng+firecrawl contracts) = cloud
  `/v1/websearch`.
- **Cloud agents** → `POST /v1/chat/agents/cloud/:name/run` server-proxies to cloud
  `/v1/agents` with the user's hanzo.id bearer (see "Cloud Agents" section).
- **Model list**: curated **zen-only** (`fetch:false`) in the loaded config —
  NO raw upstream names (brand policy). Authoritative prod list lives in the
  `chat-config` ConfigMap (`universe infra/k8s/chat/configmap.yaml`); repo
  `librechat.yaml` mirrors it (one way).

### DEAD residue — do NOT treat as a live backend

- `config.yaml` (LiteLLM `model_list`/`litellm_params`), `docker/Dockerfile.{simple,dev,custom_ui}`
  (`CMD litellm`), `deploy/migrations/*` (`LiteLLM_*` Prisma tables),
  `CONTRIBUTING.md` (upstream LiteLLM's), `scripts/cleanup-{litellm,hanzo-chat}.sh`:
  all **unreferenced** by any compose/k8s/helm/Dockerfile.multi. Prod runs
  `node server/index.js` and hits `api.hanzo.ai/v1` directly — NO local litellm
  sidecar. This is upstream merge residue; safe to delete in a dedicated sweep.

### The ONE real parallel store (FLAG — needs a Go-backend home)

LibreChat's Express backend owns, in **MongoDB** (`HanzoChat` DB), all of:
`convos`, `messages`, `presets`, `prompts`/`promptGroups`, `users`, `balances`/
`transactions`, `files`, `sessions` (refresh-token hashes), plus agents/assistants/
memory/RBAC. Schemas: `packages/data-schemas/src/schema/*`. This is the shadow
store that is NOT on the Go backend.

- The Go backend (`hanzoai/ai`, mounted at bare `/v1/*` in cloud) DOES have a
  persistence home, but under **casibase names** (`/v1/get-chats`, `/v1/get-chat`,
  `/v1/add-chat`, `/v1/get-messages`, `/v1/add-message`, `/v1/get-usages`) — a
  different schema/shape than LibreChat's Mongo.
- The canonical OpenAPI repo has `chat/openapi.yaml` describing the INTENDED
  LibreChat-shaped REST surface (`/v1/chat/convos`, `/v1/chat/messages`,
  `/v1/chat/presets`, `/v1/chat/balance`, `/v1/chat/auth/*`) — but the Go binary
  **does not implement it yet**, and `ai/openapi.yaml` under-documents the real
  casibase routes.
- To truly kill the parallel store WITHOUT breaking live chat: the Go backend
  (or Base) must implement `chat/openapi.yaml` (conversations/messages/presets),
  then repoint chat's data layer at it behind a flag and dual-write during
  cutover. Until then Mongo stays (ripping it = data loss + dead chat).
  **Coordinate with the openapi agent** (canonical spec + SDK regen).

### IAM-native auth (HIP-0111) — federated to hanzo.id, LIVE

- **Prod (backend-proxied)**: LibreChat passport `openid-client` strategy,
  OIDC **discovery** from `${OPENID_ISSUER}` = `https://hanzo.id`
  (`/.well-known/openid-configuration`; discovery fetched via in-cluster
  `iam.hanzo.svc` to dodge the CF hairpin), client_id **`hanzo-chat`**, callback
  `/oauth/openid/callback`. Local email/password is OFF in prod
  (`ALLOW_EMAIL_LOGIN=false`, `ALLOW_REGISTRATION=false`); social OIDC only.
  Files: `api/strategies/openidStrategy.js`, `api/server/socialLogins.js`,
  `api/server/routes/oauth.js`. This IS IAM-native (federated), just not the
  console `@hanzo/iam-js-sdk` shape.
- **Static/IAM SPA mode** (`Dockerfile.static`, not the live prod deploy): browser
  `@hanzo/iam` `BrowserIamSdk` PKCE straight to hanzo.id
  (`client/src/utils/iam.ts`, `OAuthCallback.tsx`). ⚠️ INCONSISTENCY: uses
  client_id **`app-chat`** while prod uses `hanzo-chat` — align to `hanzo-chat`.
  `@hanzo/iam` is pinned `^0.4.0` (HIP-0111 wants ≥0.11.0); this path is dormant.

### One brand system, but pick the RIGHT one for a Tailwind app

`@hanzo/ui` and `@hanzo/gui` are **two different, non-overlapping** design systems:
- **`@hanzo/ui`** = shadcn/ui + Tailwind + Radix (multi-framework). chat is
  Vite + React 18 + Tailwind, so THIS is the correct shared lib. Already used:
  `client/src/components/Nav/HanzoHeader.tsx` mounts `@hanzo/ui/navigation`
  `HanzoHeader` for cross-app chrome. Monochrome rebrand already done (grey ramp,
  H mark, favicon = hanzo.app set).
- **`@hanzo/gui`** = a **Tamagui** fork (Next.js 15 / React 19, RN-web) — console's
  stack. Forcing it into the Vite/React18 LibreChat client = a ground-up rewrite
  of a live product; NOT done. Unify by widening `@hanzo/ui` adoption + matching
  console's monochrome tokens, NOT by swapping component frameworks.

### Config filename caveat

`loadCustomConfig.js` defaults to **`chat.yaml`** (`CONFIG_PATH || <root>/chat.yaml`).
Prod sets `CONFIG_PATH=/app/chat.yaml` (ConfigMap mount). Repo ships
`librechat.yaml` (reference); a deploy that doesn't set `CONFIG_PATH` to it (or
provide `chat.yaml`) falls back to the built-in `openAI` endpoint. `OPENAI_BASE_URL`
in `compose.prod.yml` is inert here (built-in openAI reads `OPENAI_REVERSE_PROXY`).

## Internal Package Names

These are kept as-is from upstream (npm deps, not worth renaming):
- `@hanzochat/api`, `@librechat/client`, `@librechat/data-schemas`, `librechat-data-provider`, `@librechat/agents`
- Functions: `extractLibreChatParams`, `importLibreChatConvo`
- Type names: `LibreChatKeys`, `LibreChatParams`
- Config filename: `librechat.yaml` (upstream convention)
- Env var: `LIBRECHAT_LOG_DIR`

## Branding Cleanup Log

All user-visible `LibreChat` / `librechat.ai` references replaced with Hanzo equivalents:
- All `librechat.ai` URLs -> `hanzo.ai/docs/chat/...`
- `code.librechat.ai` -> `hanzo.ai/docs/chat/code-interpreter/...`
- package.json repo URLs -> `github.com/hanzoai/chat`
- package.json homepages -> `hanzo.ai/chat`
- package.json descriptions -> "Hanzo Chat"
- Help/FAQ default URL -> `hanzo.ai/chat`
- Docker Compose MongoDB DB name -> `HanzoChat`
- GitHub workflow repo refs -> `hanzoai/chat`
- MCP User-Agent -> `HanzoChat-MCP-Client`
- JSDoc comments: LibreChat -> Hanzo Chat
- Log messages: LibreChat -> Hanzo Chat
- Helm chart URLs -> hanzo.ai/docs/chat/...
