// Bearer-token auth for the chat backend.
//
// Precedence: a build-time VITE_CHAT_TOKEN (handy for local dev / CI) wins;
// otherwise we use whatever the user pasted into the token screen, persisted in
// localStorage. The pasted token survives reloads and (in the Tauri webview)
// app restarts.
//
// TODO(iam): replace the paste flow with a real Hanzo IAM (hanzo.id) OIDC login
// — open the IAM authorize URL in the system browser / an in-app auth webview,
// capture the callback, and store the returned access token here. The rest of
// the app already reads the token through getToken(), so only this module
// changes.

const STORAGE_KEY = 'hanzo.chat.token'

const envToken = (import.meta.env.VITE_CHAT_TOKEN as string | undefined)?.trim()

export function getToken(): string | undefined {
  if (envToken) return envToken
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token.trim())
  } catch {
    // no-op: private-mode webview without storage; token lives for this session
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}

export function hasToken(): boolean {
  return Boolean(getToken())
}
