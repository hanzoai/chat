/**
 * The turn in flight.
 *
 * One verb, streaming decoded `chat.completion.chunk` values from @hanzo/ai.
 */
import type { ChatCompletionChunk, ChatCompletionMessage } from '@hanzo/ai'
import { client, ESTATE } from '../data/origin.ts'
import { explain } from '../data/types.ts'

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
 * Ask, and hear the answer. Returns the way to stop listening.
 */
export const run = (turn: Turn, ear: Ear): (() => void) => {
  const control = new AbortController()
  let shut = false

  const end = (why: Ended, fault?: string) => {
    if (shut) return
    shut = true
    ear.ended(why, fault)
  }

  client(ESTATE)
    .chat.completions
    .create(
      {
        model: turn.model,
        messages: turn.messages,
        stream: true,
      },
      { signal: control.signal },
    )
    .then(async (stream: any) => {
      try {
        for await (const chunk of stream) {
          if (control.signal.aborted) {
            end('stopped')
            return
          }
          ear.chunk(chunk)
        }
        end('done')
      } catch (err: any) {
        end(control.signal.aborted ? 'stopped' : 'failed', explain(err).text)
      }
    })
    .catch(async (err: any) => {
      if (control.signal.aborted) {
        end('stopped')
        return
      }
      end('failed', explain(err).text)
    })

  return () => {
    control.abort()
    end('stopped')
  }
}
