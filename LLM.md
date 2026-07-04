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
  api/               # API client package (@librechat/api)
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

### Wiring (hot path off mongoose)
`api/db/connect.js`, `api/db/models.js`, `api/db/index.js` and
`api/models/index.js` import the facade (`~/db/base`) — not `mongoose`. Boot
sequence is unchanged: `connectDb()` → `indexSync()` (Meili, Phase 2) →
`seedDatabase()`. **Nothing calls `mongoose.connect`.** `_id` is a real 24-hex
ObjectId string stored inside the document; conversations/messages remain keyed
by their `conversationId`/`messageId` UUIDs.

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

### Phased plan (this is Phase 1)
- **Phase 1 (done):** adapter + core hot-path verified on Base (User, Balance,
  Conversation, Message, Agent, plus Role/Session/Token/Category via the same
  adapter — 29 collections provisioned). Hot-path entry points off mongoose;
  nothing connects to Mongo.
- **Phase 2 — FTS:** replace MeiliSearch (`api/db/indexSync.js`,
  `Conversation.meiliSearch`) with Base/SQLite FTS. Adapter currently stubs
  `meiliSearch → { hits: [] }`, so search returns empty (not broken).
- **Phase 3 — finish the tail:** remove the remaining direct `require('mongoose')`
  (ObjectId utilities / migration): `api/models/Agent.js`,
  `api/models/inviteUser.js`, `api/server/services/PermissionService.js`,
  `api/server/controllers/PermissionsController.js`,
  `api/server/services/initializeMCPs.js`,
  `api/server/services/start/migration.js`. Then drop the `mongoose`/
  `mongodb-memory-server` devDeps so `grep -riE 'mongoose|mongodb'` in `api/` is 0.
- **Phase 3 — concurrency:** adapter upsert is find-then-write; add a Base
  unique index on natural keys (conversationId/messageId) + retry for
  race-safety under multi-replica load (single `_id` unique index today).

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

## Internal Package Names

These are kept as-is from upstream (npm deps, not worth renaming):
- `@librechat/api`, `@librechat/client`, `@librechat/data-schemas`, `librechat-data-provider`, `@librechat/agents`
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
