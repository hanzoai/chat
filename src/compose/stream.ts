/**
 * The stream — the ONE client for a turn in flight.
 *
 * Three verbs, and they are three because the server draws the line there: a
 * turn is STARTED with a POST that answers a stream id, HEARD over a GET that
 * carries the frames, and STOPPED with a POST that names the job. Splitting
 * start from listen is what makes a reply survive a reload: the run belongs to
 * the server, not to the socket, so closing the socket does not cancel
 * anything and reopening it with `?resume=true` gets the catch-up.
 *
 * `fetch` rather than `EventSource`, for reasons that are all the same reason:
 * an EventSource cannot carry a bearer, cannot be aborted with a signal, and
 * hides the status of a failing response — so a 402 with a real explanation in
 * its body arrives as an anonymous `error` and gets retried five times before
 * the reader is told anything.
 *
 * NO AUTHORIZATION HEADER FOR A GUEST. `Bearer undefined` is not the same as no
 * header: the server reads any bearer as a claim to be somebody and refuses
 * it, which is a guest locked out of reading back their own reply. The header
 * exists only when there is a token.
 *
 * Every URL here is same-origin and relative. The client is served beside the
 * API, and the dev proxy makes that true on localhost too.
 */
import { read, type Frame } from '~/compose/frames'
import type { Payload } from '~/compose/submit'

/** Where a turn is started. `endpoint` is the route family — `agents`. */
const runs = (endpoint: string) => `/v1/chat/agents/chat/${encodeURIComponent(endpoint)}`
/** Where it is heard. */
const heard = (id: string) => `/v1/chat/agents/chat/stream/${encodeURIComponent(id)}`
/** Where it is called off. */
const HALT = '/v1/chat/agents/chat/abort'

/** How many times a dropped connection is reopened before the reader is told. */
const TRIES = 5
/** The backoff ceiling. Past ~30s a reader has already reloaded. */
const WAIT = 30_000

/** How a stream ended. The shell answers each differently, so it is told which. */
export type Ended =
  /** The run finished, or failed with a reason already delivered as a frame. */
  | 'done'
  /** No such job — it completed or expired while nobody was listening. */
  | 'gone'
  /** The token was refused. Renew it and listen again. */
  | 'denied'
  /** The connection kept dropping. The run may still be alive server-side. */
  | 'lost'
  /** The caller closed it. */
  | 'stopped'

export interface Ear {
  frame: (f: Frame) => void
  /** The socket is live. Raised again on every reconnect. */
  open?: () => void
  ended?: (why: Ended) => void
}

export interface Auth {
  /** A bearer, when there is one. A guest has none, and sends none. */
  token?: string
}

/** The sentence in a refusal, if it carries one. An object where a sentence
 *  was expected is left alone rather than stringified: `[object Object]` is
 *  not an explanation, and offering it as one is worse than saying nothing. */
const said = (body: Record<string, unknown> | string): string | null => {
  if (typeof body === 'string') return body.trim() || null
  for (const key of ['message', 'error', 'detail']) {
    const value = body[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

/**
 * The server refused the turn, and said why.
 *
 * `status` and `body` both travel, because both decide what to do: 401 is a
 * session to renew, 402 with `GUEST_LIMIT` is a quota to name, and everything
 * else is a sentence to show. Swallowing the body and throwing a bare `HTTP
 * 402` is how a paid-route outage became "something went wrong".
 */
export class Refused extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown> | string,
  ) {
    super(said(body) ?? `The server refused this turn (${status}).`)
    this.name = 'Refused'
  }
}

const head = (auth?: Auth, extra?: Record<string, string>): Record<string, string> => ({
  ...extra,
  ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
})

const body = async (res: Response): Promise<Record<string, unknown> | string> => {
  const text = await res.text().catch(() => '')
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : text
  } catch {
    return text
  }
}

/**
 * Start a turn. Answers the stream id to listen on.
 *
 * Nothing is retried here. A failed start has a status the caller acts on, and
 * a retry loop around a request that already reached the model is how one
 * question becomes three answers.
 */
