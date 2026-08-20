# v0.8.3-rc1

# Base node image — Hanzo Node 24 (Alpine) base: node:sqlite (DatabaseSync) is
# built in and native better-sqlite3 compiles (build-base + python3 + g++ baked
# in), so the CHAT_STORE_SQLITE document store runs. Node 20 lacked node:sqlite.
FROM ghcr.io/hanzoai/nodejs:v24.18.0 AS node

# Install jemalloc
RUN apk add --no-cache jemalloc
RUN apk add --no-cache python3 py3-pip uv

# Set environment variable to use jemalloc
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Add `uv` for extended MCP support
COPY --from=ghcr.io/astral-sh/uv:0.9.5-python3.12-alpine /usr/local/bin/uv /usr/local/bin/uvx /bin/
RUN uv --version

# Set configurable max-old-space-size with default
ARG NODE_MAX_OLD_SPACE_SIZE=8192

RUN mkdir -p /app && chown node:node /app
WORKDIR /app

USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node api/package.json ./api/package.json
COPY --chown=node:node client/package.json ./client/package.json
COPY --chown=node:node packages/data-provider/package.json ./packages/data-provider/package.json
COPY --chown=node:node packages/data-schemas/package.json ./packages/data-schemas/package.json
COPY --chown=node:node packages/api/package.json ./packages/api/package.json
COPY --chown=node:node packages/client/package.json ./packages/client/package.json

RUN \
    # Allow mounting of these files, which have no default
    touch .env && \
    # Create directories for the volumes to inherit the correct permissions
    mkdir -p /app/client/public/images /app/logs /app/uploads && \
    pnpm install --frozen-lockfile

COPY --chown=node:node . .

# No ingest key is baked, and that is deliberate — see client/src/Providers/
# AnalyticsProvider.tsx. Chat is multi-org: @hanzo/event resolves the outgoing
# credential as `ingestKey ?? token`, so a baked key would REPLACE every signed-in
# user's own bearer and file all of their events under the key's single org.
# The user's IAM bearer is the credential here, and it needs no build arg.

# `&&`, not `;`. With `;` the RUN exits with the status of the LAST command, so a
# failed `pnpm run frontend` was masked by a successful `pnpm store prune` and the
# build went green with no dist — which is how an image that cannot boot reached
# the registry to be pinned. A build that fails must fail.
RUN \
    # React client build with configurable memory
    NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}" pnpm run frontend && \
    pnpm store prune

# Boot gate — see scripts/check-barrel.cjs. Runs against the dist that was just
# built and fails the BUILD for the two defects that otherwise only show up as a
# dead pod: an import @hanzochat/api never declared (rollup inlines it, and an
# inlined native/dynamic require throws at load), and a name api/server/**
# destructures from the barrel that the barrel does not export (silently
# `undefined` until its first call site).
RUN node scripts/check-barrel.cjs

# Node API setup
EXPOSE 3080
ENV HOST=0.0.0.0
CMD ["pnpm", "run", "backend"]

# cache-bust: 1774514777
