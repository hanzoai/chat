# syntax=docker/dockerfile:1.7
# Hanzo Chat — the Vite SPA built once, served by hanzoai/spa.
FROM node:24-alpine AS build
WORKDIR /build
ENV CI=true PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# Manifests first so a source edit re-runs the build and not the resolve.
#
# pnpm-workspace.yaml is REQUIRED even though this repo has no workspace
# members: every dependency is `catalog:`, and the catalog lives in that file.
# Without it the install resolves nothing and fails on the first `catalog:`.
#
# FROZEN, and the lockfile ships. A resolver left free to drift builds a tree
# nobody ran — hanzoai/id shipped exactly that, where a free resolve moved vite
# to a different version than the tested lockfile and the image died on a
# missing module while the same commit built cleanly from the lockfile. Frozen,
# the image gets the tree the gate passed against, and a stale lockfile fails
# here, loudly, instead of silently building something else.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json vite.config.ts index.html ./
COPY src src

# `pnpm build` is `tsc --noEmit && vite build`, so the typecheck is part of the
# image and dead code cannot ship (tsconfig sets noUnusedLocals).
#
# `&&`, not `;`: with `;` the RUN carries the status of the LAST command and a
# failed build would be masked. A vite build that emits nothing still exits 0,
# which is what the two file tests are for.
RUN pnpm build && [ -s dist/index.html ] && [ -d dist/assets ]

# hanzoai/spa, not hanzoai/static, and not a webserver of our own: this is a
# client-routed SPA, so it needs index.html served for every path. hanzoai/static
# defaults to `Content-Security-Policy: default-src 'none'`, which blocks the
# bundle the page loads and leaves a blank screen. Defaults: PORT=3000, ROOT=/public.
FROM ghcr.io/hanzoai/spa:1.4.13
COPY --from=build /build/dist /public
EXPOSE 3000
