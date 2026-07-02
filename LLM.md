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
  models/            # Mongoose models (MongoDB)
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

Off by default (`ALLOW_GUEST_CHAT=false`). When enabled, unauthenticated
visitors get a per-IP free quota (`GUEST_MESSAGE_MAX`, default 3) on the free
Zen model (`GUEST_MODEL`, default `zen3-nano`) via the `Hanzo` custom endpoint
(`api.hanzo.ai`). Exhausting the quota returns `402 {type:'GUEST_LIMIT'}` and
the client opens the existing OpenID/hanzo.id login.

Security model (fail-closed, server-enforced):
- `POST /api/auth/guest` issues a short-lived guest JWT (`{guest:true}`,
  per-token random id) signed with `JWT_SECRET`. Rate-limited per IP.
- `requireGuestOrJwtAuth` (chat-completion route ONLY) accepts guest tokens;
  the standard `jwt` strategy rejects them everywhere else (no DB user), so
  every other route stays closed. `enforceGuestScope` pins endpoint+model and
  strips agents/tools/files/spec/preset. `guestMessageLimiter` (reuses the
  Redis `limiterCache`) enforces the per-IP quota.
- Key files: `api/server/services/guestConfig.js`,
  `api/server/controllers/auth/GuestController.js`,
  `api/server/middleware/{requireGuestOrJwtAuth,enforceGuestScope}.js`,
  `api/server/middleware/limiters/{guestLimiters,guestMessageLimiter}.js`,
  router wiring in `api/server/routes/agents/index.js`. Client:
  `client/src/hooks/useGuestAuth.ts`, `AuthContext.tsx`,
  `components/Auth/GuestLimitDialog.tsx`.
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
  through `useRunCloudAgent` → `POST /api/agents/cloud/:name/run`. The @mention /
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
  open proxy (three fixed endpoints).
- Key files: backend `api/server/services/CloudAgentsClient.js`,
  `api/server/routes/agents/cloud.js` (mounted `/cloud` in
  `api/server/routes/agents/index.js`); data layer
  `packages/data-provider/src/{types/cloudAgents.ts,api-endpoints.ts,data-service.ts}`;
  client `client/src/hooks/Agents/useRunCloudAgent.ts`,
  `client/src/utils/agentCommand.ts`,
  `client/src/components/Chat/Input/AgentsCommand.tsx`, and the @mention wiring in
  `client/src/hooks/Input/useMentions.ts` + `Mention.tsx`.
- Env: `HANZO_CLOUD_URL` (optional; falls back to the `OPENAI_BASE_URL` host).
- Convergence path (later): chat's LibreChat-legacy `/api/agents` CRUD should
  converge onto cloud `/v1/agents`; this step only ADDS cloud-agent RUN.

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
