/**
 * A reply, assembled from OpenAI chunks.
 *
 * A reply is not sent; it is ASSEMBLED, and this file is the whole of that
 * assembly. Nothing here touches a socket, a DOM or React — the SDK yields
 * `chat.completion.chunk` values and this folds them — so the entire protocol is
 * assertable in Node against an array of literals.
 *
 * There is no frame vocabulary any more, and that is the point. The tree this
 * replaces decoded an eight-variant union out of one server's SSE payloads:
 * `on_run_step`, `on_message_delta`, `on_reasoning_delta`, `on_run_step_delta`,
 * `on_run_step_completed`, `sync`/`resumeState`, `created`, `final`. None of
 * those exist on `/v1/chat/completions`, which speaks the OpenAI wire, and the
 * SDK has already parsed it. What is left is the one thing no shared package can
 * do: decide what a delta MEANS to the reply on screen.
 *
 * ONE ADDRESSING RULE. A chunk names no slot — OpenAI has no notion of where a
 * piece of an answer goes — so a slot is claimed by CHANNEL, on first sight, in
 * arrival order. Prose is one channel, reasoning is another, and each tool call
 * is its own, keyed by the index OpenAI does give. That is what keeps reasoning
 * above the answer it reasoned toward instead of interleaved through it, without
 * anything here knowing which order a given model emits them in.
 */
import type { ChatCompletionChunk } from '@hanzo/ai'
import type { Ran } from '@hanzo/ui/chat'

/** Whether a thing is still going, and how it stopped. The reply and each tool
 *  in it answer the same four ways, in the same words the shell renders — one
 *  vocabulary, so nothing has to be translated on the way to the screen. */
export type { Ran }

/**
 * One piece of a reply.
 *
 * Prose, private reasoning, a tool that ran, a picture, or a refusal. Five
 * kinds, and the renderer picks a component per kind — which is the whole
 * reason the union is closed rather than a bag of server types.
 *
 * `image` survives the move with no producer on this wire: chat completions
 * answer text. It is kept because the renderer already draws it and a stored
 * thread can carry one, not as a promise that a stream will make one.
 */
export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'think'; text: string }
  | { kind: 'tool'; name: string; args: string; output: string; status: Ran }
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'fault'; text: string }

/**
 * A reply, mid-assembly.
 *
 * `slots` is sparse and keyed by claim order; `at` says which slot a channel
 * claimed. Two maps rather than a list because a delta arrives for a channel,
 * not for a position, and looking a position up by scanning is how a fold starts
 * depending on how many pieces came before it.
 */
export interface Reply {
  /** The completion's id, once a chunk has carried one. */
  id: string
  /** The turn that asked for it. */
  askedBy: string
  /** Which model answered, as the wire reported it. */
  model: string
  slots: Record<number, Part>
  /** Channel → the slot it claimed. `text`, `think`, `tool:0`, `tool:1`… */
  at: Record<string, number>
  status: Ran
}

/** An empty reply, waiting for its first chunk. */
export const opening = (askedBy: string): Reply => ({
  id: '',
  askedBy,
  model: '',
  slots: {},
  at: {},
  status: 'running',
})

/** The slots, in claim order — what a renderer walks. */
export const parts = (reply: Reply): Part[] =>
  Object.keys(reply.slots)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => reply.slots[i])

/** Everything the reply says, as one string. The clipboard and the thread's own
 *  plain-text copy both want this, and neither wants to know about slots. */
export const spoken = (reply: Reply): string =>
  parts(reply)
    .filter((p) => p.kind === 'text')
    .map((p) => p.text)
    .join('')

/**
 * The slot a channel owns, claiming the next one if it owns none yet.
 *
 * Answers the reply as well as the index because claiming is a write: returning
 * only the index would leave the caller to remember to record it, and the one
 * that forgot appended every delta to slot `undefined`.
 */
const claim = (reply: Reply, channel: string): [Reply, number] => {
  const held = reply.at[channel]
  if (held != null) return [reply, held]
  const at = Object.keys(reply.slots).length
  return [{ ...reply, at: { ...reply.at, [channel]: at } }, at]
}

