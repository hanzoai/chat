/**
 * The fold, against literal chunks.
 *
 * `frames.ts` imports nothing at runtime — both its imports are types, and type
 * stripping removes them — so the whole protocol is assertable in Node with no
 * bundler, no DOM and no framework. `node --test` is the runner because it is
 * already installed.
 *
 * These are the shapes `/v1/chat/completions` actually answers, not invented
 * ones: a role-only opening delta, content deltas, a reasoning delta under the
 * name the gateway relays, tool-call arguments arriving in pieces across chunks,
 * and a terminal `finish_reason`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ChatCompletionChunk } from '@hanzo/ai'

import { faulted, fold, opening, parts, spoken, stopped } from './frames.ts'

/** A chunk, with the envelope every one of them carries filled in. */
const chunk = (
  delta: Record<string, unknown>,
  finish: string | null = null,
): ChatCompletionChunk =>
  ({
    id: 'chatcmpl-1',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'deepseek-chat',
    choices: [{ index: 0, delta, finish_reason: finish }],
  }) as ChatCompletionChunk

const play = (chunks: ChatCompletionChunk[]) => chunks.reduce(fold, opening('asked'))

test('a role-only opening delta adds no part', () => {
  const reply = play([chunk({ role: 'assistant' })])
  assert.deepEqual(parts(reply), [])
  assert.equal(reply.status, 'running')
})

test('content deltas accumulate into one text part', () => {
  const reply = play([
    chunk({ role: 'assistant' }),
    chunk({ content: 'Hello' }),
    chunk({ content: ', ' }),
    chunk({ content: 'world' }),
  ])
  assert.deepEqual(parts(reply), [{ kind: 'text', text: 'Hello, world' }])
  assert.equal(spoken(reply), 'Hello, world')
})

test('the completion id and model are taken from the first chunk that names them', () => {
  const reply = play([chunk({ content: 'hi' })])
  assert.equal(reply.id, 'chatcmpl-1')
  assert.equal(reply.model, 'deepseek-chat')
})

test('reasoning claims its own slot, ahead of the prose it reasoned toward', () => {
  const reply = play([
    chunk({ reasoning_content: 'The user ' }),
    chunk({ reasoning_content: 'said hello.' }),
    chunk({ content: 'Hi!' }),
  ])
  assert.deepEqual(parts(reply), [
    { kind: 'think', text: 'The user said hello.' },
    { kind: 'text', text: 'Hi!' },
  ])
  // Only prose is spoken — reasoning is not part of the answer.
  assert.equal(spoken(reply), 'Hi!')
})

test('the other spelling of reasoning folds the same way', () => {
  const reply = play([chunk({ reasoning: 'thinking' })])
  assert.deepEqual(parts(reply), [{ kind: 'think', text: 'thinking' }])
})

test('interleaved reasoning and prose stay in two slots, not four', () => {
  const reply = play([
    chunk({ reasoning_content: 'a' }),
    chunk({ content: 'X' }),
    chunk({ reasoning_content: 'b' }),
    chunk({ content: 'Y' }),
  ])
  assert.deepEqual(parts(reply), [
    { kind: 'think', text: 'ab' },
    { kind: 'text', text: 'XY' },
  ])
})

test('tool-call arguments accumulate across chunks, by index', () => {
  const reply = play([
    chunk({ tool_calls: [{ index: 0, id: 'c1', function: { name: 'search', arguments: '{"q":' } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: '"lux"}' } }] }),
  ])
  assert.deepEqual(parts(reply), [
    { kind: 'tool', name: 'search', args: '{"q":"lux"}', output: '', status: 'running' },
  ])
})

test('two tool calls claim two slots', () => {
  const reply = play([
    chunk({
      tool_calls: [
        { index: 0, function: { name: 'one', arguments: '{}' } },
        { index: 1, function: { name: 'two', arguments: '{}' } },
      ],
    }),
  ])
  assert.equal(parts(reply).length, 2)
  assert.deepEqual(
    parts(reply).map((p) => (p.kind === 'tool' ? p.name : p.kind)),
    ['one', 'two'],
  )
})

test('a finish reason settles the reply and every tool still running', () => {
  const reply = play([
    chunk({ tool_calls: [{ index: 0, function: { name: 'search', arguments: '{}' } }] }),
    chunk({ content: 'done' }),
    chunk({}, 'stop'),
  ])
  assert.equal(reply.status, 'done')
  const tool = parts(reply).find((p) => p.kind === 'tool')
  assert.equal(tool?.kind === 'tool' && tool.status, 'done')
})

test('finish_reason "length" is a truncation, which reads as unfinished', () => {
  assert.equal(play([chunk({ content: 'cut' }), chunk({}, 'length')]).status, 'cancelled')
})

test('finish_reason "tool_calls" is a finished answer', () => {
  assert.equal(play([chunk({}, 'tool_calls')]).status, 'done')
})

test('a chunk with no choices changes nothing but the envelope', () => {
  const empty = { id: 'x', object: 'chat.completion.chunk', created: 0, model: 'm', choices: [] }
  const reply = fold(opening('asked'), empty as ChatCompletionChunk)
  assert.deepEqual(parts(reply), [])
  assert.equal(reply.status, 'running')
})

test('only the first choice is folded', () => {
  const two = {
    id: 'x',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'm',
    choices: [
      { index: 0, delta: { content: 'first' }, finish_reason: null },
      { index: 1, delta: { content: 'second' }, finish_reason: null },
    ],
  }
  assert.equal(spoken(fold(opening('asked'), two as ChatCompletionChunk)), 'first')
})

test('a failure keeps what arrived and says what happened, last', () => {
  const reply = faulted(play([chunk({ content: 'half a sen' })]), 'The answer could not be reached.')
  assert.deepEqual(parts(reply), [
    { kind: 'text', text: 'half a sen' },
    { kind: 'fault', text: 'The answer could not be reached.' },
  ])
  assert.equal(reply.status, 'error')
})

test('the reader stopping it leaves the text and marks it unfinished', () => {
  const reply = stopped(play([chunk({ content: 'partial' })]))
  assert.deepEqual(parts(reply), [{ kind: 'text', text: 'partial' }])
  assert.equal(reply.status, 'cancelled')
})

test('the fold is pure — the reply handed in is never mutated', () => {
  const before = opening('asked')
  const after = fold(before, chunk({ content: 'hi' }))
  assert.deepEqual(parts(before), [])
  assert.notEqual(before, after)
})
