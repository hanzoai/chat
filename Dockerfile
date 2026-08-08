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
# PUBLISHABLE_KEY is the name in KMS and on the --build-arg; VITE_ is added here
# because Vite's envPrefix is what makes a var inlinable. The prefix is a property
# of this build, so it is applied in this build file and the secret store keeps the
# ONE plain name. No default: a credential is supplied or it is absent, never
# hardcoded. Absent → the anonymous lane, same as before.
#
# (This slot previously carried a Umami VITE_ANALYTICS_SITE_ID whose index.html
# placeholder no longer exists — telemetry is the ONE @hanzo/event client.)
ARG PUBLISHABLE_KEY
ENV VITE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
# Gated HERE because this is the one thing every builder passes through. A guard
# in deploy.yml protects that lane only; hanzo.app shipped keyless from a second
# lane while its repo already had a working KMS fetch.
#
# Fail closed. An empty key builds, serves and looks correct while cloud files
# every pageview under $public, which this org cannot read, and ingest answers
# 200 either way.
RUN case "$PUBLISHABLE_KEY" in \
      pk-*) : ;; \
      '')   echo "PUBLISHABLE_KEY is empty - pass --build-arg PUBLISHABLE_KEY=<pk-...> (KMS deploy/PUBLISHABLE_KEY, env prod)" >&2; exit 1 ;; \
      *)    echo "PUBLISHABLE_KEY is not a publishable key (expected a pk- prefix)" >&2; exit 1 ;; \
    esac

# Publishable event-ingest key (pk-live-…), inlined by Vite into the client bundle.
# Deliberately has NO default: a wrong or absent key is not a degraded mode, it is
# the anonymous lane — every row filed under the `$public` tenant and every identify
# dropped with a 200 receipt. Leaving it empty keeps that failure honest and visible
# rather than silently pinning the fleet to some other org's partition.
#
# Publishable and write-only by design (it authorizes a write into ONE org and can
# read nothing), so shipping it in a bundle is the documented use. It is still a
# credential: it comes from KMS (org `hanzo`, path `deploy`, name PUBLISHABLE_KEY,
# env `prod`) and is passed with --build-arg by CI. Never commit a value here.
#
# The ARG/ENV pair that used to sit here RE-DECLARED VITE_PUBLISHABLE_KEY with an
# empty default and immediately assigned it over the value set above, so the key
# resolved, passed its gate, and was then blanked before Vite ever inlined it.
# That is how 1.0.58 published an empty bundle from a fully green run. The value
# is set ONCE, from PUBLISHABLE_KEY, above.

# `&&`, not `;`. With `;` the RUN exits with the status of the LAST command, so a
# failed `pnpm run frontend` was masked by a successful `pnpm store prune` and the
# build went green with no dist — which is how an image that cannot boot reached
# the registry to be pinned. A build that fails must fail.
RUN \
    # React client build with configurable memory
    NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}" pnpm run frontend && \
    # Did Vite actually INLINE it? A key that is present in the environment and
    # absent from the bundle is indistinguishable from success everywhere except
    # the warehouse, where the traffic just stops being attributable. 1.0.58 was
    # exactly that: every step green, the key blanked by a shadowing ARG, and the
    # bundle empty. Assert on the bytes that ship, which is the only place the
    # claim is true or false.
    #
    # The emptiness check is not redundant, it is the ONLY one that fires in the
    # common case. `grep -F ""` matches every line, so an ABSENT key satisfied the
    # search below and this gate passed every keyless build it exists to stop —
    # and absent is the usual shape, because the KMS fetch in deploy.yml `exit 0`s
    # on missing credentials and hands an empty --build-arg down. So the gate held
    # only for a key that was present and not inlined, and waved through the one
    # where there was no key at all.
    { { [ -n "$VITE_PUBLISHABLE_KEY" ] && grep -rqF "$VITE_PUBLISHABLE_KEY" client/dist; } || \
      { echo "ERROR: no ingest key in client/dist - hanzo.chat would ship unattributed and every track/identify/group would be dropped at 200" >&2; exit 1; }; } && \
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
