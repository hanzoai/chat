/**
 * The picker's list.
 *
 * Written because the version this replaces returned `[]` for every input the
 * app ever handed it, and nothing said so: `catalog` read its models through a
 * `flatMap` over `endpoints`, which came from a route that does not exist, so
 * the loop had nothing to iterate and the models were never reached. An empty
 * menu is a plausible screen — a deployment with no models looks the same — so
 * it survived until somebody tried to pick from it.
 *
 * Hence the first assertion, which is only interesting because it once failed:
 * a catalogue with models in it produces entries.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { address, catalog, pick } from './models.ts'

const WHERE = [
  { id: 'hanzo', label: 'Hanzo' },
  { id: 'local', label: 'On this machine', group: 'On this machine' },
]

test('models that were served reach the list', () => {
  const list = catalog({ hanzo: { openai: ['gpt-4o'], anthropic: ['claude-opus-5'] } }, WHERE)
  assert.equal(list.length, 2)
  assert.deepEqual(
    list.map((one) => one.id),
    ['hanzo/gpt-4o', 'hanzo/claude-opus-5'],
  )
})

test('an address says where the model runs, and survives the round trip', () => {
  // A model id carries slashes of its own, so only the first is the cut.
  const id = address('local', 'zenlm/zen-eco-4b-agent-gguf')
  assert.equal(id, 'local/zenlm/zen-eco-4b-agent-gguf')
  assert.deepEqual(pick(id), { origin: 'local', model: 'zenlm/zen-eco-4b-agent-gguf' })
})

test('the estate groups by publisher; the machine groups by itself', () => {
  const list = catalog(
    { hanzo: { openai: ['gpt-4o'] }, local: { local: ['zen-eco-4b'] } },
    WHERE,
  )
  assert.deepEqual(
    list.map((one) => one.family),
    ['openai', 'On this machine'],
  )
})

test('an origin that answered nothing contributes nothing', () => {
  assert.deepEqual(catalog({ hanzo: { openai: ['gpt-4o'] } }, WHERE).length, 1)
  assert.deepEqual(catalog(null, WHERE), [])
  assert.deepEqual(catalog({ hanzo: {} }, WHERE), [])
})

test('a model served by an origin this build cannot reach is not listed', () => {
  // The web build declares no machine, so the engine's models are not offered
  // — there is no client that could answer for them.
  const web = [{ id: 'hanzo', label: 'Hanzo' }]
  const list = catalog({ hanzo: { openai: ['gpt-4o'] }, local: { local: ['zen-eco-4b'] } }, web)
  assert.deepEqual(
    list.map((one) => one.id),
    ['hanzo/gpt-4o'],
  )
})
