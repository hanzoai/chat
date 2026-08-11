#!/usr/bin/env bash
# The version of ghcr.io/hanzoai/chat — is the declared one still true?
#
#   scripts/version.sh published   # the highest version already shipped
#
# `check` is GONE with the write-back it existed to police. It compared the
# declared number against the published one and failed when declared was behind
# — which is the PERMANENT state now that deploy.yml no longer commits to main
# (the forge refuses an Actions-token push to a protected branch). imgver takes
# `max(declared, published) + 1`, so a lagging declaration loses to the registry
# and costs nothing; the gate would only have gone red forever about a copy with
# no authority.
#
# THIS SCRIPT DOES NOT COMPUTE THE NEXT NUMBER, and that is deliberate.
# hanzoai/ci's `imgver` does, it is the fleet's ONE implementation for container
# repos, and .hanzo/workflows/deploy.yml calls it. A second computation here
# would be a second answer. What was missing was never a computation — it was a
# WRITER and a CHECK.
#
# THE DEFECT, MEASURED 2026-08-06: package.json said 1.0.77 while
# ghcr.io/hanzoai/chat was on 1.0.113 and universe pinned it. 36 patches.
# imgver takes max(declared, published) + 1, so `declared` is a floor — and a
# floor nothing ever writes back sinks one patch per release, forever. deploy.yml
# now commits the number in the same commit it tags; this proves it stuck.
#
# THE INVARIANT, one sentence: the declared version must never be BEHIND the
# highest published version. Equal is the steady state (CI writes it); AHEAD is
# a human raising the series on purpose, which is imgver's documented affordance
# ("the human bumped it — publish exactly that") and must keep working. So the
# test is `>=`, never `==`.
#
# NO LINE PIN, unlike hanzoai/app's copy. That repo pins `1.42.` because orphan
# tags (v2.2.1, v1.75.0) sit ABOVE its deploy line and a plain `sort -V` lets
# them hijack the floor. Here all 126 off-line tags are 0.9.x — strictly BELOW —
# so nothing can hijack anything, and an unconstrained max is both correct and
# identical to what imgver itself does. Pinning a line here would instead BREAK
# the legitimate 1.1.0 series bump imgver exists to allow.
#
# ENV: GH_PAT (or GITHUB_TOKEN) to read the registry floor — the same read
#      imgver does. Without one the scan degrades to git tags alone and SAYS so.
set -euo pipefail

cd "$(dirname "$0")/.."

semver='^[0-9]+\.[0-9]+\.[0-9]+$'

git_max() {
  # Folded in so the check still has an answer on a runner with no token. Safe
  # in the union direction: deploy.yml creates the tag only AFTER the image is
  # verified pullable, so a git tag can never name a version the registry lacks.
  git tag -l | sed 's/^v//' | grep -E "$semver" | sort -V | tail -1 || true
}

cont_max() {
  # The GitHub Packages API, not the registry v2 tags list: an anonymous ghcr
  # pull token can fetch a manifest by name but returns an EMPTY tag list, so a
  # v2 read would silently report "nothing published". Same call, same package,
  # same parse as imgver — one definition of "published", two readers.
  local tok="${GH_PAT:-${GITHUB_TOKEN:-}}"
  [ -n "$tok" ] || { echo "version.sh: no GH_PAT/GITHUB_TOKEN — registry floor NOT read" >&2; return 0; }
  curl -fsSL -H "Authorization: Bearer $tok" \
      -H "Accept: application/vnd.github+json" \
      'https://api.github.com/orgs/hanzoai/packages/container/chat/versions?per_page=100' 2>/dev/null \
    | jq -r '.[].metadata.container.tags[]?' 2>/dev/null \
    | sed 's/^v//' | grep -E "$semver" | sort -V | tail -1 || true
}

published() {
  printf '%s\n%s\n%s\n' "0.0.0" "$(git_max)" "$(cont_max)" \
    | grep -E "$semver" | sort -V | tail -1
}


case "${1:-published}" in
  published) published ;;

  *) echo "usage: scripts/version.sh [published]" >&2; exit 2 ;;
esac
