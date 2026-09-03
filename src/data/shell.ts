/**
 * The desktop, from inside it.
 *
 * One way in each direction, and neither is invented here. `call` asks the
 * shell to do something, over the IPC object Tauri stamps on `window` before
 * the first script runs — which is also what makes `shell()` answerable without
 * a request and without a dependency, so the web build never asks the machine
 * for anything it cannot have. The other direction is a NAVIGATION: the shell
 * says where the app should be by rewriting the document's address, which is
 * the same thing a link does and needs nothing from this file.
 *
 * Every command this app can name is registered in `src-tauri/src/main.rs`.
 */

type Ipc = {
  invoke: (command: string, args?: unknown) => Promise<unknown>
}

const ipc = (): Ipc | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window as { __TAURI_INTERNALS__?: Ipc }).__TAURI_INTERNALS__

/** True in the desktop shell. */
export const shell = () => Boolean(ipc())

/** Ask the shell. Rejects with the sentence the command refused with. */
export const call = <T>(command: string, args: Record<string, unknown> = {}): Promise<T> => {
  const there = ipc()
  if (!there) return Promise.reject(new Error('there is no shell here'))
  return there.invoke(command, args) as Promise<T>
}

/**
 * Hand a URL to the browser.
 *
 * Where a sign-in goes, and it goes OUT: the visitor's session is in their
 * browser, and an issuer's login screen inside an app's own webview is a
 * credential prompt with no address bar to check.
 */
export const open = (url: string) => call('plugin:opener|open_url', { url })

/**
 * Send somebody to a URL, wherever this is running.
 *
 * The system browser in the desktop, this document on the web. Not a popup: a
 * consent URL is minted by a round trip, so `window.open` would fire after the
 * click that asked for it and a blocker would eat it — silently, which is the
 * worst way for a button to fail.
 *
 * Both trips out of this app come through here — the issuer's, which returns,
 * and a connector's consent, which lands on the console and does not.
 */
export const visit = (url: string) => {
  if (shell()) void open(url)
  else window.location.assign(url)
}

/** A local service, as the shell reports it. */
export interface Service {
  name: string
  /** This app started it, so this app can stop it. */
  own: boolean
  /** It answers. */
  up: boolean
  /** Where it answers. The shell states the ports; nothing here writes one. */
  at: string
}

/** What this machine is running. */
export const services = () => call<Service[]>('status')
