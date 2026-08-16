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
# Install -- pnpm, and only pnpm. `packageManager` pins pnpm@10.27.0, the
# lockfile is pnpm-lock.yaml, there is no package-lock.json, and .npmrc sets
# node-linker=hoisted. `npm install` resolves a tree nobody ships: it leaves
# pnpm-lock.yaml stale, so the image still installs whatever the lockfile says.
pnpm install

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

- **1 replica, `strategy: Recreate`**, port 3080 — and both halves are forced,
  not chosen. The store below is an in-process SQLite writer on a
  ReadWriteOnce claim, so a second pod is either an unmountable volume or two
  processes racing read-modify-write updates and dropping `Balance` /
  `Transaction` writes with no error. Every release is therefore a ~3min
  outage; the fix is a networked store handle behind `CollectionSpec`, never a
  replica bump. Full reasoning: `charts/app/values/hanzo/chat.yaml` in universe.
- Ingress: `hanzo.chat` (primary) + `chat.hanzo.ai` (301 → hanzo.chat)
- Probes: `/v1/chat/health`
- Secret: `chat-secrets` (JWT_SECRET, CREDS_KEY/IV)
- Store: embedded SQLite on the `chat-app-db` PVC — no database service
- CI: two workflows on the `hanzo-build-linux-amd64` git-runners, and they do
  different jobs. `.hanzo/workflows/deploy.yml` BUILDS `ghcr.io/hanzoai/chat`
  and is the only thing that does; choosing which tag runs is a reviewed change
  in `hanzoai/universe`. `.hanzo/workflows/cicd.yml` imports `hanzoai/ci` and
  runs the `test:` gates in the root `hanzo.yml` — the repo had no gate of any
  kind before it, on main or on a pull request.
  Read `hanzo.yml` before adding a gate: it records why no whole jest suite is
  in it (all five are red on main) and what each gate costs. The one jest lane
  is `credentials` — ten named files, 75 tests, ~5s — guarding what a user
  document may carry out of the process: the `publicUser` allow-list every
  user-returning route projects through, the schema's own default projection
  under it, the routes that send it, the strategy that picks who verifies a
  request, the org header Commerce authorizes on, and the refusal to enable MCP
  while nothing filters its tools. Every file in it was mutation-tested; a new
  spec joins the lane by being listed there.
  deploy.yml carries `paths-ignore: ['**.md']`, and the reason is the deploy
  shape rather than build minutes: `replicas: 1` + `Recreate` means every roll
  is ~3min of hanzo.chat answering 503 (measured twice: 195s, 195s), so a
  sentence edited in this file used to cost an outage. `.hanzo/workflows/**` is
  NOT ignored — a change to the lane must prove it still builds — and cicd.yml
  still fires on everything, because its gates cost no downtime.
  `hanzo.yml` declares NO `images:`, deliberately — that is what keeps deploy.yml
  the single builder, and two lanes pushing one tag is how hanzoai/app served
  bytes its version did not name.
  `.github/workflows/` is down to `workflow-sanity.yml` and cannot run: no
  GitHub-visible runner carries our labels, and on the forge `.hanzo/workflows`
  wins so `.github/workflows` never executes at all. Docker Hub is not a
  destination. Anything calling `hanzoai/.github` is dead on arrival from here —
  that repo is private and this one is public, so GitHub refuses to resolve the
  reusable and the run fails in 0s having created zero jobs.
- Image: `ghcr.io/hanzoai/chat:<semver>` (linux/amd64). The semver is derived by
  `hanzoai/ci/.github/actions/imgver@v1` from this repo's `package.json` against
  the registry floor — never typed, never a sha. A `sha-<7>` tag is pushed
  alongside for forensics and is NOT what universe pins.

## Docker Build Notes

- Installs with `pnpm install --frozen-lockfile` (corepack). The lockfile is the
  contract: a dependency change that does not update `pnpm-lock.yaml` does not
  reach the image.
- `--max-old-space-size=4096` for client build
- jemalloc preloaded for memory efficiency
- `uv` bundled for MCP server support
- `dompurify` must be in `client/package.json` (externalized by bundler)

## Signing in, and the first sign-in in particular

Two facts decide whether someone who has just created an account can use it.

**The record is provisioned on the request path, once.** `api/strategies/iam.js`
verifies the bearer and hands the claims to `reconcileUser`
(`api/server/services/iamUser.js`), which finds or creates the local record for
that IAM subject. The app opens with roughly a dozen authenticated requests at
once, so on a first sign-in a dozen callers all reach a record that does not
exist yet. `reconcileUser` shares ONE reconcile per subject while it runs, and a
caller that loses the insert to the unique index reads what won. Without that,
one insert succeeds and the rest are refused, and whether the app renders signed
in comes down to whether `/v1/chat/user` happened to be the winner —
`AuthContext` navigates to `/login` on that query erroring. `iamUser.spec.js`
pins it and is listed in the `credentials` gate in `hanzo.yml`.

**Sign up is a way in, so it carries an authorize request.** `signupUrl()`
(`client/src/utils/iam.ts`, read through `useSignupUrl`) puts this app's own
authorize query — client, `redirect_uri`, `state`, PKCE challenge — on the
issuer's `/signup/<clientId>` address. IAM answers a completed registration the
way it answers a sign-in: `/auth/callback` with a code. Addressing that screen
with a bare URL instead leaves the new account at the issuer, and chat spends its
one silent session probe (`hanzo.sso.probed`, sessionStorage, `utils/sso.ts`) on
arrival — so a visitor coming back under their own steam is served the guest
landing and offered Sign up again.

`components/Messages/Content/Error.tsx` still uses the bare `IAM_SIGNUP_URL`: its
sign-up link is rendered from a plain map entry rather than a component, so no
hook can reach it. That path costs one extra redirect through the issuer.

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
  The ~1h id_token is used while valid, and it is now RENEWED when it is not:
  `OPENID_SCOPE` requests `offline_access`, the credential lands in
  `session.iamBearerRefresh` (its own field, so AuthController/LogoutController are
  untouched), and `services/iamBearerRefresh.js` spends it once from
  `resolveCredential` when the selector finds nothing forwardable. Before that,
  an hour-old session got "Your Hanzo session needs refreshing" until the user
  reloaded — a full re-auth that bought exactly one more hour.
  The login-breaking refresh-grant is still NOT enabled: `OPENID_REUSE_TOKENS`
  stays false, so `/v1/chat/auth/refresh` does not perform an OIDC refresh and
  login/refresh/logout remain on the local-JWT path. The RFC-8693 token-exchange
  alternative is therefore moot for the bearer; it stays available for any future
  need to downscope.
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

### What leaves this process, and what a session alone may authorize

Three rules that a well-meaning change will otherwise undo. Each was a live
defect; each is held by a spec in the `credentials` gate.

**A user document leaves ONLY through `services/publicUser`.** It is an
ALLOW-LIST, and that is the whole point: both places that used to hand a user to
the browser named what to WITHHOLD, and a deny-list is only ever correct for the
fields somebody thought of. `refreshToken` rode `GET /v1/chat/user`, every
`/auth/refresh`, the IAM login response, 2FA verify and the admin `/verify` into
the browser that way. Eight send sites project through it now. Adding a field to
the list is a decision; deleting the projection at one site reopens the class.
The schema is the second lock — `refreshToken`, `totpSecret` and `backupCodes`
carry `select: false`, so a route nobody has written yet cannot leak what the
query never loaded.

**An agent lends out its AUTHOR's attached files and nothing else.**
`hasAccessToFilesViaAgent` once granted the author of an agent every file id the
CALLER named — attached or not, owned or not — and returned before the
`isDelete` EDIT check, so `DELETE /v1/chat/files` with someone else's `file_id`
and your own `agent_id` deleted their file. Three conditions hold now, in order:
the file is attached to the agent; a non-author holds VIEW (and EDIT to delete);
and the file belongs to the agent's author. `tool_resources` is written by
whoever edits the agent, so an id there is a claim, not a fact.
`filterFilesByAgentAccess` returns the caller's OWN files for an ephemeral or
non-`agent_` id — upstream returns everything unfiltered there, and that is the
one deliberate divergence: `agentId` comes off the request, so upstream's shape
lets any caller opt out of filtering by naming an id of the wrong form.

**Deleting an account re-verifies the second factor.** A live session is not
enough to authorize something irreversible. `verifyOTPOrBackupCode`
(twoFactorService) answers with a value rather than writing a response, which is
what lets a caller that is not a login route use it; the confirm dialog collects
the code, so an account with 2FA can still delete itself. Measured before
landing: 28 users, ZERO with 2FA enabled, 27 of 28 on OIDC — the factor lives at
hanzo.id, so this changes nothing here today and everything for a deployment
with local auth.

### One row, one box — `client/src/components/chrome.ts`

The app's top row is ONE row to the eye and eight files to the code, and every
one of them had grown its own answer to the same question. Measured on
production at 1440×900, signed out:

