/**
 * The turn, as the model takes it.
 *
 * Supports plain text, multimodal attachments (images, code files, PDFs, spreadsheets),
 * and maps attachments to ChatCompletionMessage content parts.
 */
import type { ChatCompletionContentPart, ChatCompletionMessage } from '@hanzo/ai'

import type { Attachment, Message } from '../data/types'

/**
 * What the composer holds.
 */
export interface Draft {
  text: string
  files?: Attachment[]
}

/** An empty draft. The one place the empty value is spelled. */
export const blank: Draft = { text: '', files: [] }

/**
 * Only the fields a payload reads off a conversation.
 */
export interface Conversation {
  conversationId?: string | null
  model?: string | null
}

export interface Payload {
  text: string
  files?: Attachment[]
  messageId: string
  parentMessageId: string | null
  conversationId: string | null
  model: string
}

/** The draft, addressed. */
export const payload = ({
  draft,
  conversation,
  parent,
}: {
  draft: Draft
  conversation: Conversation | null
  parent?: string | null
}): Payload => ({
  text: draft.text.trim(),
  files: draft.files && draft.files.length > 0 ? draft.files : undefined,
  messageId: crypto.randomUUID(),
  parentMessageId: parent ?? null,
  conversationId: conversation?.conversationId ?? null,
  model: conversation?.model ?? '',
})

/**
 * The thread, as the completion takes it.
 */
export const history = (said: readonly Message[], asked: Payload): ChatCompletionMessage[] => {
  const before: ChatCompletionMessage[] = said
    .filter((m) => !m.error && (m.text ?? '').trim() !== '')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text ?? '' }))

  // If there are files/images attached, construct multimodal or enriched content
  if (asked.files && asked.files.length > 0) {
    const parts: ChatCompletionContentPart[] = []
    
    // File descriptions for code/docs
    const docFiles = asked.files.filter((f) => !f.type.startsWith('image/'))
    let enrichedText = asked.text
    if (docFiles.length > 0) {
      const summaries = docFiles
        .map((f) => `[Attachment: ${f.filename} (${f.bytes} bytes)]\n${f.text || ''}`)
        .join('\n\n')
      enrichedText = enrichedText ? `${enrichedText}\n\n${summaries}` : summaries
    }

    if (enrichedText.trim()) {
      parts.push({ type: 'text', text: enrichedText })
    }

    for (const f of asked.files) {
      if (f.type.startsWith('image/') && (f.preview || f.filepath)) {
        parts.push({
          type: 'image_url',
          image_url: { url: f.preview || f.filepath },
        })
      }
    }

    return [...before, { role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? enrichedText : (parts as any) }]
  }

  return [...before, { role: 'user', content: asked.text }]
}
