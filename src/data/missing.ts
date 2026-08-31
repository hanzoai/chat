/**
 * What this client cannot do yet, and why — in one place, so a control that is
 * off can say so in the same words everywhere it appears.
 *
 * Every entry here is a SERVER gap, not a decision. `/v1/agents/chat/conversations`
 * and `/conversations/{id}` are GET-only; there is no route to write, rename,
 * delete or page a thread, and `@hanzo/ai` binds no method for any of it. The
 * alternative to this file was inventing routes and watching them 404 in the
 * reader's face, or leaving controls that quietly do nothing.
 *
 * A gap closes by a route appearing and the SDK binding it. When one does, the
 * entry is deleted and the control it disabled becomes live — which is why each
 * names the method it is waiting for rather than describing a feeling.
 */

export type Gap =
  | 'write'
  | 'rename'
  | 'delete'
  | 'upload'
  | 'share'
  | 'tools'
  | 'dictate'
  | 'anonymous'

/** What a reader is told. One sentence, plain, and never an apology. */
export const why: Record<Gap, string> = {
  write:
    'This answer is live only — it is not saved to your conversations. The server has no route to record a turn.',
  rename: 'Renaming a conversation is not available yet.',
  delete: 'Deleting a conversation is not available yet.',
  upload: 'Attaching files is not available yet.',
  share: 'Sharing a conversation is not available yet.',
  tools: 'Choosing tools for a turn is not available yet.',
  dictate: 'Dictation is not available yet.',
  anonymous: 'Sign in to chat. There is no signed-out preview yet.',
}

/**
 * Which SDK method each gap waits on. Documentation with a compiler behind it:
 * the day one of these exists, the name is what a reader greps for.
 */
export const awaiting: Record<Gap, string> = {
  write: 'threads.record',
  rename: 'threads.update',
  delete: 'threads.delete',
  upload: 'files.create',
  share: 'threads.share',
  tools: 'chat.completions.create({ tools })',
  /** The verb exists; `/v1/models` publishes no transcription model to name. */
  dictate: 'a transcription model in models.list()',
  /** `createAiClient` takes no `publishableKey` at 0.6.7, and `auth` alone
   *  throws before sending for a browser with no session. */
  anonymous: "createAiClient({ publishableKey: 'pk-…' })",
}