| | |
|---|---|
| boxes | 44, 44, 44, **40**, 44, 44, 44 |
| glyphs | 24, 24, 24, 18, 18, 18 |
| grounds | four `bg-presentation` (an opaque patch of the canvas colour) beside three transparent |
| radii | 12px everywhere except the mark, at 999 |

Over the backdrop video that reads as four dark slabs floating next to four
bare glyphs, with no rule saying which control gets which. **`CONTROL` is the
single answer** — 44 square, one radius, a 20px glyph, no ground until you
point at it — and `chrome.spec.ts` (in the `chrome` CI lane) reads the source
of every file in that row to stop a second answer growing back. `ROW` is the
same for the sidebar column, which ran five shapes at once; it takes the
conversation list's own `h-12 md:h-9` because that list had the most rows and
already had it right.

Three things the code cannot say for itself:

- **The glyph size lives in the class, not at the call site.** `[&_svg]:size-5`
  is a descendant selector at (0,1,1) and beats `icon-lg`, `icon-md`, a bare
  24×24 `<svg>` and `size={20}` — which are four ways to say one thing and are
  exactly how 24 and 18 came to sit side by side.
- **`aria-expanded` is NOT the hook for the lit ground**, though every menu
  trigger sets it. So do the sidebar toggles — correctly; the sidebar is a
  thing they expand — so keying the shared class on it lights `Close sidebar`
  for as long as the sidebar is open: one permanent plate in a row of none.
  `CONTROL_OPEN` is applied from the boolean each menu already holds. A menu
  lights so the eye can trace a floating popup back to its trigger; a panel
  toggle has its panel attached to it and has nothing to trace.
- **`BrandCorner` cannot use `CONTROL` at all.** `HanzoAppLauncher` writes its
  trigger's box INLINE, so the corner reaches it through a descendant selector
  and the radius must be `!important` — a class alone loses to an inline
  declaration. `min-h`/`min-w` work without it only because the shell writes
  `height`, a different property.

**The corner mark is the H, in both states.** It was the Enso ring open and
`HanzoMark` collapsed, so the corner appeared to swap logos on collapse. One
corner, one glyph, at one size (20): what changes on collapse is what the mark
DOES, not what it is. Collapsed, it is the way back into the sidebar and says
so — the H at rest, the canonical `PanelLeft` on hover, both stacked in the
same 20px box so the swap moves no pixel, plus the tooltip for anyone who never
hovers. The Enso stays where it means something: beside an AI reply
(`MessageEndpointIcon`).

`Chat/Header.spec.tsx` — which holds WHICH controls belong to the header and
which to the sidebar — was dying at IMPORT the whole time, reporting `Tests: 0
total`. It sat that way long enough for the contract it describes to reverse
underneath it: the file asserted the left edge was empty while `Header.tsx` had
moved compose there. The cause was the usual one, a three-name stub of
`@hanzochat/data-provider` that held until `CanvasToggle` reached `~/store` for
a fourth. **A suite that cannot run is not a weaker gate than one that fails;
it is a green light.**

### One shell, one accent, one menu

Chat used to carry TWO cross-app headers: `@hanzogui/shell`'s on the landing and
`@hanzo/ui/navigation`'s in the app. The second was resolved with `require()`
inside a try/catch — `require` does not exist in a Vite ESM browser bundle, so
the catch swallowed the ReferenceError and the component returned `null` for
every signed-in and guest visitor. The shadcn-era `@hanzo/ui` was retired then:
`Nav/HanzoHeader.tsx` and `Nav/NetworkWallet.tsx` are deleted and the two dead
`node_modules/@hanzo/ui/dist/**` globs are out of `tailwind.config.cjs`.

**`@hanzo/ui` is back at 8.0.39, and it is a different library under the same
name.** 8.x is not shadcn and carries no Radix: its primitives are backed by
`@hanzo/gui` (Tamagui) and it ships its own CSS. Do not read the paragraph above
as "@hanzo/ui is banned" — it records why the *5.x shadcn* one went.

