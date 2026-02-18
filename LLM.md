# Hanzo Chat

Fork of LibreChat v0.8.0-rc2. AI chat interface with multi-model support,
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
- `@librechat/api`, `librechat-data-provider`
- Functions: `extractLibreChatParams`, `importLibreChatConvo`
