// Local user settings, persisted to localStorage (survives reloads and, in the
// Tauri webview, app restarts). Mirrors the auth token store — a tiny typed
// helper so screens don't touch localStorage keys directly.

const SMART_ROUTING_KEY = 'hanzo.chat.smartRouting'

/**
 * Smart routing: when on, chat requests send model "auto" instead of the
 * configured VITE_CHAT_MODEL, letting the gateway route each prompt to the
 * best/cheapest capable model (billed as whatever served it). Off by default.
 */
export function getSmartRouting(): boolean {
  try {
    return localStorage.getItem(SMART_ROUTING_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSmartRouting(enabled: boolean): void {
  try {
    localStorage.setItem(SMART_ROUTING_KEY, enabled ? 'true' : 'false')
  } catch {
    // no-op: private-mode webview without storage
  }
}