- **Shell chrome** = `@hanzogui/shell` only (HanzoHeader / HanzoAppHeader /
  HanzoFooter / HanzoPreFooterCTA / MeetHanzoMenu / HanzoAppLauncher). It is
  self-contained — inline styles + `theme.ts` tokens — so it drops into Vite
  with no provider. **Cross-app nav ships, and chat owns none of it.**
  `Nav/BrandCorner.tsx` is the whole of chat's side: the mark plus
  `HanzoAppLauncher`, mounted in the sidebar's first row and in the phone bar
  (`Nav/MobileNav.tsx`, which owns the corner below md). It is no longer mounted
  in `Chat/Header.tsx` — the header's collapsed-only cluster is gone, because
  the sidebar no longer leaves the screen when it collapses (see "The collapsed
  sidebar is a rail"), so the corner is never empty and never carries two marks
  on one width.

  The mark means "switcher" everywhere the sidebar has room for it, which is
  every width below md and the open sidebar's first row. IN THE 56px RAIL IT
  MEANS "EXPAND": a rail whose only affordance opens a nine-tile app grid gives
  the visitor no way back to their own sidebar. That is hanzo.app's arrangement
  too. On the phone the drawer opens from the hamburger beside the mark, never
  from the mark. Do not hand-roll a drawer beside it; the tile list is
  `HANZO_APPS`, owned upstream.
- **The launcher panel is portalled, from `@hanzogui/shell@8.1.1` on.** Before
  that it was `position: absolute`, and chat mounts it inside the sidebar's
  `overflow-hidden` scroll column (`Nav.tsx`, `flex flex-1 flex-col
  overflow-hidden`) — so the third column of tiles was clipped mid-tile and
  Search / Platform / Admin rendered as one letter each on the live site.
  `position: fixed` would NOT have fixed it either: `.nav` carried a
  `transform` at the time, which makes an element the containing block for its
  fixed descendants too. (That transform is gone now — collapsing animates
  WIDTH, not translate — but the panel portals regardless, which is what makes
  it robust to exactly this kind of change. Re-measured after the rail landed:
  nine tiles, none clipped.) The panel leaves the stacking context entirely. **Do not "fix" clipping
  here by loosening that column's overflow** — it is what makes the
  conversation list scroll, and the defect belonged to the shared component.
### The collapsed sidebar is a rail

Collapsing animates the sidebar's WIDTH between `NAV_WIDTH.SIDEBAR` and
`NAV_WIDTH.RAIL` (56). It does NOT translate the panel off screen, and it does
not unmount it. That is the model console's `DashboardShell` and hanzo.app
already share, and it is load-bearing rather than cosmetic:

- **Keep the column and the stacking is free.** While collapse slid the sidebar
  away there was nothing left in the corner, so the mark and compose had to be
  re-homed into `Chat/Header.tsx`'s horizontal strip — which is the ONLY reason
  "new chat" ever sat to the RIGHT of the mark. Do not "fix" corner layout by
  moving controls into the header again; that is the symptom, not the cure.
- **Collapse is EXPLICIT and remembered** (`localStorage.navVisible`, one key).
  No hover-to-expand, no pin — hanzo.app marks both props `@deprecated`. A rail
  that widens because a pointer crossed it moves the page out from under
  whatever the pointer was reaching for. A 160ms hover-intent open lived in the
  header and is gone.
- **There is no rail below `md`.** `collapsed = !isSmallScreen && !navVisible`,
  so the phone keeps the drawer it always had, byte-identical.
- **The rail carries the mark, compose and the icon rows only.** The
  conversation list and the account foot do not render at 56px — the list is
  additionally gated on having history, so both conditions apply.

Verified in Chromium, not by reading: rail `w:56` vs open `w:260`; mark at
`y:8` and compose at `y:54` on the SAME `x` (a column, not a row); the state
survives a reload in both directions; the composer reflows by exactly
`(260-56)/2` rather than anything being hidden.

- **Two controls say "bookmark", and they are not the same control.**
  `Chat/Menus/BookmarkMenu` tags the OPEN conversation and lives with the other
  view actions at the right end of `Chat/Header.tsx` (`data-testid=
  "header-actions"`, with presets, share and temporary chat — one copy each, at
  every width; they used to be written twice under opposite `isSmallScreen`
  conditions and sat at opposite ends of the same header). `Nav/Bookmarks/
  BookmarkNav` FILTERS the conversation list, its selection is `Nav.tsx`'s own
  `tags` state, and it sits on the search row above that list. Neither belongs
  in the icon strip, and merging them into one corner would put two bookmark
  buttons side by side. The strip is the mark, the launcher, compose and the
  collapse toggle — nothing else. `Chat/Header.spec.tsx` holds that line.
- **Tailwind no longer scans the shell — that was a 7.x fact.** Under 7.x the
  shell painted itself with utility class names (`bg-[#0e0e13]`, `z-[101]`,
  `border-white/[0.06]`) and renders transparent in a host that never scans it,
  so `tailwind.config.cjs` carried a
  `../node_modules/@hanzogui/shell/dist/**` glob. Under **8.0.3 that is no
  longer true for anything chat imports**: `HanzoHeader`, `HanzoFooter`,
  `HanzoPreFooterCTA`, `HanzoAppLauncher` and `HanzoMark` contain ZERO className
  literals — they are 100% inline-styled — and none of them pull in a
  Tailwind-bearing module transitively. The only components still carrying
  utility classes are the **Tenant\*** authenticated chrome (`TenantHeader`,
  `TenantMark`, `TenantCommandPalette`, `UserOrgDropdown`, `AppSwitcher`), which
  chat does not import. The glob was emitting 33 rules for classes chat never
  renders — measured, and confirmed that chat's own source references none of
  them — so it is deleted. **Restore it the moment chat adopts `TenantHeader`.**
- **Accent.** `@hanzo/brand` ships violet `--hanzo-accent: #8b5cf6` as the shared
  Hanzo accent and the shell reads it via `var(--hanzo-accent, #ffffff)`, which
  put a violet "New chat" CTA beside a white "Get Started Free" CTA in one frame.
  `style.css` overrides `--hanzo-accent` (and hover/muted/soft/rgb) to white —
  the mechanism `@hanzo/brand` documents for a host that does not take violet.
  Chat is monochrome; nothing in chat's own source reads the token.
- **`@hanzo/gui` IS installed and DOES build under Vite.** This entry used to
  say Tamagui/RN-web against a Vite client "is a rewrite, not an install." That
  was wrong, and it was wrong for a knowable reason: nobody had run the build.
  `@hanzo/gui@8.0.1` + `@hanzo/ui@8.0.39` now bundle in this app (2518 modules,
  clean) and `GuiProvider` is mounted in `App.jsx`. Three resolver facts make it
  work, and each is a real defect rather than a preference:
  1. alias `react-native` → `react-native-web`. Prefix-safe: @rollup/plugin-alias
     matches the exact specifier or `react-native/…` only, so `react-native-svg`
     and `react-native-web` still resolve to themselves.
  2. `.web.*` FIRST in `resolve.extensions`. This is react-native-web's
     substitution convention and Vite does not implement it. Without it
     `react-native-svg` resolves to its Fabric build, which imports
     `react-native-web/Libraries/Utilities/codegenNativeComponent` — a path that
     does not exist.
  3. `react-native-svg` must be installed at all: `@hanzogui/lucide-icons-2@8.0.0`
     imports it from the file its own `browser` export condition points at while
     declaring it in neither `dependencies` nor `peerDependencies`. That is a
     packaging bug in the icon package.
  `@hanzo/ui@8.0.39` is the correct post-Tailwind substrate: its gui backend
  contains **zero** className literals and it ships its own `theme.css` +
  `styles/hanzo-motion.css`. It is NOT the retired shadcn/Radix library of the
  same name — 8.x has no Radix dependency at all.
  `DropdownPopup` (Ariakit; `.popover-ui` is REAL CSS, not a scanned class
  string) remains the canonical anchored menu, 28 call sites.

### The dev server needs four CJS modules pre-bundled — and two resolvers to agree

Adopting gui broke `npm run frontend:dev` and nothing said so. The dev server
started clean, served 200s, and rendered a **blank page**: one `pageerror`
("does not provide an export named 'default'") killed the module graph before
React mounted. `vite build` was unaffected the whole time — Rollup's commonjs
plugin does the interop that Vite's dev ESM pipeline cannot — so the breakage was
invisible to the gate everyone was checking. If you change gui/react-native
resolution, LOAD THE PAGE; the build passing means nothing here.

The gui graph reaches four CommonJS modules that are imported **by name**, which
is the one thing dev-mode ESM cannot synthesise from CJS:

- `react-native-web` and `@react-native/normalize-colors` (imported as `default`)
- `react-native-svg` — `lib/extract/transform.js` is PEG.js output, imported as `{ parse }`
- `@react-native/normalize-color` — **singular**, a different package from the
  plural one above; both are installed. Reached via `@hanzogui/normalize-css-color`,
  and as plain CJS with no exports map it throws `module is not defined`.

All four are in `optimizeDeps.include`. That alone is not enough: pre-bundling
`react-native-svg` fails with `Cannot read file: …/codegenNativeComponent` because
**esbuild's dep optimizer does not read `resolve.extensions`** — it resolves with
its own defaults, ignores the `.web.js` siblings, and walks into the Fabric
(native) build. Vite/Rollup and esbuild must be told the same thing, so the
web-first extension list is defined ONCE as `webFirstExtensions` and read twice:
`resolve.extensions` and `optimizeDeps.esbuildOptions.resolveExtensions`. Change
one without the other and dev breaks again.

### Rules for writing against the 8.x primitives

Three things bite every time and none of them announces itself:

- **A primitive rendered outside `GuiProvider` throws `Missing theme.`** and the
  stack points at the test's `render(...)`, not at the primitive. `App.jsx`
  mounts the provider around the whole tree, so a component tested without it is
  tested in a configuration that does not ship. `client/test/gui-provider.tsx`
  exports the ONE `GuiTestProvider` — `layout-test-utils`' `renderWithProviders`
  composes it, and a spec that builds its own wrapper or calls bare `render`
  reaches for it directly. Do not inline another `<GuiProvider config={…}>`.
- **The primitives are Tamagui-backed, not DOM elements, so their prop types are
  not React's.** `aria-hidden` is plain `boolean` — NOT `Booleanish` — so
  `aria-hidden="true"` is a type error and `aria-hidden` is correct. Likewise
  they do not take an HTML `title`: a card heading that wants a native tooltip
  is a `<span>`, not a `Label` (a `Label` with nothing to bind to was always
  wrong; gui just made it fail loudly).
- **`Checkbox` demands a name**, via `CheckboxProps`' union: exactly one of
  `aria-label` / `aria-labelledby`, or `aria-hidden` for the decorative case
  (`Prompts/buttons/AutoSendPrompt` — the Button owns the name and
  `aria-pressed`, the box is a `tabIndex={-1}` glyph). The escape hatch requires
  declaring the box invisible, so it cannot be used to skip labelling a real one.
- **A bare text child is DROPPED — silently, at runtime.** gui components are
  react-native primitives, so text must sit inside an element. Measured in
  Chromium against a real dev server: `<TabsContent>content a</TabsContent>`
  computes to `height: 0`, `visible: false`, and logs `Unexpected text node …
  cannot be a child of a <TabsContent>` to the console — nowhere else. Wrap the
  text (`<span>`) and it paints. This is the sharpest edge of "gui ignores what
  it does not recognise": the build is green, the element is in the DOM, the
  content is invisible. Every `<TabsTrigger>Label</TabsTrigger>` in chat's markup
  is this shape, so a naive Tabs conversion produces empty tabs.

### `@hanzo/ui/product` does not import here, and the version is capped at 8.0.51

Chat consumes exactly three things from `@hanzo/ui`: `gui-config`, `theme.css`
and `glass.css`. **No component.** That is not an oversight — the components
worth taking (`SecretInput`, `CopyButton`, `EmptyState`, `UserMenu`,
`Pagination`, `StatusTag`) all live behind the `./product` barrel, and the
barrel is unreachable in BOTH of chat's toolchains. Measured at 8.0.59:

- **jest** — `product/index.cjs` → `ComboBox` → `instrument` →
  `@hanzogui/telemetry`, which is ESM-only (no `require` condition) and uses
  `import.meta` in `dist/env.js`. `babel.config.cjs` DOES carry
  `babel-plugin-transform-import-meta`, but it is a root config rooted at
  `client/`, and telemetry resolves to `chat/node_modules/` — outside that root,
  so the plugin never runs on it. `SyntaxError: Cannot use 'import.meta'
  outside a module`. Predates 8.1.0; telemetry 8.0.0 has the same line.
- **vite** — `product/ThemeToggleNext.js` imports `@hanzogui/next-theme`, whose
  `NextThemeProvider` imports `next/script`. Chat is Vite; there is no Next.
  Uninstalled it resolves to a `__vite-optional-peer-dep:` stub and rollup fails
  on `"useThemeSetting" is not exported`; installed it drags `next/script` in.

`./product/*` is NOT a wildcard in the exports map (only `./product`,
`./product/social`, `./product/social/api`), so deep-importing one component
past the barrel is blocked too. `./primitives/*` IS a wildcard and works — that
is why `Progress.tsx` and `Separator.tsx` are one-line re-exports and nothing
else is.

**The fix belongs upstream, not here.** Add `./product/*` to the exports map, or
move `ThemeToggleNext` off the barrel. Working around it in chat means aliasing
`next/script` to a stub and re-rooting babel — two gates to import a button.

**There used to be a version ceiling at 8.0.51. There is not one now.** The claim
was that 8.0.52 re-bases three theme rungs onto CSS custom properties with
slash-alpha fallbacks — `$borderColor`/`$color12`/`$outlineColor` become
`var(--border, rgb(255 255 255 / .10))` and friends — which jsdom's CSS parser
cannot read, rejecting the whole gui theme block so every primitive throws
`Missing theme.` and `src/__tests__/guiPrimitives.spec.tsx` goes red.

Re-measured on the installed **8.0.75**: that suite is **4 passed / 4 total**.
jsdom still logs `Could not parse CSS stylesheet` — the parser really cannot read
those declarations — but it drops the rules it cannot parse rather than the
stylesheet, so the theme resolves and the primitives render. Whatever made this
fatal at 8.0.52 does not at 8.0.75. Note the trap that kept the ceiling on the
books: a mis-invoked jest reports `1 failed, 0 total`, which reads like the
documented failure and is actually a harness that never ran. Check for `Tests: 0
total` before believing a gate is red.

### Verifying a gui rewrite — the build cannot tell you

A green `vite build` proves gui *compiled*, never that it *painted*: unknown
props are ignored and bare text is dropped, both without an error. The only
honest check is computed style in a real browser. The loop that works here:
`npx vite --port <p>` in `client/`, drive it with Playwright, and read
`getComputedStyle` + `boundingBox` on the element you rewrote — `height: 0` or
`visible: false` on something that should have size is the failure signature.

Measured this way, against `@hanzo/ui@8.0.39`:

| | |
|---|---|
| `PopoverContent` | **paints** — self-portals, `bg rgb(20,20,20)`, 1px border, 8px radius, 16px padding, positions against the trigger |
| `Tabs` switching | **works** — inactive panel unmounts, same semantics as Radix's default |
| `TabsContent` + bare text | **invisible** — `height: 0` (see above) |
| generated ids | `_r_f_-trigger-b`, **NOT** `radix-*` |

That last row is a live blocker, not trivia: `client/src/mobile.css:389-405`
selects the artifact preview panel with `[aria-labelledby^="radix-"][id^="radix-"]`.
Those four scrollbar rules match nothing the moment Tabs stops being Radix, and
nothing fails — the scrollbars just quietly go back to default. Grep for
`radix-` in CSS before converting Tabs.

### TypeScript 7

`client` typechecks on **`typescript@7.0.2`** — the native Go compiler, shipped
under its own name. `@typescript/native-preview` (and its `tsgo` binary) was the
preview channel for the same compiler and is REMOVED; the script is `tsc
--noEmit` again. The swap is diagnostically a no-op, measured side by side on one
tree rather than assumed — `tsgo` 7.0.0-dev.20260707.2 and `tsc` 7.0.2 both
report **820**, in ~4.6s.

The fleet-wide TS7 blocker does not apply here: `rollup-plugin-dts` crashes under
TS7, but **there is no tsup in this repo** and `client/` is a Vite application
that emits no declarations. The workspace LIBRARY packages keep `typescript ^5`
because they DO emit `.d.ts` through rollup.

### Baselines — read before you panic

Both suites have been failing for a long time for reasons that predate any of
this work, so an absolute count tells you nothing. Compare against the baseline:

| | `origin/main` @ `498cb269` | after the 8.x convergence |
|---|---|---|
| Jest suites | 100 failed / 101 passed | **77 failed / 125 passed** |
| Jest tests | 467 failed / 1661 passed (2128) | **515 failed / 1848 passed (2363)** |
| `tsc --noEmit` (5.9.3) | 819 errors | **817 errors** |

The convergence FIXED 23 suites and regressed none. Failed *tests* rose only
because 235 more tests now execute — suites that used to die at import now run
far enough to report their individual pre-existing failures. Those failures are
one uniform shape: tests importing symbols the source never exported
(`latestMessageFamily`, `resolveEndpointType`, `useFileHandling`,
`updateFieldsInPlace`, …). The tests are ahead of the implementation.

The other four suites had never been counted. Measured on `cb653548`, node 22,
pnpm 10.27.0, one full run each — this is what `hanzo.yml` means when it says no
jest suite is gated:

| | failed / total |
|---|---|
| `api` | 403 / 2737 |
| `packages/api` | 711 / 4644 |
| `packages/data-schemas` | 246 / 1489 |
| `packages/data-provider` | 227 / 985 |

`pnpm lint` is a fifth casualty and not a code-quality one: ESLint 9 loads
`@typescript-eslint/typescript-estree`, which dies against the TS7 native
compiler with `Cannot read properties of undefined (reading 'Cjs')` before it
reads a single file.

**Count TESTS, not suites, and treat `Tests: 0 total` as its own category.** A
large share of the `api` column is not failing assertions at all — it is suites
that die during import and never run one. The cause is almost always the spec's
own mocks: 80 of the 83 files that `jest.mock` a `@hanzochat/*` package replace
it with two or three names, which holds only until something deeper in the
require graph wants a fourth. One file walked through five in a row —
`createModels`, `violationCache`, `FileContext.execute_code`, `isEnabled`,
`requireAdmin` — each fix revealing the next. Spreading
`...jest.requireActual('<pkg>')` under the overrides fixes it at the root, and
`PermissionService.spec.js` was already doing that.

This is worth doing rather than tidying: five revived suites reported an
agent-file access check that handed the author of any agent every file id they
named (reachable on `DELETE /v1/chat/files`, so it deleted them), six handlers
returning `details: error.message` to the browser, a 500 on a non-string query
parameter, and a `removeAgentFromUserFavorites` with no caller. All of it had
been sitting behind a green-looking filename. Two cautions: `requireActual` can
turn a red suite into a silent module-load HANG, which is worse — mock the one
collaborator instead; and check the mock names the module the SUBJECT imports
(one spec drove `~/models` while the subject read `~/models/Agent`, so its
assertions were vacuous even once it loaded).

Not every one of these is "tests ahead of implementation" — one is a live
product bug wearing that costume. Merge `49dc4f7bf6` (a LibreChat sync) dropped
`PERMISSION_TYPE_INTERFACE_FIELDS`, `INTERFACE_PERMISSION_FIELDS` and
`PERMISSION_SUB_KEYS` out of `packages/data-provider/src/permissions.ts` while
`packages/api/src/admin/config.ts` and `packages/data-schemas/src/app/resolution.ts`
kept importing them, so the admin config surface calls `.has()` on `undefined`
in production — `upsertConfigOverrides` and `deleteConfigField` both throw.
Restoring those 49 lines from `e77b03ab6d` takes `resolution.spec.ts` to 26/26
and `admin/config.handler.spec.ts` to 54/54. Measured, not estimated; unfixed,
because a product repair is not a CI commit.

### Getting off Tailwind — the measured size of the job

Chat is the fleet's last Tailwind **v3** holdout (`tailwindcss ^3.4.1`). The
substrate to land on already exists and is proven here: `@hanzo/ui@8.0.39`'s gui
backend has ZERO className literals and ships `theme.css` + `styles/hanzo-motion.css`,
so the target is real. What is NOT small is chat's own markup. Measured on this
tree, not estimated:

| | |
|---|---|
| Tailwind rules actually generated | **2,414** (157 KB minified) |
| Source files carrying Tailwind utilities | **838** |
| Individual class-name instances | **25,340** |
| Median utilities per file | 19 (densest: `Web/Sources.tsx`, 400) |

Reproduce the count with the Tailwind CLI against `client/tailwind.config.cjs`
plus a token scan of `client/src` + `packages/client/src`.

**Re-measured after the 8.x convergence merge, and the answer did not move.**
Converting eight primitives (Checkbox, Switch, Separator, Progress, Label,
Accordion, Combobox, Select) onto `@hanzo/ui` did not shrink this: the rule count
went 2,408 → 2,414 because main added markup faster than the primitives removed
it. Every Tailwind dependency is still load-bearing, measured rather than
assumed — `tailwindcss-radix` has 35 `radix-*` variant uses, `tailwindcss-animate`
89 `animate-in`/`fade-in`/`zoom-*` uses, `tailwind-merge` backs `cn()` itself, and
Radix is still imported directly across the tree.
So there is no subset of the footprint that can be deleted ahead of the markup.
Removing Tailwind stays a whole-markup migration; it cannot be part-landed.

**The Radix surface is 13 packages across 35 files — NOT the "25 packages / 38
files" this file used to claim.** The old number was a miscount: 25 of those
strings live in `client/src/utils/artifacts.ts`, which is the **Sandpack
dependency manifest** — the versions shipped INTO the artifact preview sandbox so
AI-generated React can `import` Radix. It is data, not an import, and deleting it
breaks artifact rendering rather than removing a dependency. Leave it alone and
do not count it.

Of the 35, two are already gone (`Prompts/{dialogs,Groups}/VariableDialog` imported
`DialogPrimitive.DialogProps` for a type and rendered no Radix at all; they now
extend `OGDialogProps`, exported from `OriginalDialog` — the props of the dialog
they actually render). The rest, by weight: **popover 10 files, dialog 5, tabs 5,
accordion 3, toast 2, slot 2, select 2**, then one each for dropdown-menu,
radio-group, alert-dialog, hover-card, slider, collapsible.

**That count is now 11 files, and the four upstream gaps below are down to one.**
Eighteen files moved onto `@hanzo/ui` in one pass: eight popovers (PresetsMenu,
PresetItems, TitleButton, ProgressText, MultiSelectPop, SelectDropDownPop,
AssistantAvatar, Images), two tab strips plus the two Artifacts files, the three
shared primitives in `packages/client` (Accordion, HoverCard, Slider), and the
side panel's three (Nav, MCPTool, ActionsAuth). Reproduce with the count command
at the top of this section. What remains, one import each, and every one of them
for a reason written down below or in the commit that refused it:

| file | why it stays |
|---|---|
| `Chat/Input/OptionsPopover.tsx` | `asChild` on `Popover.Content` — gui's Content never slots the caller's element, and the panel carries two widths against a hardcoded 288 |
| `Chat/Input/HeaderOptions.tsx` | renders OptionsPopover inside its `Anchor`; a gui root around a Radix Content shares no context. The pair converts together or not at all |
| `Chat/Input/Files/ImagePreview.tsx` | the overlay has no destination — `DialogContent` renders its own `<DialogOverlay/>` with no props, so the dim, the z-index and the click target are unreachable |
| `Chat/Messages/Content/DialogImage.tsx` | same shape at a different z-index |
| `packages/client/OriginalDialog.tsx` | `overlayClassName` and the depth z-ladder are live props with no element to land on once Content owns the overlay |
| `packages/client/OGDialogTemplate.spec.tsx` | its subject is refused, and jest transforms no `.mjs` |
| `packages/client/DropdownMenu.tsx` | `dropdown-menu.tsx` never got the `place()` translation popover and hover-card have, so `align`/`side`/`collisionPadding` are dropped. One file upstream |
| `packages/client/Breadcrumb.tsx` | `Slot`, which @hanzo/ui does not export |
| `packages/client/Button.tsx` | same missing `Slot`, and 302 files reference this Button |
| `packages/client/Toast.tsx` | the viewport's className has nowhere to go, and the correct conversion rewrites `store.ts` and `useToast.ts` |
| `client/src/App.jsx` | holds the Toast Provider+Viewport; removing it alone throws at the Root |

**Three of those thirteen packages are now gone, and they were never imported.**
`alert-dialog`, `select` and `collapsible` were declared in `client/package.json`
and peered from `packages/client` with ZERO importers in either workspace, and
`packages/client/src/components/Collapsible.tsx` — a bare re-export of three Radix
names, absent from the components barrel — went with them. Ten packages / 34 files
remain. `collapsible` still shows in a grep twice over, and both are correct: as a
transitive of `react-accordion` in the lockfile, and as a shadcn component in the
artifact sandbox payload.

**Three of those four gaps closed upstream; only Toast is left.** That paragraph
described 8.0.63 and is no longer the state of the package. Measured against the
installed **8.0.75**: `@hanzo/ui/primitives/*` now exports Accordion (+Item,
Trigger, Content), HoverCard (+Trigger, Content) and RadioGroup (+Item), and all
three are in use here. **Toast is still the one real gap** — `toast`/`Toaster` are
an imperative model, not Radix's Provider/Viewport/Root/Title/Description/Action/
Close, so it is a rewrite of two files this repo owns rather than an import swap.

**The floor is `^8.0.73` in BOTH `client` and `packages/client`, and the split is
why this looked blocked longer than it was.** They asked for `^8.0.69` and
`>=8.0.48`: two halves of one app naming two libraries, neither bounded above.
Keep them equal. A floor below 8.0.73 silently reintroduces the two defects below.

Two more facts that were true at 8.0.63 and are **fixed at 8.0.73**, read out of
the installed `dist` rather than a changelog:
- **`PopoverContent` no longer drops `align`.** It destructures `align` and
  `sideOffset` and publishes both up to the popper root through `place()` — gui
  keeps placement on the root, so Content is a publisher, not the owner. Content
  still mounts its OWN portal (there is no `Portal` to import) and still paints
  `bg $color2`, a 1px border, `p $4` and `width: 288` — but those land **before**
  `{...props}`, so a caller replaces any of them. It can only replace, never keep
  two values for one property, which is what refuses OptionsPopover.
- **`Slider` forwards the name to the thumb.** `role="slider"` lives on the Thumb,
  so a name spread onto the root labels a container no screen reader announces.
  The backend now splits caller props: `aria-label`, `aria-labelledby`,
  `aria-describedby` and `aria-valuetext` go to the Thumb, everything else stays
  on the root. `packages/client/src/components/Slider.tsx` exists to enforce that
  name at compile time and converts cleanly now.

**gui's style shorthands do not typecheck in this app — write the longhand.**
Measured on a bare `View`, so it is not a per-primitive quirk: `p`, `px`, `bg`,
`rounded`, `items`, `justify` and `self` are all excess properties, because the
shorthand map is registered through the gui config and this tree registers none,
leaving `WithShorthands` empty. Registering it does not help (tried; it adds an
error). Use `padding`, `paddingHorizontal`, `backgroundColor`, `borderRadius`,
`alignItems`, `justifyContent`, `alignSelf` — same values, same components, and
they compile. `gap`, `height`, `flexDirection`, `hoverStyle` and `focusStyle`
were never shorthands and are fine as they are.

Ordering constraints that are not obvious and will bite:
1. `packages/client/src/components/Button.tsx` (`Slot`) migrates **last** — every
   `<Trigger asChild><Button/></Trigger>` chain depends on it forwarding `data-state`.
2. Two Popovers are split ACROSS files and must convert as pairs:
   `Chat/Input/HeaderOptions` (Root+Anchor) ↔ `Chat/Input/OptionsPopover` (Portal+Content),
   and `SidePanel/Builder/AssistantAvatar` (Root+Trigger) ↔ `SidePanel/Builder/Images` (Portal+Content).
   **The second pair is done** — both files converted in the same commit, which is
   the only way that works. The first pair is the one still refusing, together.
3. The Toast is split across PACKAGES: Provider+Viewport in `client/src/App.jsx`,
   Root+Description in `packages/client/src/components/Toast.tsx`. Still true, and
   now the last real blocker: the conversion also deletes the `toastState` atom in
   `packages/client/src/store.ts` and rewrites `showToast` over `toast()` in
   `hooks/useToast.ts`. Confined to Toast.tsx it becomes an atom-to-observer bridge
   — auto-hide timer in one state machine, render lifetime in the other — behind
   257 call sites. Convert the four files at once or not at all.
4. `SidePanel/Builder/ActionsAuth`'s checked radio has **no CSS state hook** — the
   dot is `RadioGroup.Indicator`'s conditional mount. Render it unconditionally and
   every radio reads as checked. **Done**, on `@hanzo/ui/primitives/RadioGroupItem`.
5. `OriginalDialog`'s `onEscapeKeyDown` is a WCAG tooltip-dismissal handler that
   cancels Escape while focus is in a menu/listbox/combobox. Any replacement must
   expose a cancellable escape with the same timing.
6. Radix CSS custom properties are consumed by real rules:
   `--radix-accordion-content-height` drives the `animate-accordion-*` keyframes in
   `client/tailwind.config.cjs`, and `--radix-select-trigger-{height,width}` size the
   Select/Combobox popper. They die with Radix and need replacements written first.
7. The `radix-*` Tailwind variants are down to **18 live uses from 35**, and every
   survivor now sits on something that really writes `data-state`: Speech 6 and
   Settings 4 on the tab strips, SelectDropDownPop 3 / MultiSelectPop 3 /
   TitleButton 2 on the popovers. Twelve were on elements Radix never touched and
   are gone; see "A variant is not a class" below. **Write the removal reason
   without naming the class** in anything under `client/src` or
   `packages/client/src` — those two globs are all Tailwind scans, and its scanner
   is a regex over file text that does not know what a comment is, so explaining a
   variant in a source comment regenerates the rule you just deleted. This file is
   outside both globs, which is why it can name them.
   **The eighteen still fire even though none of those five files is Radix any
   more**: the plugin compiles the variant to a plain `data-state` attribute
   selector, gui writes `data-state` on tabs and popover content, and a class plus
   an attribute outranks the single class gui compiles a style prop into. The four
   `[aria-labelledby^="radix-"]` scrollbar rules in `mobile.css` could NOT survive
   that way — gui generates `_r_f_-trigger-b`-shaped ids, not `radix-*` — and went
   with the Tabs conversion.

The external blocker people assume exists does NOT: `@hanzogui/shell@8.0.3` is
inline-styled for everything chat imports (see "One shell" above). Nothing
outside chat's own markup forces Tailwind to stay.

So this is a bounded but genuinely large mechanical migration — 838 files — and
it CANNOT be faked by freezing Tailwind's generated output into a committed
stylesheet. That would smuggle 2,408 unowned rules into the repo and silently
break the next class anyone writes. Convert markup to `@hanzo/ui` components and
plain CSS, file by file, or leave it on Tailwind honestly.

Full footprint to delete when the markup is done: `client/tailwind.config.cjs`,
`client/postcss.config.cjs`, and the deps `tailwindcss`, `tailwindcss-animate`,
`tailwindcss-radix`, `tailwind-merge`, `autoprefixer`, `postcss-preset-env`
(client) + `tailwind-merge` (packages/client peer) + `prettier-plugin-tailwindcss`
(root). Note `tailwindcss-radix` supplies the `radix-state-*` / `radix-disabled`
variants and therefore dies WITH Radix, not before it.

### A variant is not a class — twelve utilities that could never match

Tailwind is LIVE here, so `radix-state-open:bg-surface-hover` really does compile:
the shipped stylesheet carries `.radix-state-open\:bg-surface-hover[data-state="open"]`,
read out of `document.styleSheets` in Chromium. What it selects on is the trap.
Radix writes `data-state` / `data-disabled`; nothing else does. The same class on
a non-Radix element is a rule with no matching attribute — it reads correct in
review and paints nothing, forever, with no error anywhere.

Two of the twelve were visible defects rather than dead weight:

- **The composer's "+" never lit while its menu was open.** It is an Ariakit
  `MenuButton`, whose complete attribute set (measured) is `aria-expanded,
  aria-haspopup, aria-label, class, id, type`, plus `aria-controls` on open. No
  `data-state`, ever. It reads its own `open` state now: `rgba(0,0,0,0)` closed,
  `rgb(33,33,33)` with the menu up.
- **The parameters gear could not have worked either, for a different reason.**
  `Chat/Input/HeaderOptions` builds an ANCHORED popover — `<Root open=…><Anchor>` —
  and Radix writes `data-state` from `Popover.Trigger`, not `Popover.Anchor`.
  There is no trigger in that tree. It reads `showPopover` now.

The remaining ten had no behaviour to restore: `MenuItem` and `PresetItems` are
plain `<div role="option">` / `role="menuitem"` rows wearing `radix-disabled:*`,
and no call site passes that attribute; `AddMultiConvo` asked for an open-state
ground on a button that opens nothing.

**`aria-expanded` is not the fallback, because it is broken too.** Measured in
Chromium on the landing: the Create trigger carries
`aria-controls="composer-create-menu"`, that menu is `display: flex` with
`data-enter="true"` — and the trigger still reports `aria-expanded="false"`. The
model picker does the same. Ariakit updates `aria-controls` on open and leaves
`aria-expanded` behind, in every `DropdownPopup` (28 call sites), which is a
WCAG 4.1.2 failure across the app's whole menu layer. NOT fixed here: the cause is
in the Ariakit 0.4 / React 19 composition and guessing at it would be worse than
recording it. Reproduce with `[aria-label="Create"]` on `/c/new`.

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

## hanzo.chat front door — the app IS the landing (CTO direction, 2026-07-28)

Target: ChatGPT's shape. A signed-out visitor lands in the **product** — composer
centred, thin sidebar, `Log in` / `Sign up free` top-right — and marketing lives at
sub-routes (`/pricing`, `/product`, `/models`) reachable from the sidebar, never as
the entry point. Reference for the composer/sources/modes treatment is the Hanzo
extension's search surface (`~/work/hanzo/extension`), not a new design.

**Three defects, measured 2026-07-28, in the order they must be fixed:**

1. **No silent SSO — this is the root one. FIXED 2026-08-06, see below.**
   `hanzo.chat` and `hanzo.app` are different registrable domains, so a session
   cookie can NEVER span them. The only mechanism that makes a signed-in hanzo.id
   user already-signed-in here is a `prompt=none` authorize on load. Chat had
   none, so a real user with credits rendered anonymous on first visit, every
   visit. `silentRefresh` only refreshes chat's OWN local JWT — it cannot mint one.
   This was the generalisable fix: every Hanzo surface needs it, not just chat.

2. **The landing swallows chat intent.** `routes/Root.tsx:41`
   `showChat = isAuthenticated || isGuest`; `:111` returns `<LandingPage/>` for EVERY
   route when both are false — including `/c/new?q=…&submit=true`, whose `q`/`submit`
   params (`AnswerEngine.tsx: CHAT_PARAMS`) are then dropped. A deep link must reach
   the chat regardless of auth state. Note the failure shape: a 429 on an AUXILIARY
   token mint silently downgrades the whole product to a brochure.

3. **The guest mint is rate-limited out.** `POST /v1/chat/auth/guest` → 429
   "Too many guest sessions, try again after 60 minutes". `ALLOW_GUEST_CHAT=true` IS
   live and `/v1/chat/config` advertises `allowGuestChat: true`, so guest-as-landing
   is enabled and simply never reached. The limiter keys on `CF-Connecting-IP` with an
   in-process MemoryStore at `replicas:1` — behind Cloudflare one IP is many people,
   and the only reset is a pod restart. Raise/re-key `GUEST_TOKEN_MAX` / `GUEST_TOKEN_WINDOW`.

**Then the design work**, which is small once the above lands:
`components/Landing/LandingPage.tsx` stops being the front door. Its hero mock
advertises the DEPRECATED `chat.hanzo.ai` (301s to hanzo.chat) and shows a CODING
session (`zen5-coder`, "Refactor the auth module") — that is hanzo.app's story on the
chat product. Marketing moves to sub-routes or hanzo.ai; the composer, source pills
(@web/@news/@academic/@github/@reddit/@x), mode tabs (Search/News/Research/Deep) and
model picker become the first paint. `e2e/specs/landing.spec.ts` does NOT pin the
marketing page — it asserts `/` shows the nav and a composer textbox, i.e. it
already describes the target and was failing against the brochure.

**Landed 2026-07-28 (increments 1–3 of the above):**
- `Root.tsx` no longer has a front-door branch. The chat shell answers every
  route; `LoginGate` (already mounted for every `!isAuthenticated` visitor) asks
  for a session at submit — the first moment one is needed.
- `utils/login.ts#trySilentSso()` — one `prompt=none` attempt per tab via
  `IAM#signinSilent()`. **Reverted; it could never have worked, and what replaced
  it is `utils/sso.ts` — see "Silent SSO" below.** `signinSilent` is a hidden
  IFRAME, and an iframe is a cross-site SUBRESOURCE: SameSite=Lax withholds the
  session cookie, so the issuer saw an anonymous request every time.
- `GUEST_TOKEN_MAX` default 20 → 120. Spend is unchanged: `guestMessageLimiter`
  caps MESSAGES per real client IP (`GUEST_MESSAGE_MAX`, prod 2) and no amount of
  token minting resets it. Two limiters, two concerns.
- Marketing moved to `/welcome`, declared outside `<Root/>` so it keeps its own
  full-page chrome. Its hero now says `hanzo.chat` and shows a chat/search
  session (the coding demo was hanzo.app's story); verified live.
- Entry graph diet (shipped sha-ba6c128): only `en` is bundled — it is the
  fallback AND the source of translation-key types — and the other 40 locales
  lazy-load per-language through `locales/localeLoaders.ts` (`import.meta.glob`;
  jest maps that ONE module to `test/localeLoaders.node.ts`, an fs twin, so the
  real i18n module runs under tests). `heic-to` (667KB gzip WASM) loads on first
  .heic attach. The vite manualChunks `locales` rule is deleted — welding lazy
  locales to the eager `en` module would drag all 572KB gzip back into the
  entry. Measured live: entry transfer 3,364,175 → 2,168,217 compressed bytes
  (-35.5%); guest composer visible 3.2s → 1.9s desktop, 2.5s → 1.9s at 390px.
  `GUEST_TOKEN_MAX=120`/`GUEST_TOKEN_WINDOW=60` are now pinned in the universe
  values file so a code-default change can never silently re-tighten the mint.

### Silent SSO — one session, every Hanzo surface (2026-08-06)

Sign in once at hanzo.id — or at console.hanzo.ai, or hanzo.app — and chat finds
you. `client/src/utils/sso.ts` asks the issuer, once per visit, whether this
browser already has a session, and `AuthContext`'s signed-out path spends that
question before it falls back to a guest.

**The mechanism is a TOP-LEVEL REDIRECT, and nothing else can work.** No cookie
spans `hanzo.ai` / `hanzo.chat` / `hanzo.app` — different registrable domains. It
does not need to: the IAM session is `SameSite=Lax`, and Lax IS presented on a
top-level cross-site GET navigation. So navigating the document to
`/v1/iam/oauth/authorize?…&prompt=none` carries the cookie, and the issuer
answers from the session alone. `prompt=none` means it renders NOTHING either
way — a code, or `error=login_required` — which is what keeps the anonymous guest
preview intact for a visitor who really is a stranger.

The server half was already built, tested and deployed: `hanzoai/iam`
`internal/oidc/prompt.go` (`silentGrant`), advertised at
`hanzo.id/.well-known/openid-configuration` as
`prompt_values_supported: [none, login, select_account]`. Chat was simply the one
surface that never asked. Measured against production with a real Chromium:

    Sec-Fetch-Dest: document  ->  302 …/auth/callback?error=login_required
    Sec-Fetch-Dest: iframe    ->  302 …?error=interaction_required

**Do not rebuild the iframe.** `IAM#signinSilent()` still exists in the SDK and is
a trap here: an iframe is a cross-site SUBRESOURCE, so Lax withholds the cookie;
the edge answers `X-Frame-Options: DENY`; and `silentGrant` refuses on
`Sec-Fetch-Dest` besides. The only thing that would make it work is
`SameSite=None`, which IAM refuses deliberately. The earlier `trySilentSso()` was
exactly this and was reverted — but the revert took the *correct* conclusion with
it, leaving a comment in `AuthContext` asserting that only an interactive
redirect could ever sign anyone in. That was wrong for eight days.

**The bound is the whole safety story.** This navigates the document away on
boot; unbounded, that is not a bug, it is hanzo.chat being unreachable. So the
attempt is recorded in `sessionStorage` BEFORE the navigation (a probe that never
returns is still spent), the probe declines entirely when storage is unavailable
to bound it with, and it stays off `/auth/callback` and `/login`, which own
authorize round-trips of their own. `sessionStorage` not `localStorage`: "is
anyone signed in?" is a question whose answer changes, so pinning the first
answer forever would merely defer this bug. Cost is one redirect per visit, then
it self-heals. `client/src/utils/__tests__/sso.spec.ts` holds all of it.

`meansNoSession` is the other half: `OAuthCallback` reads `login_required` and
its siblings as an ANSWER and returns the visitor to `/c/new`, not to
`/login?error=auth_failed`. Treating it as a broken login would put a login
screen in front of every first-time visitor — precisely the guest experience the
probe exists to preserve. `access_denied` and friends still reach the error path.

`exchanging()` keeps the guest fallback off the callback route while a code is
being redeemed. That race predates this work but was rare; now every anonymous
visitor passes through that route exactly once, so it had to close with it.

### Arrival gate — REMOVED (2026-08-05, owner call)

The arrival OFFER is gone: no login modal on load. `LoginGate` opens only for a
REFUSAL (`limit`, `anonymous`, `unavailable`) — something was denied and the
gate explains it, so it still offers no dismissal (`onOpenChange` ignores
close requests: Escape and overlay clicks included, deliberately). The
`welcome` reason, `offerLogin()`, the `hanzo.login.welcomed` session flag and
the welcome/stay-logged-out strings are deleted, not parked. The standing
invitation is the sidebar foot's Log in / Sign up (`Nav/Visitor.tsx`). Do not
reintroduce an unprompted modal over the signed-out product.

### Ambient backdrop (2026-08-05)

The chat canvas plays a muted, looping YouTube embed behind everything
(`Chat/Backdrop.tsx`, mounted first in `Presentation`; content sits in an
explicit `z-10` wrapper because a cross-origin iframe composites above z-auto
siblings). Facts that took a day to learn, kept here so they stay learned:

- Host is `www.youtube.com` — the nocookie host answers embeds with
  "video player configuration error" (153). CSP `frame-src` allows exactly
  that origin (`api/server/csp.js`, pinned by `csp.spec.js`).
- Cover math is `width: max(177.78vh, 100vw); height: max(56.25vw, 100vh)`
  + center-translate + 1.4 overscan, with inline `maxWidth/maxHeight: none`
  because the app's global `iframe { max-width: 100% }` otherwise clamps it
  into a letterbox on phones.
- The reveal is gated on PROOF of playback, not a timer: the listening
  handshake makes the player report state, and the iframe stays `opacity: 0`
  until `playerState === 1` AND the ~4s adaptive-ramp window has passed
  (quality cannot be forced; embeds ignore every quality API). A video
  YouTube refuses never reveals — clean canvas, not an error card. Verified
  by aborting `*.youtube.com` at the network layer.
- `showBackdrop` (Settings → Chat, default on) unmounts the embed entirely —
  off means the third-party stream stops, not `opacity: 0`.
- `ResizablePanelGroup` in `SidePanelGroup.tsx` must NOT paint
  `bg-presentation`; that opaque sheet sits above the backdrop and was
  exactly what hid it.

### Signed-out boot is deterministic (2026-08-05)

The anonymous cold start used to be a coin flip; three fixes made it one
path, each at its own layer. Do not undo any of them singly:

- `/v1/chat/auth/refresh` with no cookie answers **401**, not
  `200 {message}` — a refusal wearing a success status made the client
  believe a session existed, so it never minted a guest.
- A 401 from `auth/refresh` is TERMINAL in the axios interceptor
  (`data-provider/src/request.ts`), like 2fa and logout: retrying the
  refresh through its own interceptor queues the retry behind
  `isRefreshing` and deadlocks every queued caller.
- `AuthContext`: `silentRefresh` is single-flight (`refreshBusyRef`), and
  the guest fallback no-ops once ANY principal has landed — a straggler
  refresh completing after guest adoption used to run the unauth branch,
  which resets the global token header (`setTokenHeader(undefined)`) while
  the composer stayed mounted: the next send went out tokenless and 401'd.
  Adopting a principal also invalidates all queries, because bootstrap
  queries that 401'd pre-token had burned their retries into a terminal
  error state nothing else re-ran.
- The DECISIVE one: `setUserContext` is a lodash `debounce(50)`, so a
  refresh failure QUEUES its unauth write — and a local guest mint outruns
  the timer, so the queued `setTokenHeader(undefined)` landed 50ms AFTER
  adoption armed the header, deterministically, on every load. Guest sends
  left with `Authorization: NONE` while a valid bearer sat in
  sessionStorage. `acquireGuest` now calls `setUserContext.cancel()` before
  arming. If sends ever 401 while bootstrap calls carry the bearer, look
  for a new writer racing this debounce before suspecting the server.
- Defense in depth for module duplication: `@hanzochat/data-provider` is
  bundled at least twice (root + `./react-query` entrypoints each inline
  the request layer), so axios `defaults` set through one copy are
  invisible to the other. The client deduplicates axios
  (`resolve.dedupe: ['axios']` in vite.config.ts) AND `setTokenHeader`
  mirrors the bearer to `window.__hanzoBearer`, which a request
  interceptor in EVERY copy injects when Authorization is absent. Use
  `window`, not `globalThis` — the node-polyfill plugin shims `globalThis`
  inside bundled modules and writes land on the shim.

The PWA service worker is a SELF-DESTROYER (`selfDestroying: true` in
`client/vite.config.ts`): an online AI chat gains nothing from a precache
that serves the previous build's shell after every deploy (black page,
missing lazy chunks — observed repeatedly). Installed workers unregister
and purge on their next visit; the manifest keeps installability. Do not
resurrect the workbox worker; if `/sw.js` ever stops being served, old
workers strand forever (the SPA catch-all answers it with HTML, which is a
failed update, not the 404 that would unregister them).

### Header restructure — NOT done, and it is not a tweak

Owner wants: Hanzo mark top-left, search + sidebar toggle to the RIGHT of the
sidebar, and a ChatGPT-style model/agent dropdown where `ChatGPT ⌄` sits.

`@hanzogui/shell` already ships `HanzoAppHeader` (the signed-in header carrying
the mark). Chat mounts `HanzoAppLauncher` via `Nav/BrandCorner.tsx` — in the
sidebar's first row, and in `Chat/Header.tsx` only once the sidebar collapses.
Adopting the full header is still a LAYOUT change: `HanzoAppHeader` is
`position: sticky; height: 56`, so `Root.tsx`'s `calc(100dvh - ${bannerHeight}px)`
must subtract it too or the composer falls off the bottom of the viewport.

### Window chrome — one atom per panel (`store/panels.ts`)

Three movable panels are toggled from the header, so each one's open state is a
persisted atom in `client/src/store/panels.ts` and NOTHING else: `sidePanelOpen`,
`bottomBarOpen` (+ `bottomBarTabs`, `bottomBarActiveTab`, `bottomBarSize`). Two
write-only atoms, `openBottomBarTab` and `closeBottomBarTab`, are the one way a
bar tab is created or destroyed — the companions menu, ⌘T and the strip's `+` all
go through `openBottomBarTab`.

**`Dock` and `BottomBar` are two different features and must never share a name.**
`Chat/Dock` is a COLUMN of embedded iframe cards BESIDE the conversation — a
sibling in the same horizontal `ResizablePanelGroup` as the artifacts panel, fed
by the fixed `Chat/Dock/cards.ts` catalog, switched by `store.showDock` in
Settings. `Chat/BottomBar` is a horizontal split of the chat column holding a tab
strip of pages the reader opens themselves, one persisted URL per tab. Different
axis, different data, different switch. If two things in this tree are both
called "dock", one of them is wrong.

- **Right**: `store.sidePanelOpen`. `SidePanel.tsx` reconciles the imperative
  `react-resizable-panels` handle to it in ONE effect (skipped on small screens,
  where `SidePanelGroup` collapses unconditionally and would fight it). Before
  this the open state was React state inside that subtree, which is exactly why
  nothing outside it — including the header — could toggle the panel. Note the
  visible consequence: the panel is now open or closed, not open / 50px rail /
  hidden, so the default (`false`) hides the rail and the header button is how it
  comes back.
- **Bottom**: `Chat/BottomBar/BottomBar.tsx`. `BottomBarGroup` wraps the chat
  column in a vertical `ResizablePanelGroup` (mounted at all times, so toggling
  the bar never remounts the conversation) and `Chat/Presentation.tsx` mounts it
  around `<main>`. `minSize` on the chat panel is what keeps the composer on
  screen — the bar takes height from the column, it never floats over it.
  **Put no className on that chat-column `ResizablePanel`**: making it a flex row
  shrink-to-fits `<main>` to its content (measured: 626px inside a 1439px column,
  which bunches the header controls left). Measured after: 1179/1179.
- **Left**: `navVisible` in `routes/Root.tsx`, toggled by `Nav/NewChat.tsx` — NOT
  by `Chat/Menus/OpenSidebar`, which the chat view does not mount (the rail keeps
  its own toggle, and `Chat/Header.spec.tsx` holds the header's left edge empty).
  `OpenSidebar` still serves Marketplace / PromptForm / CreatePromptForm and now
  takes an optional `navVisible` so it can state which way it toggles; those three
  omit it and get the open wording, which is the state they mount it in.

`Chat/PanelControls.tsx` is the cluster at the right end of `header-actions`:
full-width (`store.maximizeChatSpace`), the companions menu, and the right panel.
It also owns the shortcuts — a `document` keydown listener in an effect, the only
shortcut mechanism this repo has — and they test `e.code`, not `e.key`, because
Option+S on macOS types `ß`. **It does not use `PanelRight`**: the neighbouring
`Chat/Menus/CanvasToggle` already carries that glyph for the ARTIFACTS panel, and
two buttons in one row wearing one glyph name neither. The control panel gets
`SlidersHorizontal`, which is what it calls itself (`aria-label` = Controls).

The companions menu lists ONE companion, the Browser, and that is not an
oversight. It used to open with a "Side chat" row that was the cluster's third
button written a second time — same `toggleSideChat`, same `sidePanelOpen` atom,
same `SlidersHorizontal` glyph, on screen twice at two weights. The row is gone
rather than re-pointed: the only other companion surface that exists is
`Chat/Dock` (`store.showDock`, a Settings switch), and giving it a header
affordance is a product decision, not a defect repair. **Cost of the removal,
recorded honestly: ⌥⌘S is no longer written down anywhere in the chrome.** The
shortcut still works — `PanelControls`' keydown effect is untouched — but that
menu row was its only label. If the menu ever gains a second real companion, that
is where the chord goes back.

Bar tabs frame pages through `SidePanel/Preview/Panel` — the sandboxed frame that
was written and mounted nowhere. Its URL is `store.preview(tabId)`, an
`atomFamily` of persisted atoms, so two tabs are two pages; `closeBottomBarTab`
RESETs the tab's atom AND `preview.remove(id)`s it, so a long session cannot silt
localStorage up with dead tabs (measured: the key is gone, not `""`).

**The Browser tab can frame almost nothing, and it now SAYS so.** `frame-src`
(`api/server/csp.js`) names three origins; a reader who types `example.com` is
refused, and the browser's refusal is silent — the frame loads `about:blank`,
keeps its full box (measured 1161×179.3) and logs only to devtools. `Panel.tsx`
listens for the `securitypolicyviolation` the directive fires and renders an
explicit state instead: the sentence, and the URL as a new-tab link. Two things
about that detection are measured facts, not preferences:
- **The sandbox makes every other test impossible.** `allow-scripts` without
  `allow-same-origin` gives EVERY frame an opaque origin, so a loaded page and a
  refused one are byte-identical from the embedder (`contentDocument` null, every
  property a SecurityError). Timing does not separate them either — a refusal
  lands in ~3ms, a same-origin page in ~5ms. `blockedURI` is exact; nothing else
  available here is.
- **`useLayoutEffect`, not `useEffect`.** The event is dispatched in a task
  shortly after the frame is inserted: a listener attached synchronously, in a
  microtask, or in a `setTimeout(0)` all catch it; one attached after two rAFs
  does not. A layout effect runs inside the commit that inserts the frame.
The policy itself was NOT widened — that is a security decision and the tradeoff
is written at `csp.js` where it would be taken. `Panel.spec.tsx` holds the
behaviour, including that another origin's violation must not blank this frame.

`DropdownPopup` (packages/client) had two defects, and one of them had a live
call site: `placement` was never forwarded, and Ariakit reads placement off the
STORE — passing it to `<Menu>` is silently ignored. `SidePanel/Agents/Images.tsx`
was already passing `placement="bottom"`, which type-errored (TS2322) and did
nothing; forwarding it to `useMenuStore` fixes both. The other, `kbd`, printed a
hardcoded `⌘` in front of the caller's string and only on hover — it cannot
express `⌥⌘S` and is wrong on every non-Apple keyboard. `kbd` has zero other call
sites; `placement` had that one.

Three more, all measured rather than reviewed, and all now fixed:
- **`.popover-ui { margin-right: -2px }` was a misalignment, not a nudge.**
  Ariakit's positioner is a shrink-to-fit wrapper, so a negative right margin
  makes the wrapper 2px narrower than the menu and floating-ui aligns the
  WRAPPER to the trigger — every popover in the app hung 2px past the control it
  belongs to (menu right 1381 vs trigger right 1379; 1379/1379 with it gone).
  `margin-top: 4px` beside it is a real gap and stays.
- **`mr-2` on the icon span stacked on the row's own `gap-2`**, putting 16px
  between a glyph and its label — twice the row's rhythm. Dropped; the row's gap
  is the one mechanism, so the gap is 8px. Two call sites existed ONLY to cancel
  it (`iconClassName="mr-0"` in ToolsDropdown and AttachFileMenu) and went with
  it.
- **The `kbd` was `text-text-secondary`, one rung under the label**: 205 vs 236
  on a surface that paints rgb(14,14,14), a 13% step that read as a second label.
  It is `text-text-secondary-alt` now — 12.14:1 → 6.58:1 against the label's
  16.34:1, measured off painted pixels. `--text-tertiary`, the next rung down,
  is NOT usable here: it resolves to `#595959`, which is 2.76:1 and fails AA.

**Measured in real Chromium at 1440×900**, signed in: the cluster is three 44×44
boxes (1283/1335/1387) carrying ONE focus indicator between them — the Ariakit
trigger is hand-rolled, so it restates `size-11` and the ring classes or it falls
back to the UA outline; menu `role=menu` with 1 `menuitem` at 44.0px, right edge
1379 = trigger right 1379; Escape unmounts it and returns `aria-expanded=false`;
right panel 0 → 352 → 0; bar tabs 1 →2 via `+` →3 via ⌘T →2 via a tab's ×; drag
315.3 → 475.0px and the floor holds at 135.7px (15.1% of a 900px column);
composer bottom 415.7 vs bar top 584.7 and still clear at the floor;
`scrollWidth === clientWidth` at 1440 and at 390; bar, tab count and height all
survive a reload; the side `Dock` still renders its card and resizes 427.4 →
592.1px beside it.

**The bar strip's height is a budget, and every control in it is bled into that
budget rather than allowed to grow it.** The strip is 41px (32px content +
`py-1` + a 1px rule) and the composer sits directly above, so a taller strip
costs conversation. So: the `+` and the panel `×` are `size-10 -my-1` — 40×40
boxes whose margin box is 32, i.e. the largest square that fits the strip's
padding edge to edge; and a tab's `×` is `size-6 -mx-0.5`, 24×24 giving back the
4px so the tab measures the same 111.1px it did at 20×20. 44 is unreachable here
without overhanging the drag handle. Verified that it does NOT: `elementFromPoint`
returns the resize handle at all six probes across the seam — on the rule, above
and below it, in open strip AND directly over the `+` — and a drag started 3px
above the rule resizes the bar (435 → 372.1px), which the old 4px grab area could
not reach. The seam also paints ONE rule now, not two: the bar panel's `border-t`
duplicated the handle's own hairline.

**Two upstream defects were measured on clean `origin/main` and are NOT from this
work** — do not attribute them to the chrome:

- **The sidebar toggle does not collapse the sidebar live.** Clicking it writes
  `navVisible=false` to localStorage, but `main` stays at x=260 and the rail never
  appears until a RELOAD, which reads the flag in `Root.tsx`'s initial `useState`.
  Identical before and after this change; the bug is between `Nav.tsx`'s
  `toggleNavVisible` (a `startTransition` around Root's setter) and the render.
- **`maximizeChatSpace` cannot widen the empty landing.** The control works —
  `aria-pressed` flips, the value persists, and the composer's own cap goes
  `max-width: 896px → 100%` — but `Chat/Answer/AnswerEngine.tsx` wraps it in a
  hardcoded `xl:max-w-4xl` column, so 100% resolves to the same 896px. The atom
  does reach the message column (`MessageRender`, `ContentRender`,
  `MessageParts`); it is the landing that is capped upstream.

**Verifying this locally is not a `curl`.** There is no local login route in this
fork (IAM OIDC or guest, nothing else). Mint a principal instead: with
`CHAT_STORE_SQLITE` set and `MONGO_URI` unset, run `registerUser` + `setAuthTokens`
from `api/server/services/AuthService` in a short script BEFORE starting the
server (both write the same SQLite file and the store is an in-process writer),
then hand Playwright the returned `refreshToken` cookie. Also pre-set
`sessionStorage['hanzo.sso.probed'] = '1'` in an init script, or the signed-out
SSO probe navigates the document to hanzo.id mid-run.
