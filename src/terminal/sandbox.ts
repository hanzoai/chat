/**
 * The computer this client borrows, and the record of what actually ran on it.
 *
 * `POST /v1/sandbox/lease` hands back a real machine, `POST /v1/sandbox/run`
 * runs a command in it and answers the program's own stdout, stderr and exit
 * code, `POST /v1/sandbox/write` puts a file there, `POST /v1/sandbox/stop`
 * interrupts what is running and `POST /v1/sandbox/end` gives the machine back.
 * Every line held here came off one of those answers. Nothing is echoed locally
 * on the program's behalf, so an empty log means nothing has run.
 *
 * ONE lease, shared by the terminal and the artifact runner. The SDK is exact
 * about why: a caller holding an id who omits it does not get a second view of
 * one computer, it gets a second computer. The id therefore lives here and
 * nowhere else, and both surfaces are views of it.
 *
 * The class is always `exec`. Every other class requires a `project` to name
 * the disk to attach, and a chat client owns no project.
 */
import { APIError, AuthError, type Leased, type Ran, type SandboxRuntime, type Wrote } from '@hanzo/ai'
import { useEffect, useState } from 'react'

import { ai } from '~/data/ai'
import { requireLogin } from '~/data/gate'

/** `said` is what was typed; the rest is what the server answered. */
export type Line = { kind: 'said' | 'out' | 'err' | 'note'; text: string }

export type Lease = {
  /** What `lease` answered, or null while nothing is held. */
  held: Leased | null
  /** The isolation ASKED for. `held.runtime` is the one the fleet granted. */
  want: SandboxRuntime | null
  /** A lease or a command is on the wire. */
  busy: boolean
  lines: Line[]
}

let lease: Lease = { held: null, want: null, busy: false, lines: [] }

/** The lease in flight, so concurrent callers join one rather than take two. */
let leasing: Promise<Leased | null> | null = null

const listeners = new Set<(next: Lease) => void>()

const patch = (next: Partial<Lease>, ...add: Line[]) => {
  lease = { ...lease, ...next, ...(add.length ? { lines: [...lease.lines, ...add] } : {}) }
  for (const fn of listeners) fn(lease)
}

/**
 * A refusal is reported in the server's own words, and a refused identity asks
 * for the gate rather than rendering `Unauthorized` as though it were output.
 */
const refuse = (fault: unknown): null => {
  if (fault instanceof AuthError || (fault instanceof APIError && fault.status === 401)) {
    requireLogin('anonymous')
  }
  patch({ busy: false }, { kind: 'err', text: fault instanceof Error ? fault.message : String(fault) })
  return null
}

/** What a command produced. Exit is stated when it is not zero, or when it is all there is. */
const said = (ran: Ran): Line[] => {
  const out: Line[] = []
  if (ran.stdout) out.push({ kind: 'out', text: ran.stdout.replace(/\n+$/, '') })
  if (ran.stderr) out.push({ kind: 'err', text: ran.stderr.replace(/\n+$/, '') })
  if (!out.length || ran.exitCode) out.push({ kind: 'note', text: `exit ${ran.exitCode ?? 0}` })
  return out
}

const take = async (): Promise<Leased | null> => {
  patch({ busy: true })
  try {
    const held = await ai().sandboxes.lease({
      class: 'exec',
      ...(lease.want ? { runtime: lease.want } : {}),
    })
    patch({ held, busy: false }, {
      kind: 'note',
      text: [held.id, held.runtime, held.status, held.workdir].filter(Boolean).join(' · '),
    })
    return held
  } catch (fault) {
    return refuse(fault)
  }
}

/**
 * The held computer, leasing one if none is held.
 *
 * The flight is remembered so two callers arriving together join one lease. A
 * second `lease` with no id does not answer a second view of one computer, it
 * answers a second computer — and then a file written by the artifact runner is
 * on a machine the terminal cannot see.
 */
const hold = (): Promise<Leased | null> => {
  if (lease.held) return Promise.resolve(lease.held)
  leasing ??= take().finally(() => {
    leasing = null
  })
  return leasing
}

export const sandbox = {
  get: (): Lease => lease,

  /**
   * Ask for a different isolation. The held computer goes back, because a
   * runtime is chosen when a lease is taken and cannot be changed after.
   */
  runtime: (want: SandboxRuntime | null) => {
    void sandbox.release()
    patch({ want })
  },

  /**
   * Runs one thing and waits for it. A string is a shell line; an array is an
   * already-split program, which is the form no shell can misread.
   */
  run: async (what: string | string[]): Promise<Ran | null> => {
    if (lease.busy) return null
    const shown = Array.isArray(what) ? what.join(' ') : what.trim()
    if (!shown) return null
    const held = await hold()
    if (!held) return null
    patch({ busy: true }, { kind: 'said', text: shown })
    try {
      const ran = await ai().sandboxes.run(
        Array.isArray(what) ? { id: held.id, argv: what } : { id: held.id, command: shown },
      )
      patch({ busy: false }, ...said(ran))
      return ran
    } catch (fault) {
      return refuse(fault)
    }
  },

  /** Writes a file whole. A write replaces what was there. */
  write: async (path: string, data: string): Promise<Wrote | null> => {
    const held = await hold()
    if (!held) return null
    patch({ busy: true })
    try {
      const wrote = await ai().sandboxes.write({ id: held.id, path, data })
      patch({ busy: false }, {
        kind: 'note',
        text: `${wrote.path ?? path}${wrote.bytes == null ? '' : ` · ${wrote.bytes} bytes`}`,
      })
      return wrote
    } catch (fault) {
      return refuse(fault)
    }
  },

  /** Interrupts every command running. The lease survives. */
  interrupt: async () => {
    if (!lease.held) return
    try {
      const { stopped } = await ai().sandboxes.stop({ id: lease.held.id })
      patch({ busy: false }, { kind: 'note', text: `interrupted ${stopped ?? 0}` })
    } catch (fault) {
      refuse(fault)
    }
  },

  /** Ends the lease and gives the computer back. */
  release: async () => {
    const held = lease.held
    if (!held) return
    patch({ busy: true })
    try {
      await ai().sandboxes.end({ id: held.id })
      patch({ held: null, busy: false }, { kind: 'note', text: `released ${held.id}` })
    } catch (fault) {
      // The lease is KEPT. `released` used to be written and the lease cleared
      // before the server was asked, so a refused end read as a release that
      // happened — and the computer it did not release became unreachable from
      // here, still running and still billed.
      refuse(fault)
    }
  },

  /** Clears the view. The computer keeps running whatever it was running. */
  clear: () => patch({ lines: [] }),
}

export const useLease = (): Lease => {
  const [current, setCurrent] = useState<Lease>(lease)
  useEffect(() => {
    const handler = (next: Lease) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])
  return current
}
