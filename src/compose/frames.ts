/**
 * The wire a reply arrives on, as values.
 *
 * A reply is not sent; it is ASSEMBLED, frame by frame, and this file is the
 * whole of that assembly: what a frame is, how one is recognised, and what it
 * does to the reply so far. Nothing here touches a socket, a DOM or React, so
 * the entire protocol — a resumed stream, an aborted one, a tool that streams
 * its arguments before it runs — is assertable in Node against a string.
 *
 * `stream.ts` supplies bytes and nothing else.
 *
 * ONE ADDRESSING RULE, and it is the decomplection this file exists for. The
 * server addresses every piece of a reply by INDEX — a slot in the reply's
 * content — and it addresses a slot two ways: directly (`index`), or through
 * the id of the run step that owns it. So a reply carries `slots` (what is at
 * each index) and `at` (which index a step id names), and every frame reduces
 * to writing one slot. The eight-handler tangle this replaces kept four
 * mutable maps in refs to say the same thing, which is why a delta that
 * overtook its step lost its text.
 */
import type { Ran } from '@hanzo/ui/chat'

/** How a step ended, in the shell's own vocabulary. Re-exported so a reader of
 *  a reply never has to know it came from the component library. */
export type { Ran }

/**
 * One piece of a reply.
 *
 * Prose, private reasoning, a tool that ran, a picture, or a refusal. Five
 * kinds, and the renderer picks a component per kind — which is the whole
 * reason the union is closed rather than a bag of server types.
 */
export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'think'; text: string }
  | { kind: 'tool'; name: string; args: string; output: string; status: Ran }
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'fault'; text: string }

/** Something the run produced beside its prose — a generated file, a memory
 *  write, an artifact. Opaque on purpose: the server owns this vocabulary and
 *  a closed copy of it here would go stale silently. */
export interface Attachment {
  messageId: string
  type?: string
  filename?: string
  filepath?: string
  [key: string]: unknown
}

/**
 * A reply, mid-assembly.
 *
 * `slots` is sparse and keyed by the server's index, so a frame never has to
 * know how many parts arrived before it — which is what makes the fold
 * order-independent and a resume a plain overwrite.
 */
export interface Reply {
  /** The server's id for this reply, once it has named one. */
  id: string
  /** The turn that asked for it. */
  askedBy: string
  conversationId: string | null
  slots: Record<number, Part>
  /** Run-step id → the slot it writes to. */
  at: Record<string, number>
  attachments: Attachment[]
  status: Ran
  /** The conversation's title, when the server settles on one. */
  title?: string
}

/** The frames. Seven, and every one of them names a slot or ends the run. */
export type Frame =
  /** The server accepted the turn and minted its real ids. */
  | { kind: 'open'; askedBy: string; conversationId: string | null }
  /** A run step opened and claimed a slot. */
  | { kind: 'slot'; step: string; at: number; tool?: string }
  /** Text for the slot a step owns. `think` is the model's private reasoning. */
  | { kind: 'delta'; step: string; text: string; think: boolean }
  /** A tool's arguments, or its result. */
  | { kind: 'tool'; step: string; name?: string; args?: string; output?: string; status?: Ran }
  /** A whole part, at an index the server gave outright. */
  | { kind: 'part'; at: number; part: Part }
  /** Something the run produced beside its prose. */
  | { kind: 'file'; file: Attachment }
  /** The catch-up a rejoined stream opens with. Replaces what is there. */
  | { kind: 'resume'; id?: string; parts: Part[] }
  /** It is over — one way or the other. */
  | { kind: 'close'; aborted: boolean; conversationId: string | null; title?: string; reply?: Part[]; id?: string }
  /** It failed, and this is what to say about it. */
  | { kind: 'fault'; text: string }

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const bag = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

/**
 * A server content part → one of ours.
 *
 * The server spells a part two ways for the same thing — `{text: 'hi'}` while
 * streaming, `{text: {value: 'hi'}}` once stored — so both are read here rather
 * than at four call sites. An unknown type yields nothing: a slot with no
 * picture is better than a box saying the server said something.
 */
export const partOf = (raw: unknown): Part | null => {
  const p = bag(raw)
  const type = str(p.type)
  const inner = bag(p[type])
  const value = (key: string): string => {
    const direct = p[type]
    if (typeof direct === 'string') return direct
    return str(inner[key])
  }
  switch (type) {
    case 'text':
    case 'text_delta':
      return { kind: 'text', text: value('value') }
    case 'think':
      return { kind: 'think', text: value('value') }
    case 'tool_call': {
      const done = num(inner.progress) >= 1 || inner.output != null
      return {
        kind: 'tool',
        name: str(inner.name),
        args: typeof inner.args === 'string' ? inner.args : JSON.stringify(inner.args ?? ''),
        output: str(inner.output),
        status: done ? 'done' : 'running',
      }
    }
    case 'image_file':
      return { kind: 'image', url: str(inner.filepath), alt: str(inner.filename) }
    case 'image_url':
      // No name travels with a URL part, and `detail` is the fetch quality, not
      // a description — spelling it into `alt` would read a picture out as
      // "high" to somebody who cannot see it.
      return { kind: 'image', url: str(inner.url), alt: '' }
    case 'error':
      return { kind: 'fault', text: value('value') }
    default:
      return null
  }
}

