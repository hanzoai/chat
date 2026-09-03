/**
 * Where the desktop keeps its session.
 *
 * A refresh token is a standing credential: it outlives the access token it
 * mints and it is the whole session. In `localStorage` it is a plain file under
 * the app's data directory that anything running as this user can read, which
 * is what the web build lives with because a browser offers nothing better.
 * A machine does — its own credential store — and the shell reaches it.
 *
 * `Storage` is synchronous and a keychain is not, so the secrets are read ONCE
 * before anything renders and held in memory after that; a write goes to both.
 * A store that answered null while it was still loading would sign everybody
 * out at launch, which is why `unlock()` is awaited at the mount.
 *
 * Only the SDK's TOKENS come here. It keeps the PKCE verifier in `txStorage`,
 * which is the browser's own store and stays that way — a verifier is spent
 * inside one round trip, so it is not a credential to protect but a value that
 * has to be there when the trip returns.
 *
 * A machine with no keychain gets no vault, and the SDK falls back to the store
 * the web build already uses. That is a rung down, not a pretence: what it must
 * NOT fall back to is a store that answers every call and forgets on exit,
 * which reads as a working keychain until the restart that loses the session.
 */
import { call, shell } from './shell.ts'

/** One entry, holding the whole session: the tokens travel together. */
const NAME = 'session'

const held = new Map<string, string>()

let usable = false

/** Read the machine's store. Answers nothing, and never refuses. */
export const unlock = async (): Promise<void> => {
  if (!shell()) return
  try {
    const kept = await call<string | null>('secret', { name: NAME })
    if (kept) {
      for (const [name, value] of Object.entries(JSON.parse(kept) as Record<string, unknown>)) {
        held.set(name, String(value))
      }
    }
    usable = true
  } catch {
    // No credential store on this machine. The session keeps to the browser's
    // own, exactly as it does on the web.
  }
}

const save = () => {
  void call('keep', { name: NAME, value: JSON.stringify(Object.fromEntries(held)) }).catch(
    () => {
      // The store answered when it was opened and refuses now. What is held
      // still answers, so the session lasts this launch and not the next.
    },
  )
}

/**
 * The machine's store, or nothing when it has none — and nothing is the right
 * answer to give the SDK, whose own default is the browser's store.
 */
export const vault = (): Storage | undefined =>
  usable
    ? {
        get length() {
          return held.size
        },
        key: (at: number) => [...held.keys()][at] ?? null,
        getItem: (name: string) => held.get(name) ?? null,
        setItem: (name: string, value: string) => {
          held.set(name, value)
          save()
        },
        removeItem: (name: string) => {
          held.delete(name)
          save()
        },
        clear: () => {
          held.clear()
          save()
        },
      }
    : undefined
