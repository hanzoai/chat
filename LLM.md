# Hanzo Chat

Based on LibreChat v0.8.0-rc2. AI chat interface with multi-model support,
MCP integration, agents, and RAG. Live at **chat.hanzo.ai**.

**Repo**: `github.com/hanzoai/chat`
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
  api/               # API client package (@librechat/api)
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
MONGO_URI=                  # MongoDB connection
JWT_SECRET=                 # Auth token signing
CREDS_KEY= CREDS_IV=        # Credential encryption
```

## K8s Deployment

- 2 replicas, port 3080
- Ingress: `chat.hanzo.ai` + `hanzo.chat` (separate TLS certs)
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
- Env var: `LIBRECHAT_LOG_DIR` (kept for backward compat)
- MCP template vars: `LIBRECHAT_USER_*` (internal protocol identifiers)

## Branding Cleanup Log

All user-visible `LibreChat` / `librechat.ai` references replaced with Hanzo equivalents:
- Config file: `librechat.yaml` -> `chat.yaml` (renamed Feb 2026)
- Config loading: `defaultConfigPath` -> `chat.yaml`
- Cache key: `LIBRECHAT_YAML_CONFIG` -> `CHAT_YAML_CONFIG`
- Docker volumes: `./librechat.yaml:/app/librechat.yaml` -> `./chat.yaml:/app/chat.yaml`
- Helm charts: `helm/librechat/` -> `helm/chat/`, all template refs updated
- Helm values keys: `librechat` -> `chat`
- Dockerfile: `Dockerfile.librechat` -> `Dockerfile.chat`
- Translation keys: `com_agents_by_librechat` -> `com_agents_by_hanzo`
- Translation keys: `com_ui_librechat_code_*` -> `com_ui_hanzo_code_*`
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

## Zen Model Integration

14 Zen models configured in `chat.yaml` under `endpoints.custom` (Hanzo endpoint):
- zen4 series (9): zen4, zen4-ultra, zen4-pro, zen4-max, zen4-mini, zen4-thinking, zen4-coder, zen4-coder-pro, zen4-coder-flash
- zen3 series (5): zen3-omni, zen3-vl, zen3-nano, zen3-guard, zen3-embedding
- Default title/summary model: zen4-mini
- All routed through api.hanzo.ai/v1