const partsOf = (raw: unknown): Part[] =>
  (Array.isArray(raw) ? raw : []).map(partOf).filter((p): p is Part => p !== null)

/** The text a step's delta carries, on either of the two shapes the server
 *  sends it in (`delta.content` is a part, or an array of one). */
const deltaText = (delta: unknown): { text: string; think: boolean } => {
  const d = bag(delta)
  const content = Array.isArray(d.content) ? d.content[0] : d.content
  const part = partOf(content)
  if (part?.kind === 'text') return { text: part.text, think: false }
  if (part?.kind === 'think') return { text: part.text, think: true }
  return { text: '', think: false }
}

/**
 * One `data:` payload → one frame.
 *
 * The order is the server's own precedence and is load-bearing: `final`
 * carries a `conversation` that also looks like a message, and a step event
 * carries a `data` that also carries a `type`. Reading the most specific key
 * first is what keeps a close from being mistaken for a part.
 *
 * Anything unrecognised is `null` — a stream stays live through a frame this
 * client has not learned yet, which is how a server can add one.
 */
export const frame = (raw: string): Frame | null => {
  const text = raw.trim()
  if (!text || text === '[DONE]') return null
  let d: Record<string, unknown>
  try {
    d = bag(JSON.parse(text))
  } catch {
    return null
  }

  if (d.final != null) {
    const convo = bag(d.conversation)
    const reply = bag(d.responseMessage)
    return {
      kind: 'close',
      aborted: d.aborted === true,
      conversationId: typeof convo.conversationId === 'string' ? convo.conversationId : null,
      title: typeof convo.title === 'string' ? convo.title : undefined,
      reply: reply.content != null ? partsOf(reply.content) : undefined,
      id: typeof reply.messageId === 'string' ? reply.messageId : undefined,
    }
  }

  if (d.error != null) {
    return { kind: 'fault', text: typeof d.error === 'string' ? d.error : JSON.stringify(d.error) }
  }

  if (d.created != null) {
    const m = bag(d.message)
    return {
      kind: 'open',
      askedBy: str(m.messageId),
      conversationId: typeof m.conversationId === 'string' ? m.conversationId : null,
    }
  }

  if (d.sync != null) {
    const state = bag(d.resumeState)
    return {
      kind: 'resume',
      id: typeof state.responseMessageId === 'string' ? state.responseMessageId : undefined,
      parts: partsOf(state.aggregatedContent),
    }
  }

  if (d.event === 'attachment') {
    const file = bag(d.data)
    return { kind: 'file', file: { ...file, messageId: str(file.messageId) } }
  }

  if (typeof d.event === 'string') {
    const body = bag(d.data)
    switch (d.event) {
      case 'on_run_step': {
        const calls = Array.isArray(body.tool_calls) ? body.tool_calls : []
        return {
          kind: 'slot',
          step: str(body.id),
          at: num(body.index),
          tool: calls.length > 0 ? str(bag(calls[0]).name) : undefined,
        }
      }
      case 'on_message_delta':
      case 'on_reasoning_delta': {
        const { text: t, think } = deltaText(body.delta)
        return {
          kind: 'delta',
          step: str(body.id),
          text: t,
          think: think || d.event === 'on_reasoning_delta',
        }
      }
      case 'on_run_step_delta': {
        const calls = bag(body.delta).tool_calls
        const call = bag(Array.isArray(calls) ? calls[0] : undefined)
        return {
          kind: 'tool',
          step: str(body.id),
          name: str(call.name) || undefined,
          args: typeof call.args === 'string' ? call.args : undefined,
        }
      }
      case 'on_run_step_completed': {
        const result = bag(body.result)
        const call = bag(result.tool_call)
        return {
          kind: 'tool',
          step: str(result.id),
          name: str(call.name) || undefined,
          output: str(call.output),
          status: 'done',
        }
      }
      default:
        return null
    }
  }

  if (typeof d.type === 'string') {
    const part = partOf(d)
    return part ? { kind: 'part', at: num(d.index), part } : null
  }

  if (d.message != null) {
    const body = typeof d.text === 'string' ? d.text : str(d.response)
    return { kind: 'part', at: 0, part: { kind: 'text', text: body } }
  }

  return null
}

