/**
 * The stream — the ONE client for a turn in flight.
 *
 * Three verbs, and they are three because the server draws the line there: a
 * turn is STARTED with a POST that answers a stream id, HEARD over a GET that
 * carries the frames, and STOPPED with a POST that names the job. Splitting
 * start from listen is what makes a reply survive a reload: the run belongs to
 * the server, not to the socket, so closing the socket does not cancel
 * anything, and reopening it with `resume` gets the catch-up.
 *
 * `open` from `~/data/http` rather than a `fetch` of its own — which also
 * settles the question of the credential. The bearer, the single-flight
 * renewal on a 401 and the cookie policy are decided in one place for the whole
 * client, and a guest simply has no bearer to send: `Bearer undefined` is not
 * the same as no header, and a server reads any bearer as a claim to be
 * somebody and refuses it.
 *
 * `EventSource` is not an option here, for reasons that are all one reason: it
 * carries no bearer, takes no abort signal, and hides the status of a failing
 * response — so a refusal with a real explanation in its body arrives as an
 * anonymous `error` and gets retried five times before the reader is told
 * anything. A `fetch` body is a stream, and reading it is four lines.
 */
import { api } from '~/data/api'
import { http, open } from '~/data/http'
import { explain } from '~/data/types'

import { read, type Frame } from '~/compose/frames'
import type { Payload } from '~/compose/submit'

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
  /** The session was refused, and renewing it did not help. */
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

/**
 * Start a turn. Answers the stream id to listen on.
 *
 * Nothing is retried here, and the refusal is not swallowed: `http` throws a
 * `Refused` carrying the status and the server's own body, which is what tells
 * a lapsed session apart from an exhausted quota apart from a provider that is
 * down. A retry loop around a request that already reached the model is how one
 * question becomes three answers.
 */
export const start = async (endpoint: string, payload: Payload): Promise<string> => {
  const answered = await http.post<{ streamId?: string }>(api.ask.send(endpoint), payload)
  // Accepted, but nothing to listen to. Not a refusal — there is no status to
  // act on, only a turn that went nowhere.
  if (!answered.streamId) throw new Error('The turn was accepted but no stream was started.')
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
 * written. It is set on the first connection only when rejoining a run found in
 * progress, and on every RECONNECTION, because a drop is exactly when frames go
 * missing.
 */
export const listen = (id: string, ear: Ear, o: { resume?: boolean } = {}): (() => void) => {
  const control = new AbortController()
  let tries = 0
  let shut = false

  const end = (why: Ended) => {
    if (shut) return
    shut = true
    control.abort()
    ear.ended?.(why)
  }

  const again = (resume: boolean) => {
    if (shut) return
    if (tries >= TRIES) return end('lost')
    const pause = Math.min(1000 * 2 ** tries, WAIT)
    tries += 1
    setTimeout(() => {
      if (!shut) void hear(resume)
    }, pause)
  }

  const hear = async (resume: boolean) => {
    let res: Response
    try {
      res = await open(api.ask.stream(id, resume), {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: control.signal,
      })
    } catch {
      // A network failure, not an answer. The run is probably still alive.
      return again(true)
    }

    if (res.status === 404) return end('gone')
    // `open` has already spent one renewal on a 401 and replayed the request,
    // so a refusal that reaches here is an answer rather than an expiry.
    if (res.status === 401 || res.status === 403) return end('denied')

    if (!res.ok || !res.body) {
      // A failure the server DESCRIBED is the answer, not a hiccup: say it and
      // stop. Reconnecting through five backoffs first spends half a minute and
      // then reports something vaguer than what arrived at once. A bodyless
      // failure IS a hiccup, and falls through to the reconnect below.
      const body = await res.text().catch(() => '')
      if (body) {
        ear.frame({ kind: 'fault', text: explain(body).text })
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
      if (!shut) return again(true)
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
 * closing frame with `aborted`, and the reply ends the way it would have ended
 * anyway: through the fold, in one place.
 */
export const stop = async (what: {
  streamId?: string
  conversationId?: string
}): Promise<void> => {
  await http.post(api.ask.stop, what)
}

/** The run this conversation already has going, if the server is holding one —
 *  what a freshly loaded tab asks before it settles on showing a resting box. */
export const running = async (conversationId: string): Promise<string | null> => {
  const answered = await http
    .get<{ active?: boolean; streamId?: string }>(api.ask.state(conversationId))
    .catch(() => null)
  return answered?.active === true && answered.streamId ? answered.streamId : null
}
