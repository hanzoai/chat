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
 * `XMLHttpRequest`, not `fetch`, and it is the one place in the app that is
 * true: fetch reports no upload progress, and a 40MB attachment with no
 * progress is indistinguishable from a hung app. Everything else is fetch.
 */
import { useCallback, useRef } from 'react'

import type { Attached } from '~/compose/submit'

/** Where a picture goes, and where everything else goes. The server sizes,
 *  strips and thumbnails a picture; it does none of that to a PDF. */
const IMAGES = '/v1/chat/files/images'
const FILES = '/v1/chat/files'

/** What the provider can actually read. The caller NAMES the control after
 *  this — "Add photos" where only pictures land — rather than greying a row
 *  out, because a disabled control with a tooltip explains a rule instead of
 *  applying it. */
export type Takes = 'photos' | 'files'

/** The `accept` an input offers. Empty means everything. */
export const accepts = (takes: Takes): string =>
  takes === 'photos' ? 'image/*,.heif,.heic' : ''

const isImage = (file: File): boolean => file.type.startsWith('image/')

export interface Upload {
  conversationId: string | null
  /** The route family the turn will be posted to. */
  endpoint: string
  agentId?: string | null
  token?: string
  /** Raised as bytes land, 0..1. */
  onProgress?: (share: number) => void
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
  message?: string
}

/**
 * Send one file. Answers the record that rides on the turn.
 *
 * The id is minted here rather than by the server, so the file appears in the
 * composer the instant it is chosen and its progress has somewhere to be
 * written. The server echoes it back.
 */
export const upload = (file: File, o: Upload): Promise<Attached> =>
  measure(file).then(
    (size) =>
      new Promise<Attached>((settle, refuse) => {
        const id = crypto.randomUUID()
        const form = new FormData()
        form.append('endpoint', o.endpoint)
        form.append('file', file, encodeURIComponent(file.name))
        form.append('file_id', id)
        form.append('message_file', 'true')
        if (o.conversationId) form.append('conversationId', o.conversationId)
        if (o.agentId) form.append('agent_id', o.agentId)
        if (size) {
          form.append('width', String(size.width))
          form.append('height', String(size.height))
        }

        const wire = new XMLHttpRequest()
        wire.open('POST', isImage(file) ? IMAGES : FILES)
        wire.withCredentials = true
        // No `Content-Type`: the browser writes it with the multipart boundary,
        // and setting it by hand leaves the boundary off and the body unparsed.
        if (o.token) wire.setRequestHeader('Authorization', `Bearer ${o.token}`)

        wire.upload.onprogress = (e) => {
          if (e.lengthComputable) o.onProgress?.(Math.min(e.loaded / e.total, 0.99))
        }
        wire.onerror = () => refuse(new Error(`${file.name} would not upload.`))
        wire.onabort = () => refuse(new Error(`${file.name} was cancelled.`))
        wire.onload = () => {
          let said: Stored = {}
          try {
            said = JSON.parse(wire.responseText) as Stored
          } catch {
            said = {}
          }
          if (wire.status < 200 || wire.status >= 300) {
            refuse(new Error(said.message ?? `${file.name} was refused.`))
            return
          }
          o.onProgress?.(1)
          settle({
            file_id: said.file_id ?? id,
            filepath: said.filepath ?? '',
            filename: said.filename ?? file.name,
            type: said.type ?? file.type,
            height: said.height,
            width: said.width,
            progress: 1,
          })
        }
        o.signal?.addEventListener('abort', () => wire.abort(), { once: true })
        wire.send(form)
      }),
  )

export interface Uploading extends Omit<Upload, 'onProgress' | 'signal'> {
  /** Where a file, and each report of its progress, is written. */
  put: (file: Attached) => void
  /** Where a file that failed is taken back off. */
  take: (fileId: string) => void
  say: (trouble: string) => void
  /** Refuse anything larger than this locally, in bytes. Omitted, the server
   *  decides — after the bytes have crossed the wire. */
  limit?: number
}

/**
 * The loop: chosen files become draft entries that fill up.
 *
 * Shared by the picker and by a drop onto the thread, which is the whole
 * reason it is here rather than in either of them — two copies of "mint,
 * show at zero, upload, report, replace" is two places for the progress to
 * stop at 99%.
 */
export const useUpload = (o: Uploading) => {
  const held = useRef(o)
  held.current = o

  const add = useCallback((chosen: FileList | File[] | null) => {
    const { put, take, say, limit, ...where } = held.current
    for (const file of Array.from(chosen ?? [])) {
      if (limit != null && file.size > limit) {
        say(`${file.name} is larger than this conversation accepts.`)
        continue
      }
      const id = crypto.randomUUID()
      // Present immediately, at nothing: the reader sees the file land and
      // watches it fill, rather than waiting on a box that looks unchanged.
      put({ file_id: id, filepath: '', filename: file.name, type: file.type, progress: 0 })
      upload(file, {
        ...where,
        onProgress: (share) =>
          put({ file_id: id, filepath: '', filename: file.name, type: file.type, progress: share }),
      }).then(
        (stored) => {
          take(id)
          put(stored)
        },
        (trouble: Error) => {
          take(id)
          say(trouble.message)
        },
      )
    }
  }, [])

  return { add }
}
