/**
 * Reading and batching file attachments for the composer.
 */
import type { Attachment } from '../data/types.ts'

/** The largest file whose text rides in a turn. */
export const READABLE = 500_000

export interface ReadResult {
  attachment?: Attachment
  refusal?: string
}

export interface BatchResult {
  incoming: Attachment[]
  refusal: string | null
}

/**
 * Reads a single file, either as a data URL for images or text for documents.
 * Returns either the parsed Attachment or a refusal message if unreadable / oversized.
 */
export const readAttachment = async (
  f: File,
  readableLimit: number = READABLE,
): Promise<ReadResult> => {
  const isImg = f.type.startsWith('image/')
  let preview = ''
  let text = ''

  if (isImg) {
    let failed = false
    preview = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string) || '')
      reader.onerror = () => {
        failed = true
        resolve('')
      }
      reader.onabort = () => {
        failed = true
        resolve('')
      }
      reader.readAsDataURL(f)
    })
    if (failed || !preview) {
      return { refusal: `${f.name} could not be read, so it was not attached.` }
    }
  } else {
    // Read it or refuse it. Over the limit the body used to be left empty
    // and the file attached anyway, so the turn carried a header naming a
    // file whose contents nobody — reader or model — ever saw.
    if (f.size >= readableLimit) {
      return { refusal: `${f.name} is too large to read, so it was not attached.` }
    }
    let failed = false
    text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string) || '')
      reader.onerror = () => {
        failed = true
        resolve('')
      }
      reader.onabort = () => {
        failed = true
        resolve('')
      }
      reader.readAsText(f)
    })
    if (failed) {
      return { refusal: `${f.name} could not be read, so it was not attached.` }
    }
  }

  return {
    attachment: {
      file_id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      filename: f.name,
      filepath: preview || '',
      type: f.type || 'application/octet-stream',
      bytes: f.size,
      preview,
      text,
    },
  }
}

/**
 * Process a batch of files (e.g. from file input, paste, or drag-and-drop).
 */
export const processFilesBatch = async (
  files: ArrayLike<File> | Iterable<File>,
  readableLimit: number = READABLE,
): Promise<BatchResult> => {
  const incoming: Attachment[] = []
  let refusal: string | null = null

  for (const f of Array.from(files)) {
    const res = await readAttachment(f, readableLimit)
    if (res.attachment) {
      incoming.push(res.attachment)
    } else if (res.refusal) {
      refusal = res.refusal
    }
  }

  return { incoming, refusal }
}
