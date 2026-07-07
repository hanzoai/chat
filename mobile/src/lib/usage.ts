// Usage store wiring for the mobile app.
//
// @hanzo/usage is headless: a UsageStore driven by a host that can read files
// (provider config in ~/.codex, ~/.claude, ~/.hanzo) and make HTTP calls. In
// Tauri we build that host from the fs + http plugins (createTauriHost). In a
// plain browser there is no filesystem, so there is no host — the Usage screen
// shows a connect empty-state instead.

import { UsageStore, allProviders } from '@hanzo/usage'
import { createTauriHost } from '@hanzo/usage/tauri'

/** True when running inside the Tauri webview (vs. a plain browser tab). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Build a UsageStore backed by the Tauri fs/http plugins, or return null when
 * not running under Tauri. Plugin modules are imported dynamically so a browser
 * build never pulls the Tauri APIs into the initial bundle.
 */
export async function createUsageStore(): Promise<UsageStore | null> {
  if (!isTauri()) return null

  const [fs, http, path] = await Promise.all([
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/plugin-http'),
    import('@tauri-apps/api/path'),
  ])

  const host = await createTauriHost({
    fs: {
      readTextFile: (p) => fs.readTextFile(p),
      readDir: (p) => fs.readDir(p).then((es) => es.map((e) => ({ name: e.name }))),
      writeTextFile: (p, contents) => fs.writeTextFile(p, contents),
      mkdir: (p, opts) => fs.mkdir(p, opts),
    },
    fetch: http.fetch,
    homeDir: path.homeDir,
  })

  return new UsageStore({
    host,
    providers: allProviders,
    sourceMode: 'auto',
  })
}
