/**
 * The turn in flight.
 *
 * One verb, where there were three. The tree this replaces started a turn with a
 * POST that answered a stream id, HEARD it over a separate GET, and STOPPED it
 * with a third call naming the job — because that server ran the model behind a
 * job it owned, so a reply outlived the socket and a reload could rejoin it.
 *
 * `/v1/chat/completions` is not that server. A completion IS its response: there
 * is no job to name, nothing to rejoin, and closing the stream ends the work.
 * So resumption is gone, the reconnect-with-backoff is gone, and stopping is
 * `AbortController` rather than a request. That is a real loss of behaviour —
 * an answer no longer survives a reload — and it is stated in `LLM.md` rather
 * than hidden behind a resume that would silently do nothing.
 *
 * The SSE decode is gone too, and it did not move here: `parseSSE` used to be
 * called in this file over `fetch`'s body. The SDK does both now, and yields
 * decoded `chat.completion.chunk` values, so the blank-line boundary, the split
 * event, CRLF and the multi-line `data:` are answered once for the estate rather
 * than once more here.
 */
import type { ChatCompletionChunk, ChatCompletionMessage } from '@hanzo/ai'

import { ai } from '~/data/ai'

/** How a turn ended. The shell answers each differently, so it is told which. */
export type Ended =
  /** The model finished, or stopped for a reason already folded in. */
  | 'done'
  /** The session was refused, and the SDK's own retry did not help. */
  | 'denied'
  /** It failed, and `fault` carries what to say. */
  | 'failed'
  /** The reader closed it. */
  | 'stopped'

export interface Ear {
  chunk: (c: ChatCompletionChunk) => void
  ended: (why: Ended, fault?: string) => void
}

export interface Turn {
  model: string
  messages: ChatCompletionMessage[]
}

/**
 * What a refusal says.
 *
 * The SDK throws its own errors carrying the server's status and body; a network
 * failure throws a `TypeError` with nothing useful in it. Both reach a reader,
 * so both get a sentence — and the status is read where there is one, because
 * 401 is a session question and everything else is not.
 */
const status = (error: unknown): number | null => {
  const e = error as { status?: unknown; statusCode?: unknown }
  const said = e?.status ?? e?.statusCode
  return typeof said === 'number' ? said : null
}

const said = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'The answer could not be reached.'

/**
 * Ask, and hear the answer. Returns the way to stop listening.
 *
 * Stopping here DOES end the run — see the note above. The abort propagates
 * into the SDK's fetch, the connection closes, and the model stops being paid
 * for.
 */
export const run = (turn: Turn, ear: Ear): (() => void) => {
  const control = new AbortController()
  let shut = false

  const end = (why: Ended, fault?: string) => {
    if (shut) return
    shut = true
    ear.ended(why, fault)
  }

  void (async () => {
    try {
      const stream = await ai().chat.completions.create(
        { model: turn.model, messages: turn.messages, stream: true },
        { signal: control.signal },
      )

      for await (const chunk of stream) {
        if (shut) return
        ear.chunk(chunk)
      }

      end('done')
    } catch (error) {
      // The reader's own abort surfaces as a throw. It is not a failure, and it
      // has already been reported by the caller that asked for it.
      if (control.signal.aborted) return end('stopped')
      if (status(error) === 401) return end('denied')
      end('failed', said(error))
    }
  })()

  return () => {
    if (shut) return
    control.abort()
    end('stopped')
  }
}