const write = (reply: Reply, at: number, part: Part): Reply => ({
  ...reply,
  slots: { ...reply.slots, [at]: part },
})

/** Extend the prose or the reasoning in a channel's slot. */
const extend = (reply: Reply, channel: 'text' | 'think', text: string): Reply => {
  if (!text) return reply
  const [claimed, at] = claim(reply, channel)
  const held = claimed.slots[at]
  const before = held?.kind === channel ? held.text : ''
  return write(claimed, at, { kind: channel, text: before + text })
}

const asTool = (part: Part | undefined): Extract<Part, { kind: 'tool' }> =>
  part?.kind === 'tool' ? part : { kind: 'tool', name: '', args: '', output: '', status: 'running' }

/**
 * Reasoning, which the typed delta does not declare.
 *
 * Providers that expose a model's private reasoning put it beside `content`
 * under a name they each chose — `reasoning_content` is DeepSeek's and the one
 * the gateway relays, `reasoning` is the other spelling in the wild. Neither is
 * in `ChatCompletionChunkDelta`, so it is read off the object rather than the
 * type. A model that emits none simply never takes this branch.
 */
const thought = (delta: object): string => {
  const d = delta as Record<string, unknown>
  const said = d.reasoning_content ?? d.reasoning
  return typeof said === 'string' ? said : ''
}

/**
 * How a completion stopped, in the vocabulary the shell renders.
 *
 * `stop` and `tool_calls` are both a finished answer. `length` is the model
 * running out of room, which is a truncation rather than a failure, and reads as
 * the same unfinished state a reader's own stop produces — the answer is
 * incomplete either way, and the thread says so the same way.
 */
const how = (reason: string): Ran => (reason === 'length' ? 'cancelled' : 'done')

/**
 * One chunk onto a reply. Pure — a new reply, every time.
 *
 * Only `choices[0]` is read. `n > 1` is never asked for by this client, and a
 * second choice folded into the same slots would interleave two answers into one
 * paragraph.
 */
export const fold = (reply: Reply, chunk: ChatCompletionChunk): Reply => {
  const next = {
    ...reply,
    id: reply.id || chunk.id || '',
    model: reply.model || chunk.model || '',
  }

  const choice = chunk.choices?.[0]
  if (!choice) return next

  let held = next
  const delta = choice.delta

  if (delta) {
    held = extend(held, 'think', thought(delta))
    held = extend(held, 'text', typeof delta.content === 'string' ? delta.content : '')

    for (const call of delta.tool_calls ?? []) {
      const [claimed, at] = claim(held, `tool:${call.index}`)
      const was = asTool(claimed.slots[at])
      held = write(claimed, at, {
        ...was,
        name: call.function?.name || was.name,
        args: was.args + (call.function?.arguments ?? ''),
      })
    }
  }

  if (choice.finish_reason == null) return held

  // A finish reason ends the reply AND every tool still shown as running: the
  // wire reports no per-call completion, so a tool left running paints a
  // spinner beside a finished answer forever.
  const settled = Object.fromEntries(
    Object.entries(held.slots).map(([at, part]) => [
      at,
      part.kind === 'tool' && part.status === 'running' ? { ...part, status: 'done' as Ran } : part,
    ]),
  )
  return { ...held, slots: settled, status: how(choice.finish_reason) }
}

/**
 * The reply, failed.
 *
 * A refusal is a PART rather than a status alone, because it is the answer to
 * the question above it and has to be readable in place. It takes the slot after
 * whatever arrived before it, so a stream that produced two sentences and then
 * died shows both and then says what happened.
 */
export const faulted = (reply: Reply, text: string): Reply => ({
  ...write(reply, Object.keys(reply.slots).length, { kind: 'fault', text }),
  status: 'error',
})

/** The reply, ended by the reader rather than by the model. */
export const stopped = (reply: Reply): Reply => ({ ...reply, status: 'cancelled' })
