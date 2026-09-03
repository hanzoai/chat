/**
 * The wire, end to end, without a network.
 *
 * `createAiClient` takes a `fetch`, so the REAL SDK can be driven against a
 * stub transport: this asserts the address the client actually calls, the body
 * it sends, and that a canned SSE stream decodes through the SDK and folds
 * through `frames.ts` into the parts the thread renders.
 *
 * It is the half a mocked fold cannot reach. `frames.test.ts` proves the fold
 * given chunks; this proves the chunks arrive — that the URL is
 * `/v1/chat/completions` on api.hanzo.ai, that `stream: true` is sent, and that
 * the bearer from the IAM source rides along.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createAiClient, type ChatCompletionChunk } from '@hanzo/ai'

import type { Message } from '../data/types.ts'

import { fold, opening, parts, spoken } from './frames.ts'
import { history } from './submit.ts'

/** What the transport saw. */
type Seen = { url: string; method: string; body: unknown; auth: string | null }

/** An SSE body, in the framing the wire uses: `data:` lines, blank-line separated. */
const sse = (chunks: object[]): string =>
  chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'

/** A thread, as the store holds one. */
const turns = (said: [Message['role'], string, boolean?][]): Message[] =>
  said.map(([role, text, error], i) => ({
    messageId: String(i + 1),
    conversationId: null,
    parentMessageId: i === 0 ? null : String(i),
    role,
    text,
    ...(error ? { error: true } : {}),
  }))

const delta = (d: Record<string, unknown>, finish: string | null = null) => ({
  id: 'chatcmpl-x',
  object: 'chat.completion.chunk',
  created: 0,
  model: 'deepseek-chat',
  choices: [{ index: 0, delta: d, finish_reason: finish }],
})

/** A client whose transport records and answers, instead of reaching the net. */
const stub = (body: string) => {
  const seen: Seen[] = []
  const client = createAiClient({
    auth: { getValidAccessToken: () => 'test-token' },
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      seen.push({
        url: String(input),
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
        auth: headers.get('authorization'),
      })
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    }) as typeof fetch,
  })
  return { client, seen }
}

test('a streamed turn is POSTed to /v1/chat/completions on api.hanzo.ai', async () => {
  const { client, seen } = stub(sse([delta({ content: 'hi' }, 'stop')]))

  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'hello' }],
    stream: true,
  })
  for await (const _ of stream) void _

  assert.equal(seen.length, 1)
  assert.equal(seen[0].url, 'https://api.hanzo.ai/v1/chat/completions')
  assert.equal(seen[0].method, 'POST')
  assert.deepEqual(seen[0].body, {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'hello' }],
    stream: true,
  })
})

test('the IAM token rides on the request as a bearer', async () => {
  const { client, seen } = stub(sse([delta({ content: 'hi' }, 'stop')]))
  const stream = await client.chat.completions.create({
    model: 'm',
    messages: [{ role: 'user', content: 'q' }],
    stream: true,
  })
  for await (const _ of stream) void _
  assert.equal(seen[0].auth, 'Bearer test-token')
})

test('a canned stream decodes through the SDK and folds into rendered parts', async () => {
  const { client } = stub(
    sse([
      delta({ role: 'assistant' }),
      delta({ reasoning_content: 'They said hello.' }),
      delta({ content: 'Hello' }),
      delta({ content: ' there' }),
      delta({}, 'stop'),
    ]),
  )

  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'hello' }],
    stream: true,
  })

  let reply = opening('asked')
  for await (const chunk of stream) reply = fold(reply, chunk as ChatCompletionChunk)

  assert.deepEqual(parts(reply), [
    { kind: 'think', text: 'They said hello.' },
    { kind: 'text', text: 'Hello there' },
  ])
  assert.equal(spoken(reply), 'Hello there')
  assert.equal(reply.status, 'done')
})

test('the thread is sent whole, because a completion holds none of it', async () => {
  const { client, seen } = stub(sse([delta({ content: 'ok' }, 'stop')]))

  const said = turns([
    ['user', 'first'],
    ['assistant', 'answer'],
  ])
  const asked = {
    text: 'second',
    messageId: '3',
    parentMessageId: '2',
    conversationId: null,
    model: 'deepseek-chat',
  }

  const stream = await client.chat.completions.create({
    model: asked.model,
    messages: history(said, asked),
    stream: true,
  })
  for await (const _ of stream) void _

  assert.deepEqual((seen[0].body as { messages: unknown }).messages, [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'answer' },
    { role: 'user', content: 'second' },
  ])
})

test('an empty reply still arriving is not fed back to the model', () => {
  const said = turns([
    ['user', 'q'],
    ['assistant', ''],
  ])
  const asked = {
    text: 'again',
    messageId: '3',
    parentMessageId: '2',
    conversationId: null,
    model: 'm',
  }
  assert.deepEqual(history(said, asked), [
    { role: 'user', content: 'q' },
    { role: 'user', content: 'again' },
  ])
})

test('a refusal this client wrote is not fed back to the model', () => {
  const said = turns([
    ['user', 'q'],
    ['assistant', 'It went wrong.', true],
  ])
  const asked = { text: 'retry', messageId: '3', parentMessageId: '2', conversationId: null, model: 'm' }
  assert.deepEqual(history(said, asked), [
    { role: 'user', content: 'q' },
    { role: 'user', content: 'retry' },
  ])
})
