/**
 * A room as a person reads it: named, and its messages as prose.
 *
 * The inbox carries each message's text as the transport delivered it, and
 * Slack delivers mrkdwn — a link is `<https://x.io|x.io>`, a channel mention is
 * `<#C024BE91L|general>`, and `&`, `<` and `>` arrive escaped. It carries no
 * room name at all: `roomId` is the platform's id (`C024BE91L`), which is an
 * address, not a name. Every surface that draws a room reads it through here,
 * so the rail, the header, the directory and an export cannot disagree.
 *
 * A name comes from the only place the wire states one: a mention of that room
 * in some message on the page. A room nobody has mentioned is `unknown-channel`
 * rather than its id, and a direct message is a direct message. The `#` is the
 * surface's to draw, as Slack's own sidebar draws it.
 */
import { rooms as group, type InboxMessage, type Room as Wire } from '@hanzo/ai'

export type Room = Wire & {
  /** What the room is called, without the `#`. Never the platform id. */
  name: string
}

const UNKNOWN = 'unknown-channel'

/** A control sequence: everything between `<` and `>`. Literal brackets arrive escaped. */
const TAG = /<([^<>]*)>/g

/** A channel mention that states its name: `<#C024BE91L|general>`. */
const MENTION = /<#([^|<>]+)\|([^<>]+)>/g

const ENTITY: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' }

/** The room names the page states, by room id. */
const named = (messages: InboxMessage[]): Map<string, string> => {
  const known = new Map<string, string>()
  for (const message of messages) {
    if (message.channel !== 'slack') continue
    for (const [, id, name] of message.text.matchAll(MENTION)) known.set(id, name)
  }
  return known
}

/**
 * One control sequence, as the words Slack would show for it.
 *
 * `target|label` shows the label. Without one a link shows its address, a user
 * mention its handle, and a broadcast (`<!here>`) its keyword.
 */
const tag = (body: string, known: Map<string, string>): string => {
  const bar = body.indexOf('|')
  const target = bar < 0 ? body : body.slice(0, bar)
  const label = bar < 0 ? '' : body.slice(bar + 1)
  switch (target[0]) {
    case '#':
      return `#${label || known.get(target.slice(1)) || UNKNOWN}`
    case '@':
      return `@${label || target.slice(1)}`
    case '!':
      return label || `@${target.slice(1).split('^')[0]}`
    default:
      return label || target
  }
}

/** Slack mrkdwn as plain text. `known` resolves a channel mention that names no one. */
const plain = (text: string, known: Map<string, string>): string =>
  text.replace(TAG, (_, body: string) => tag(body, known)).replace(/&(amp|lt|gt);/g, (e) => ENTITY[e])

/** What a room is called. */
const name = (room: Wire, known: Map<string, string>): string =>
  room.roomKind === 'dm' ? 'Direct message' : (known.get(room.roomId) ?? UNKNOWN)

/** The rooms on a page of the inbox, newest first, named and in prose. */
export const rooms = (messages: InboxMessage[]): Room[] => {
  const known = named(messages)
  const read = messages.map((m) => (m.channel === 'slack' ? { ...m, text: plain(m.text, known) } : m))
  return group(read).map((room) => ({ ...room, name: name(room, known) }))
}