/**
 * Bytes → frames.
 *
 * SSE separates frames with a blank line, so the last piece of any chunk is
 * usually half a frame; it is handed back as `rest` and prefixed onto the next
 * chunk. Dropping it instead is how a long reply loses a word every few
 * kilobytes — invisibly, since the JSON that survives still parses.
 */
export const read = (chunk: string, rest = ''): { list: Frame[]; rest: string } => {
  const blocks = (rest + chunk).split('\n\n')
  const tail = blocks.pop() ?? ''
  const list: Frame[] = []
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue
      const f = frame(line.slice(5))
      if (f) list.push(f)
    }
  }
  return { list, rest: tail }
}

/** An empty reply, waiting for its first frame. */
export const opening = (askedBy: string): Reply => ({
  id: '',
  askedBy,
  conversationId: null,
  slots: {},
  at: {},
  attachments: [],
  status: 'running',
})

/** The slots, in index order — what a renderer walks. */
export const parts = (reply: Reply): Part[] =>
  Object.keys(reply.slots)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => reply.slots[i])

/** Everything the reply says, as one string. The title generator and the
 *  clipboard both want this, and neither wants to know about slots. */
export const spoken = (reply: Reply): string =>
  parts(reply)
    .filter((p) => p.kind === 'text')
    .map((p) => p.text)
    .join('')

const write = (reply: Reply, at: number, part: Part): Reply => ({
  ...reply,
  slots: { ...reply.slots, [at]: part },
})

/** Extend the text already in a slot, whatever kind it is. */
const extend = (reply: Reply, at: number, text: string, think: boolean): Reply => {
  const kind = think ? 'think' : 'text'
  const held = reply.slots[at]
  const before = held?.kind === kind ? held.text : ''
  return write(reply, at, { kind, text: before + text })
}

const asTool = (part: Part | undefined): Extract<Part, { kind: 'tool' }> =>
  part?.kind === 'tool' ? part : { kind: 'tool', name: '', args: '', output: '', status: 'running' }

const slotsOf = (list: Part[]): Record<number, Part> =>
  Object.fromEntries(list.map((p, i) => [i, p]))

/**
 * One frame onto a reply. Pure — a new reply, every time.
 *
 * A frame naming a step nobody opened is DROPPED rather than guessed at. The
 * server can emit a delta before the step that owns it (they race), and the
 * step arrives a moment later carrying the same text; inventing a slot for the
 * early one printed the sentence twice.
 */
export const fold = (reply: Reply, f: Frame): Reply => {
  switch (f.kind) {
    case 'open':
      return { ...reply, askedBy: f.askedBy || reply.askedBy, conversationId: f.conversationId }

    case 'slot': {
      const held = reply.slots[f.at]
      // A step that re-opens a slot claims it again but never empties it: the
      // server re-sends a run step on a reconnect, and replacing what is there
      // would delete the sentence the reader is looking at.
      const opened: Part =
        f.tool != null
          ? (held?.kind === 'tool'
              ? held
              : { kind: 'tool', name: f.tool, args: '', output: '', status: 'running' })
          : (held ?? { kind: 'text', text: '' })
      return { ...write(reply, f.at, opened), at: { ...reply.at, [f.step]: f.at } }
    }

    case 'delta': {
      const at = reply.at[f.step]
      if (at == null || !f.text) return reply
      return extend(reply, at, f.text, f.think)
    }

    case 'tool': {
      const at = reply.at[f.step]
      if (at == null) return reply
      const held = asTool(reply.slots[at])
      return write(reply, at, {
        ...held,
        name: f.name ?? held.name,
        args: held.args + (f.args ?? ''),
        output: f.output ?? held.output,
        status: f.status ?? held.status,
      })
    }

    case 'part':
      return write(reply, f.at, f.part)

    case 'file':
      return { ...reply, attachments: [...reply.attachments, f.file] }

    case 'resume':
      return {
        ...reply,
        id: f.id ?? reply.id,
        // The catch-up is the server's whole account of the reply so far, so it
        // REPLACES rather than merges: a rejoin that appended printed every
        // sentence the reader had already seen a second time.
        slots: slotsOf(f.parts),
        at: {},
        status: 'running',
      }

    case 'close':
      return {
        ...reply,
        id: f.id ?? reply.id,
        conversationId: f.conversationId ?? reply.conversationId,
        title: f.title ?? reply.title,
        slots: f.reply != null && f.reply.length > 0 ? slotsOf(f.reply) : reply.slots,
        status: f.aborted ? 'cancelled' : 'done',
      }

    case 'fault': {
      const at = Object.keys(reply.slots).length
      return { ...write(reply, at, { kind: 'fault', text: f.text }), status: 'error' }
    }
  }
}

/** Fold a whole run at once — what a test does with a captured transcript. */
export const played = (askedBy: string, list: Frame[]): Reply => list.reduce(fold, opening(askedBy))
