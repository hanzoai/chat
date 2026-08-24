/**
 * What a turn can carry, and what a turn can be turned into.
 *
 * Two shapes travel here that travel nowhere else. An upload is `multipart`,
 * because the file IS the request and its metadata rides beside it in the same
 * body. Speech goes both ways: dictation posts audio and reads back words,
 * while reading-aloud posts words and reads back audio — so one of them is the
 * only call in the app that answers bytes.
 *
 * `globalThis.File` is written out wherever a browser file is meant. The wire's
 * own record is `Attachment`, and the two are close enough that shadowing one
 * with the other would compile and then hand the server an object with no
 * bytes in it.
 */
import { api } from '~/data/api'
import { http } from '~/data/http'
import { keys } from '~/data/keys'
import { useRead, useSend } from '~/data/query'
import type { Attachment, Limits, Speech, Voice } from '~/data/types'

/** Everything this person has uploaded. */
export const useFiles = (enabled = true) =>
  useRead<Attachment[]>(keys.fileList, () => http.get<Attachment[]>(api.files.list), { enabled })

/** What this deployment will accept, per endpoint. */
export const useLimits = () =>
  useRead<Limits>(keys.limits, () => http.get<Limits>(api.files.config), { fresh: Infinity })

/** The files an agent holds, as distinct from the ones a conversation carries. */
export const useAgentFiles = (agentId: string | null | undefined) =>
  useRead<Attachment[]>(
    keys.agentFiles(agentId ?? ''),
    () => http.get<Attachment[]>(api.files.ofAgent(agentId as string)),
    { enabled: Boolean(agentId) },
  )

/** Where the bytes of a stored file are. */
export const downloadUrl = (userId: string, fileId: string) => api.files.download(userId, fileId)

/**
 * What rides beside an upload.
 *
 * `file_id` is minted by the client so the composer can show the attachment
 * before the server has finished storing it; the server returns it as
 * `temp_file_id` alongside the id it chose, which is how the placeholder and
 * the real record are matched up.
 */
export type Upload = {
  file: globalThis.File
  file_id: string
  endpoint?: string
  conversationId?: string
  /** A file for ONE conversation, rather than a permanent file of an agent's. */
  message_file?: boolean
  agent_id?: string
  tool_resource?: string
  width?: number
  height?: number
}

const bodyOf = ({ file, ...meta }: Upload): FormData => {
  const form = new FormData()
  form.append('file', file, file.name)
  for (const [name, value] of Object.entries(meta)) {
    if (value == null) continue
    form.append(name, String(value))
  }
  return form
}

/** Store a file. */
export const useUpload = () =>
  useSend<Upload, Attachment>((upload) => http.form<Attachment>(api.files.upload, bodyOf(upload)), [
    keys.files,
  ])

/**
 * Store an image.
 *
 * A separate route because the server does more with one — it reads the
 * dimensions and writes a preview — and it answers the same record either way.
 */
export const useUploadImage = () =>
  useSend<Upload, Attachment>((upload) => http.form<Attachment>(api.files.images, bodyOf(upload)), [
    keys.files,
  ])

/**
 * Delete files.
 *
 * The route takes the whole records rather than their ids, because it checks
 * the path it is about to remove against the id that names it — an id alone
 * would be a request to delete something the server has to go and look up
 * first, and looking it up is the step an attacker would like to skip.
 */
export const useDeleteFiles = () =>
  useSend<Attachment[], void>((files) => http.drop<void>(api.files.drop, { files }), [keys.files])

// ---------------------------------------------------------------------------
// Speech
// ---------------------------------------------------------------------------

/** Which voices this deployment can read in. */
export const useVoices = (enabled = true) =>
  useRead<Voice[]>(keys.voices, () => http.get<Voice[]>(api.files.voices), { enabled })

/** How speech is configured here — whether either direction exists at all. */
export const useSpeech = () =>
  useRead<Speech>(keys.speech, () => http.get<Speech>(api.files.speech), { fresh: Infinity })

/** Dictation: audio in, words out. */
export const listen = async (audio: Blob): Promise<string> => {
  const form = new FormData()
  form.append('audio', audio, 'speech.webm')
  const { text } = await http.form<{ text?: string }>(api.files.listen, form)
  return text ?? ''
}

/**
 * Reading aloud: words in, audio out.
 *
 * Answers the bytes rather than a URL, because there is no address to give an
 * `<audio>` element — the route is a POST. The caller makes one with
 * `URL.createObjectURL`, and is the one that must revoke it.
 */
export const speak = (input: { messageId?: string; runId?: string; text?: string; voice?: string }) =>
  http.bytes(api.files.speak, input)
