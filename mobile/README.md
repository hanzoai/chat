# Hanzo AI — mobile app

A mobile-first [Tauri v2](https://tauri.app) app (Rust shell) with a
React 19 + Vite + TypeScript webview, styled with [`@hanzo/gui`](https://www.npmjs.com/package/@hanzo/gui)
(a Tamagui fork). It talks to the Hanzo chat backend (this repo's LibreChat
fork) and shows local AI-provider usage via [`@hanzo/usage`](../../usage).

Self-contained: **not** part of the chat pnpm workspace. Install and build from
inside `mobile/`.

## Screens

| Screen   | What it does                                                         | Backend |
|----------|---------------------------------------------------------------------|---------|
| Chat     | Message list + composer                                             | `POST /api/agents/v1/chat/completions` (OpenAI-compatible) |
| Sessions | Recent conversations                                               | `GET /api/convos` |
| Usage    | Provider cards (Hanzo / Codex / Claude); connect empty-state on web | `@hanzo/usage` reads `~/.codex`, `~/.claude`, `~/.hanzo` |

Navigation is a bottom tab bar backed by plain React state — no router library.

## Configuration

Copy `.env.example` to `.env`:

- `VITE_CHAT_API_URL` — backend base URL (default `https://hanzo.chat`)
- `VITE_CHAT_MODEL` — agent id / model for completions (default `hanzo`)
- `VITE_CHAT_TOKEN` — optional bearer token; if unset, the app shows a
  paste-a-token screen and stores it in `localStorage`.

> **Auth is a placeholder.** The token flow is a stopgap; the real login is
> Hanzo IAM (hanzo.id) OIDC — see the `TODO(iam)` notes in `src/lib/auth.ts`.

## Develop

```sh
npm install
npm run dev        # web-only, http://localhost:1420
npm run build      # type-check + vite build -> dist/

# Desktop shell (needs the Rust toolchain + Tauri CLI):
npm run tauri dev
npm run tauri build
```

## Mobile targets

The mobile toolchains are **not** initialized in this repo (they generate
platform projects under `src-tauri/gen/`, which is git-ignored). Initialize them
locally when you build for a device:

```sh
# iOS (macOS + Xcode required)
cargo tauri ios init
cargo tauri ios dev

# Android (Android Studio + NDK required)
cargo tauri android init
cargo tauri android dev
```

`#[cfg_attr(mobile, tauri::mobile_entry_point)]` in `src-tauri/src/lib.rs` is the
shared entry the generated iOS/Android launchers call.

## Rust: on-device AI seams

Two cargo features stage on-device AI and stay **OFF by default** so the default
build is dependency-light and `cargo check` is fast:

- `engine` — local inference via [hanzoai/engine](https://github.com/hanzoai/engine)
- `node` — device registration / mesh via [hanzoai/node](https://github.com/hanzoai/node)

The Tauri commands `engine_status` and `device_register` exist in every build;
with the features off they return `"not built with engine"` / `"not built with
node"`. See `src-tauri/src/ai/mod.rs`.

```sh
cargo check                          # default, no AI deps
cargo check --features engine,node   # once the crates are wired in
```

## Capabilities (scoped)

`src-tauri/capabilities/default.json` grants:

- **fs** read on `$HOME/.codex`, `$HOME/.claude`, `$HOME/.hanzo` (usage config);
  write/mkdir limited to `$HOME/.hanzo`.
- **http** to `chatgpt.com`, `api.anthropic.com`, `api.hanzo.ai`, `claude.ai`,
  and the chat backend origin `hanzo.chat`.
