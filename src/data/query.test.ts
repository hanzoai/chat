/**
 * The cache is bounded.
 *
 * Written because it was not: `invalidate` was the only thing that removed an
 * entry, so a session accumulated one cache entry, one reader CLOSURE and one
 * era counter per key it ever read — and `keys.symbols(query)` mints a key per
 * keystroke, so a long search typed a leak one character at a time. Nothing
 * failed, which is why it survived: a leak is a screen that keeps working.
 *
 * WHAT THIS FILE CANNOT REACH, stated rather than left to look covered. Three
 * rules in `reclaim` protect an entry from eviction — a live watcher, an
 * in-flight read, and `pending` — and all three are reachable only through
 * `useRead`, which is a React hook. These tests run under `node --test` with no
 * renderer, so they exercise the BOUND and the ORDER and not the protections.
 * A test for those wants a renderer, and claiming them here would be worse than
 * leaving them named.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { invalidate, peek, write } from './query.ts'
import type { Key } from './keys.ts'

const at = (n: number): Key => ['probe', String(n)] as Key

test('the cache does not grow without bound', () => {
  invalidate()
  const wrote = 400
  for (let i = 0; i < wrote; i += 1) write(at(i), i)

  let held = 0
  for (let i = 0; i < wrote; i += 1) if (peek(at(i)) !== undefined) held += 1

  // The bound is 256. What matters is that it is BOUNDED and below what was
  // written — asserting the exact number would pin a policy rather than the
  // property, and the policy is allowed to move.
  assert.ok(held < wrote, `every one of ${wrote} entries survived — nothing evicts`)
  assert.ok(held > 0, 'everything was evicted, which is a cache that holds nothing')
})

test('eviction takes the oldest settled first, so the newest survive', () => {
  invalidate()
  const wrote = 400
  for (let i = 0; i < wrote; i += 1) write(at(i), i)

  // The last thing written is the thing a screen is most likely reading.
  assert.equal(peek(at(wrote - 1)), wrote - 1)
  // The first is what a bound sheds.
  assert.equal(peek(at(0)), undefined)
})

test('an entry that survives still holds its value, not a husk', () => {
  invalidate()
  for (let i = 0; i < 400; i += 1) write(at(i), { n: i })
  assert.deepEqual(peek(at(399)), { n: 399 })
})

test('invalidate clears a prefix and leaves its siblings', () => {
  invalidate()
  write(['a', 'one'] as Key, 1)
  write(['a', 'two'] as Key, 2)
  write(['b', 'one'] as Key, 3)

  invalidate(['a'] as Key)
  assert.equal(peek(['a', 'one'] as Key), undefined)
  assert.equal(peek(['a', 'two'] as Key), undefined)
  assert.equal(peek(['b', 'one'] as Key), 3, 'a sibling prefix was taken with it')
})
