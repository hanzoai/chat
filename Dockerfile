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

# Bake the publishable ingest key into the client bundle. Build-time by necessity:
# Vite inlines import.meta.env at build, so a value delivered at runtime cannot
# reach an already-compiled bundle.
#
# Without it every beacon reaches cloud unkeyed, takes the anonymous lane, and has
# its track/identify/group dropped — answered 200, so nothing surfaces the loss.
#
# EVENT_INGEST_KEY is the name in KMS and on the --build-arg; VITE_ is added here
# because Vite's envPrefix is what makes a var inlinable. The prefix is a property
# of this build, so it is applied in this build file and the secret store keeps the
# ONE plain name. No default: a credential is supplied or it is absent, never
# hardcoded. Absent → the anonymous lane, same as before.
#
# (This slot previously carried a Umami VITE_ANALYTICS_SITE_ID whose index.html
# placeholder no longer exists — telemetry is the ONE @hanzo/event client.)
# ONE name declares this value, and it is declared once. A second
# `ARG VITE_EVENT_INGEST_KEY=` used to follow this pair, re-declaring the SAME
# variable with an empty default and then re-assigning the ENV from it. A build
# arg declared AFTER an ENV of the same name shadows it for every later
# expansion, so `ENV VITE_EVENT_INGEST_KEY=$VITE_EVENT_INGEST_KEY` read the empty
# ARG, not the key set on the line above, and overwrote it with "".
#
# Measured, not reasoned: 1.0.57 (before the second pair existed) carries
# `VITE_EVENT_INGEST_KEY=pk-live-…` in its image config; 1.0.58 (after) carries
# `VITE_EVENT_INGEST_KEY=` — from a run whose KMS step had logged "ingest key
# resolved (40 chars)" and whose buildx line shows `--build-arg
# EVENT_INGEST_KEY=***`. The credential was fetched, passed, and then erased by
# the Dockerfile, and every step of that was green.
#
# Publishable and write-only by design (it authorizes a write into ONE org and can
# read nothing), so shipping it in a bundle is the documented use. It is still a
# credential: it comes from KMS (path `deploy`, name EVENT_INGEST_KEY, env `prod`)
# and is passed with --build-arg by CI. Never commit a value here. No default: a
# credential is supplied or it is absent, never hardcoded. Absent → the anonymous
# lane, where every row is filed under the `$public` tenant our own org cannot
# read, and ingest still answers 200.
ARG EVENT_INGEST_KEY
ENV VITE_EVENT_INGEST_KEY=$EVENT_INGEST_KEY

# `&&`, not `;`. With `;` the RUN exits with the status of the LAST command, so a
# failed `pnpm run frontend` was masked by a successful `pnpm store prune` and the
# build went green with no dist — which is how an image that cannot boot reached
# the registry to be pinned. A build that fails must fail.
RUN \
    # React client build with configurable memory
    NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}" pnpm run frontend && \
    pnpm store prune

# THE KEY IS IN THE BUNDLE, OR THIS IS NOT A BUILD. Asserted against the dist that
# was just produced, because every weaker signal already said yes: 1.0.58's KMS
# step logged "ingest key resolved (40 chars)", its buildx line carried
# `--build-arg EVENT_INGEST_KEY=***`, every step was green — and the bundle it
# published contained no key, because a second `ARG VITE_EVENT_INGEST_KEY=` had
# shadowed the ENV and blanked it. Nothing between the secret store and the
# browser noticed.
#
# `pnpm run frontend` is what inlines it, so this is the first moment the question
# can be answered at all, and the last moment it is cheap. The value is never
# echoed — only its presence is reported.
#
# An EMPTY key is NOT failed here: this Dockerfile is also built without the
# credential (a fork, a local `docker build`), and refusing that would make the
# image unbuildable rather than unkeyed. Supplying it is CI's invariant, enforced
# fail-closed in .hanzo/workflows/deploy.yml. This asserts the OTHER half — that a
# key which WAS supplied actually reached the artifact — and the two together are
# what make "green" mean "measurable".
RUN if [ -z "${VITE_EVENT_INGEST_KEY}" ]; then \
      echo "WARNING: VITE_EVENT_INGEST_KEY empty — bundle ships unkeyed; every event files under the \$public tenant"; \
    elif grep -rqF "${VITE_EVENT_INGEST_KEY}" client/dist; then \
      echo "ingest key inlined into client/dist — verified"; \
    else \
      echo "ERROR: VITE_EVENT_INGEST_KEY was supplied but is NOT present in client/dist."; \
      echo "       Vite inlines import.meta.env at build; a value that does not appear"; \
      echo "       in the dist cannot reach the browser. Check that nothing re-declares"; \
      echo "       VITE_EVENT_INGEST_KEY as an ARG after the ENV above."; \
      exit 1; \
    fi

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
