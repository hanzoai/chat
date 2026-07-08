// Local user settings, persisted to localStorage (survives reloads and, in the
// Tauri webview, app restarts). Mirrors the auth token store — a tiny typed
// helper so screens don't touch localStorage keys directly.

const SMART_ROUTING_KEY = 'hanzo.chat.smartRouting'

/**
 * Smart-routing user OVERRIDE. `null` (never touched) === follow the org's
 * server-driven default; `true`/`false` === an explicit user choice that wins.
 * The effective state is resolved via resolveSmartRouting (lib/routing); when
 * on, chat requests send model "auto" instead of the configured VITE_CHAT_MODEL,
 * letting the gateway route each prompt to the best/cheapest capable model.
 */
export function getSmartRoutingPref(): boolean | null {
  try {
    const raw = localStorage.getItem(SMART_ROUTING_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

export function setSmartRoutingPref(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_ROUTING_KEY, enabled ? 'true' : 'false')
  } catch {
    // no-op: private-mode webview without storage
  }
}
