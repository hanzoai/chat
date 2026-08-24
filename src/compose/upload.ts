/**
 * Putting a file into a turn.
 *
 * ONE gesture, one route pair, one loop. There used to be a menu of ways to
 * upload the same file — as an image, as OCR text, for file search, for the
 * sandbox — and each row wrote a different resource onto it. That is routing
 * the server is in a better position to do, and it was four ways to say "add
 * this file". Which tools the turn carries is a separate question, asked among
 * the tools.
 *
 * The transfer goes through `open` from `~/data/http` like everything else, so
 * the bearer and its renewal are decided once for the whole client. What is NOT
 * shared is the four lines that read the response: a file needs an abort signal
 * — taking a chip back off has to stop the bytes, not just hide them — and that
 * is the one thing the ready-made verbs do not take.
 */
import { useCallback, useRef } from 'react'

import { api } from '~/data/api'
import { open } from '~/data/http'
import { explain } from '~/data/types'

import type { Attached } from '~/compose/submit'

/** What the provider can actually read. The caller NAMES the control after
 *  this — "Add photos" where only pictures land — rather than greying a row
 *  out, because a disabled control with a tooltip explains a rule instead of
 *  applying it. */
export type Takes = 'photos' | 'files'

/** The `accept` an input offers. Empty means everything. */
export const accepts = (takes: Takes): string => (takes === 'photos' ? 'image/*,.heif,.heic' : '')

const isImage = (file: File): boolean => file.type.startsWith('image/')

export interface Upload {
  /**
   * The file's id, minted by the CALLER.
   *
   * It has to be, because the entry in the draft exists before the request
   * does — the reader sees the file the instant they choose it. Minting a
   * second id in here would mean the thing on screen and the thing on the
   * server were two files, and the arriving one would have to replace the
   * arrived one rather than simply becoming it.
   */
  id: string
  conversationId: string | null
  /** The route family the turn will be posted to. */
  endpoint: string
  agentId?: string | null
  signal?: AbortSignal
}

/** The size of an image, read from the file itself so the server does not have
 *  to guess a thumbnail's aspect. A file that will not decode is sent without
 *  one rather than refused. */
const measure = (file: File): Promise<{ width: number; height: number } | null> =>
  new Promise((settle) => {
    if (!isImage(file) || typeof createImageBitmap !== 'function') return settle(null)
    createImageBitmap(file).then(
      (bitmap) => {
        settle({ width: bitmap.width, height: bitmap.height })
        bitmap.close()
      },
      () => settle(null),
    )
  })

/** The server's answer to an upload. */
interface Stored {
  file_id?: string
  filepath?: string
  filename?: string
  type?: string
  height?: number
  width?: number
}

/**
 * Send one file. Answers the record that rides on the turn.
 *
 * A picture goes to its own route: the server sizes, strips and thumbnails a
 * picture, and does none of that to a PDF.
 *
 * The `Content-Type` is deliberately unset. The browser writes it, and the
 * multipart boundary it invents is part of it, so naming the type by hand
 * produces a body no server can parse.
 */
export const upload = async (file: File, o: Upload): Promise<Attached> => {
  const size = await measure(file)
  const form = new FormData()
  form.append('endpoint', o.endpoint)
  form.append('file', file, encodeURIComponent(file.name))
  form.append('file_id', o.id)
  form.append('message_file', 'true')
  if (o.conversationId) form.append('conversationId', o.conversationId)
  if (o.agentId) form.append('agent_id', o.agentId)
  if (size) {
    form.append('width', String(size.width))
    form.append('height', String(size.height))
  }

  const res = await open(isImage(file) ? api.files.images : api.files.upload, {
    method: 'POST',
    body: form,
    signal: o.signal,
  })
  const said: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error(explain(said).text)

  const stored = (said ?? {}) as Stored
  return {
    file_id: stored.file_id ?? o.id,
    filepath: stored.filepath ?? '',
    filename: stored.filename ?? file.name,
    type: stored.type ?? file.type,
    height: stored.height,
    width: stored.width,
    here: true,
  }
}

export interface Uploading extends Omit<Upload, 'id' | 'signal'> {
  /** Where a file, and then the stored record that replaces it, is written. */
  put: (file: Attached) => void
  /** Where a file that failed is taken back off. */
  take: (fileId: string) => void
  say: (trouble: string) => void
  /** Refuse anything larger than this locally, in bytes. Omitted, the server
   *  decides — after the bytes have crossed the wire. */
  limit?: number
}

export interface Uploads {
  /** Start these. Each appears in the draft at once and fills in. */
  add: (chosen: FileList | File[] | null) => void
  /** Give up on one. Taking a chip off has to STOP the transfer: an upload
   *  nobody is waiting for still finishes, and its record then walks back into
   *  the draft the reader just cleared. */
  cancel: (fileId: string) => void
}

/**
 * The loop: chosen files become draft entries that fill in.
 *
 * Shared by the picker, by a paste and by a drop, which is the whole reason it
 * is here rather than in any of them — three copies of "mint, show, send,
 * replace" is three places for a file to get stuck half-arrived.
 */
export const useUpload = (o: Uploading): Uploads => {
  const held = useRef(o)
  held.current = o
  const flight = useRef(new Map<string, AbortController>())

  const cancel = useCallback((fileId: string) => {
    flight.current.get(fileId)?.abort()
    flight.current.delete(fileId)
  }, [])

  const add = useCallback((chosen: FileList | File[] | null) => {
    const { put, take, say, limit, ...where } = held.current
    for (const file of Array.from(chosen ?? [])) {
      if (limit != null && file.size > limit) {
        say(`${file.name} is larger than this conversation accepts.`)
        continue
      }
      const id = crypto.randomUUID()
      // Present immediately, and honestly not here yet: the reader sees the
      // file land and sees that it is still arriving, rather than watching a
      // box that looks unchanged.
      put({ file_id: id, filepath: '', filename: file.name, type: file.type, here: false })

      const control = new AbortController()
      flight.current.set(id, control)
      upload(file, { ...where, id, signal: control.signal }).then(
        (stored) => {
          flight.current.delete(id)
          put(stored)
        },
        (trouble: Error) => {
          // An abort is the reader's own doing; the chip is already gone and
          // there is nothing to report.
          if (control.signal.aborted) return
          flight.current.delete(id)
          take(id)
          say(trouble.message)
        },
      )
    }
  }, [])

  return { add, cancel }
}
