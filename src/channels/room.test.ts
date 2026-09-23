/**
 * A room reads as a person would say it: a name, never a platform id, and its
 * messages as prose rather than Slack's markup.
 *
 * The fixtures are the shapes production served: a thread whose last message is
 * `<https://worldmobile.io|worldmobile.io>`, and rooms known only as `C0BNDMFGW20`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { InboxMessage } from '@hanzo/ai'

import { rooms } from './room.ts'

let next = 0
const said = (roomId: string, text: string, extra: Partial<InboxMessage> = {}): InboxMessage => ({
  id: ++next,
  channel: 'slack',
  account: 't0123',
  roomId,
  roomKind: 'group',
  sender: 'U031THJJ7F1',
  text,
  createdAt: 1_790_000_000 + next,
  ...extra,
})

const only = (messages: InboxMessage[]) => {
  const [room] = rooms(messages)
  return room
}

test('a link shows its label, and a bare link its address', () => {
  assert.equal(only([said('C1', '<https://worldmobile.io|worldmobile.io>')]).last.text, 'worldmobile.io')
  assert.equal(only([said('C1', 'see <https://acme.dev>')]).last.text, 'see https://acme.dev')
  assert.equal(only([said('C1', '<mailto:z@hanzo.ai|z@hanzo.ai>')]).last.text, 'z@hanzo.ai')
})

test('mentions and broadcasts read as Slack shows them', () => {
  const text = only([said('C1', '<@U02|ana> <@U03> <!here> <!subteam^S1|@infra> <!date^1392734382^{date}|Feb 18>')]).last.text
  assert.equal(text, '@ana @U03 @here @infra Feb 18')
})

test('escaped characters come back', () => {
  assert.equal(only([said('C1', 'a &amp; b &lt;3 &gt; c')]).last.text, 'a & b <3 > c')
})

test('a room is never named by its id', () => {
  const room = only([said('C0BNDMFGW20', 'ok')])
  assert.equal(room.name, 'unknown-channel')
  assert.equal(room.roomId, 'C0BNDMFGW20')
})

test('a room takes the name a mention of it states', () => {
  const [infra, other] = rooms([
    said('C0C1NQ6TR0X', 'ok'),
    said('C0BNDMFGW20', 'notes are in <#C0C1NQ6TR0X|eng-infra>', { createdAt: 1 }),
  ])
  assert.equal(infra.roomId, 'C0C1NQ6TR0X')
  assert.equal(infra.name, 'eng-infra')
  assert.equal(other.name, 'unknown-channel')
  assert.equal(other.last.text, 'notes are in #eng-infra')
})

test('a channel mention with no name borrows a known one, else says unknown', () => {
  const [, room] = rooms([said('C9', '<#C9|general>'), said('C8', '<#C9> and <#C7|>', { createdAt: 1 })])
  assert.equal(room.last.text, '#general and #unknown-channel')
})

test('a direct message is a direct message', () => {
  assert.equal(only([said('D0BJK8J5GP4', 'hi', { roomKind: 'dm' })]).name, 'Direct message')
})

test('another transport keeps its text as sent', () => {
  const room = only([said('-1001', '<b>&amp;</b>', { channel: 'telegram' })])
  assert.equal(room.last.text, '<b>&amp;</b>')
  assert.equal(room.name, 'unknown-channel')
})
