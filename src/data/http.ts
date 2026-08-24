/**
 * The one way this client speaks to a server.
 *
 * Everything a request needs is decided here once: the bearer rides along,
 * cookies ride along, a JSON body is a JSON body, and a refusal becomes a
 * `Refused` that carries the status and the server's own words. There is no
 * second client and no per-call option object to keep in step — the reason four
 * different fetch styles ended up in the tree it replaces is that each one
 * answered these questions again, slightly differently.
 *
 * # The bearer, and the renewal
 *
 * The credential is Hanzo IAM's access token. This server issues none of its
 * own, so there is nothing here to keep in step with a session cookie — and,
 * more usefully, nothing here that can itself answer 401 and deadlock the queue
 * behind a renewal.
 *
 * A 401 means the token aged out mid-visit, and the answer is at IAM, not here:
 * `session.tsx` installs `onStale` with the SDK's `getValidAccessToken`, which
 * spends the refresh token IAM issued this browser. The renewal is SINGLE
 * FLIGHT — a dozen bootstrap calls expire together, and a dozen refresh grants
 * against one token is how a browser gets itself signed out — and the original
 * request is replayed EXACTLY once. A second failure is an answer, not a race.
 *
 * A visitor holding no bearer at all is not in this story. A guest's 401 is
 * their ordinary experience, there is nothing to renew, and the request simply
 * refuses — `gate.ts` decides whether that deserves a sign-in prompt.
 */

/**
 * A request the server declined.
 *
 * The status and the body travel together because the pair is what identifies
 * the refusal: 402 alone is three different things, and `explain` in `types.ts`
 * needs the code inside the body to tell them apart.
 */
export class Refused extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`${status}`)
    this.name = 'Refused'
    this.status = status
    this.body = body
  }
}

let bearer: string | undefined
let onStale: (() => Promise<string | null>) | null = null
let renewing: Promise<string | null> | null = null

/** Carry this token from now on. `undefined` makes the client anonymous. */
export const setBearer = (token?: string) => {
  bearer = token
}

/** Teach the client how to get a fresh bearer. `session.tsx` is the one caller. */
export const setRenew = (renew: (() => Promise<string | null>) | null) => {
  onStale = renew
}

/** One renewal at a time, whatever asked for it. */
const renew = (): Promise<string | null> => {
  if (!onStale) return Promise.resolve(null)
  if (!renewing) {
    const flight = onStale().catch(() => null)
    renewing = flight
    void flight.finally(() => {
      if (renewing === flight) renewing = null
    })
  }
  return renewing
}

const auth = (headers: Headers) => {
  if (bearer) headers.set('Authorization', `Bearer ${bearer}`)
  else headers.delete('Authorization')
  return headers
}

/**
 * Open a response, with the session on it.
 *
 * This is the whole mechanism; `get`/`post`/… are one line each on top of it.
 * It is exported because a stream is a response too — the composer reads
 * `res.body` for an answer that arrives in pieces, and it must not hand-roll a
 * second copy of the bearer and the renewal to do it.
 */
export const open = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const headers = auth(new Headers(init.headers))
  const send = () => fetch(url, { credentials: 'include', ...init, headers })

  const first = await send()
  if (first.status !== 401 || !onStale || !bearer) return first

  const fresh = await renew()
  if (!fresh) return first

  setBearer(fresh)
  return fetch(url, { credentials: 'include', ...init, headers: auth(new Headers(init.headers)) })
}

/** What came back, or what went wrong — never a `Response` for a caller to unpack. */
const read = async <T>(res: Response): Promise<T> => {
  const type = res.headers.get('content-type') ?? ''
  const body = type.includes('json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '')

  if (!res.ok) throw new Refused(res.status, body)
  return body as T
}

const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body ?? {}),
  headers: { 'Content-Type': 'application/json' },
})

const call = async <T>(url: string, init: RequestInit): Promise<T> => read<T>(await open(url, init))

export const http = {
  get: <T>(url: string): Promise<T> => call<T>(url, { method: 'GET' }),

  post: <T>(url: string, body?: unknown): Promise<T> =>
    call<T>(url, { method: 'POST', ...json(body) }),

  put: <T>(url: string, body?: unknown): Promise<T> => call<T>(url, { method: 'PUT', ...json(body) }),

  patch: <T>(url: string, body?: unknown): Promise<T> =>
    call<T>(url, { method: 'PATCH', ...json(body) }),

  /**
   * DELETE with a body. The conversation routes take one — which of them, and
   * how many — so this is not the odd case it looks like.
   */
  drop: <T>(url: string, body?: unknown): Promise<T> =>
    call<T>(url, { method: 'DELETE', ...(body === undefined ? {} : json(body)) }),

  /**
   * A multipart POST. The Content-Type is deliberately left unset: the browser
   * writes it, and the boundary it invents is part of it, so naming the type by
   * hand produces a body no server can parse.
   */
  form: <T>(url: string, form: FormData): Promise<T> =>
    call<T>(url, { method: 'POST', body: form }),

  /** Bytes, for the one route that answers audio rather than text. */
  bytes: async (url: string, body?: unknown): Promise<ArrayBuffer> => {
    const res = await open(url, { method: 'POST', ...json(body) })
    if (!res.ok) throw new Refused(res.status, await res.text().catch(() => ''))
    return res.arrayBuffer()
  },
}