export const start = async (endpoint: string, payload: Payload, auth?: Auth): Promise<string> => {
  const res = await fetch(runs(endpoint), {
    method: 'POST',
    credentials: 'same-origin',
    headers: head(auth, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Refused(res.status, await body(res))
  const answered = (await res.json()) as { streamId?: string }
  if (!answered.streamId) throw new Refused(res.status, 'The server started no stream.')
  return answered.streamId
}

/**
 * Hear a turn. Returns the way to stop listening.
 *
 * Stopping LISTENING is not stopping the RUN — that is `stop()`. Navigating
 * away closes the socket and leaves the model working, which is the whole
 * point of a resumable stream.
 *
 * `resume` asks the server to open with a catch-up of everything already
 * written. It is passed on the first connection only when rejoining a run
 * found in progress; every reconnection sets it, because the drop is exactly
 * when frames go missing.
 */
export const listen = (id: string, ear: Ear, o: Auth & { resume?: boolean } = {}): (() => void) => {
  const control = new AbortController()
  let tries = 0
  let over = false

  const end = (why: Ended) => {
    if (over) return
    over = true
    control.abort()
    ear.ended?.(why)
  }

  const again = (resume: boolean) => {
    if (over) return
    if (tries >= TRIES) return end('lost')
    const pause = Math.min(1000 * 2 ** tries, WAIT)
    tries += 1
    setTimeout(() => {
      if (!over) void hear(resume)
    }, pause)
  }

  const hear = async (resume: boolean) => {
    let res: Response
    try {
      res = await fetch(heard(id) + (resume ? '?resume=true' : ''), {
        method: 'GET',
        credentials: 'same-origin',
        headers: head(o, { Accept: 'text/event-stream' }),
        signal: control.signal,
      })
    } catch {
      // A network failure, not an answer. The run is probably still alive.
      return again(true)
    }

    if (res.status === 404) return end('gone')
    if (res.status === 401 || res.status === 403) return end('denied')

    if (!res.ok || !res.body) {
      // A failure the server DESCRIBED is the answer, not a hiccup: surface it
      // and stop. Reconnecting through five backoffs first spends half a
      // minute and then reports something vaguer than what arrived at once.
      // A bodyless failure IS a hiccup, and goes to the reconnect below.
      const explained = said(await body(res))
      if (explained) {
        ear.frame({ kind: 'fault', text: explained })
        return end('done')
      }
      return again(true)
    }

    ear.open?.()
    tries = 0

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let rest = ''
    let closed = false
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const cut = read(decoder.decode(value, { stream: true }), rest)
        rest = cut.rest
        for (const f of cut.list) {
          ear.frame(f)
          if (f.kind === 'close') closed = true
        }
        if (closed) break
      }
    } catch {
      if (!over) return again(true)
      return
    }

    if (closed) return end('done')
    // The body ended without a closing frame: the connection dropped mid-run.
    return again(true)
  }

  void hear(o.resume === true)
  return () => end('stopped')
}

/**
 * Stop the run itself.
 *
 * Either name works — the server finds the job from whichever it is given — and
 * the conversation id is the one a reader always has, so a stop still lands
 * when the stream id was lost to a reload.
 *
 * The stop is not the end of the stream. The server answers by writing a
 * closing frame with `aborted`, and the reply ends the same way it would have
 * ended anyway: through the fold, in one place.
 */
export const stop = async (
  what: { streamId?: string; conversationId?: string },
  auth?: Auth,
): Promise<void> => {
  await fetch(HALT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: head(auth, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(what),
  })
}

/** A run already in flight for this conversation, if the server is holding one
 *  — what a freshly loaded tab asks before it decides to show a resting box. */
export const inFlight = async (
  conversationId: string,
  auth?: Auth,
): Promise<{ streamId: string } | null> => {
  const res = await fetch(`/v1/chat/agents/chat/status/${encodeURIComponent(conversationId)}`, {
    credentials: 'same-origin',
    headers: head(auth),
  })
  if (!res.ok) return null
  const said = (await res.json()) as { active?: boolean; streamId?: string }
  return said.active === true && said.streamId ? { streamId: said.streamId } : null
}
