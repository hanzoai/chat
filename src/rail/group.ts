import type { Convo } from '../data/types'

/**
 * The SET, ordered and named — the only rules about a list of conversations
 * that the rail and the full-page manager both have to agree on.
 *
 * No React, no fetch, no tokens: a band is a fact about a clock and a title is
 * a fact about a string, and both are asked by four different screens. Written
 * twice they drift, and the drift is invisible — one surface says "Yesterday"
 * where the other says "Previous 7 days" about the same row and neither is
 * obviously wrong.
 *
 * The subject is `Convo` from `~/data/types` and there is no row-shaped copy of
 * it here. A second vocabulary for one fact is how two halves of a product
 * start disagreeing about it, and the mapping between them would be a layer
 * with nothing in it: `conversationId` is the id, and renaming it on the way in
 * buys a rename on the way back out.
 *
 * Dates are the reader's own local midnight, not UTC: "yesterday" is a thing
 * that happened where the reader is, and an ISO instant compared in UTC puts an
 * evening in Auckland two days back.
 */

/** One labelled run of rows. */
interface Band {
  label: string
  convos: Convo[]
}


const MONTH = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY = 86_400_000

const midnight = (ms: number): number => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Which band a moment falls in. Whole days apart, so 23:59 and 00:01 differ. */
const bandOf = (at: number, now: number): string => {
  const days = Math.round((midnight(now) - midnight(at)) / DAY)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 7) return 'Previous 7 days'
  if (days <= 30) return 'Previous 30 days'
  const then = new Date(at)
  return then.getFullYear() === new Date(now).getFullYear()
    ? MONTH[then.getMonth()]
    : String(then.getFullYear())
}

/** An unreadable stamp sorts to the end rather than throwing the whole list. */
const moment = (c: Convo): number => {
  const ms = Date.parse(c.updatedAt ?? '')
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * The row's key.
 *
 * `conversationId` is null until the server has taken the first turn, which is
 * the draft the composer holds — a state, not a row. `group` drops those, so
 * everything downstream of it has a real id and React has a real key.
 */
export const id = (c: Convo): string => c.conversationId ?? ''

/**
 * The title a row shows.
 *
 * A conversation exists before it has a name — the server generates one after
 * the first exchange — so every surface needs the same word for that gap, and
 * a blank row is a row nobody can aim at.
 */
export const named = (c: Convo): string => (c.title ?? '').trim() || 'Untitled'

/**
 * The set, banded.
 *
 * Sorting once is what puts the bands in order: newest first means Today's rows
 * come before Yesterday's, which come before every month and then every year,
 * so the run boundaries ARE the band boundaries and nothing has to rank labels.
 * A ranking table would be a second statement of the same order, and the two
 * would disagree the first time a band was added.
 *
 * Pins are the one exception, hoisted whole — they are a choice the reader made
 * and a date cannot outrank it.
 */
export const group = (convos: readonly Convo[], now: number = Date.now()): Band[] => {
  const seen = new Set<string>()
  const once: Convo[] = []
  for (const c of convos) {
    const key = id(c)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    once.push(c)
  }
  once.sort((a, b) => moment(b) - moment(a))

  const bands: Band[] = []

  let run: Band | undefined
  for (const c of once) {
    const label = bandOf(moment(c), now)
    if (run === undefined || run.label !== label) {
      run = { label, convos: [] }
      bands.push(run)
    }
    run.convos.push(c)
  }
  return bands
}

/**
 * Finding one.
 *
 * A literal substring over the title, lower-cased — never a regex
 * built from what someone typed, which is both a ReDoS and a surprise (`.` in a
 * title stops meaning a full stop). An empty question asks nothing, so it
 * answers with everything rather than nothing.
 */
export const hits = (convos: readonly Convo[], query: string): Convo[] => {
  const q = query.trim().toLowerCase()
  const listed = convos.filter((c) => id(c) !== '')
  if (q === '') return listed
  return listed.filter((c) => named(c).toLowerCase().includes(q))
}

/**
 * When, in as few characters as a table column can spare.
 *
 * Relative inside a day because that is the range a reader holds in their head,
 * absolute past it because "37h" is arithmetic, not information. The year
 * appears only when it is not this one.
 */
export const when = (iso: string, now: number = Date.now()): string => {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const gap = now - ms
  if (gap < 60_000) return 'now'
  if (gap < 3_600_000) return `${Math.floor(gap / 60_000)}m`
  if (gap < DAY) return `${Math.floor(gap / 3_600_000)}h`
  const d = new Date(ms)
  const day = `${d.getDate()} ${MONTH[d.getMonth()].slice(0, 3)}`
  return d.getFullYear() === new Date(now).getFullYear() ? day : `${day} ${d.getFullYear()}`
}
