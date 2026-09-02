/**
 * Modern Liquid-Glass Composer with File Uploads, Drag-and-Drop,
 * Auto-Expanding Textarea, and Model Switching.
 */
import { ArrowUp, Mic, MicOff, Paperclip, Square, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { Starters, type Starter } from '~/compose/Starters'
import { useDraft } from '~/compose/draft'
import type { Handoff } from '~/compose/link'
import { payload, type Conversation, type Draft, type Payload } from '~/compose/submit'
import type { Attachment } from '~/data/types'

const COLUMN = 768
const MAX_TEXTAREA_HEIGHT = 220

export interface ComposeProps {
  conversation?: Conversation | null
  parent?: string | null
  busy?: boolean
  disabled?: boolean
  model?: ReactNode
  link?: Handoff | null
  empty?: boolean
  starters?: Starter[]
  onSend: (turn: Payload) => boolean | void
  onStop?: () => void
  onTrouble?: (say: string) => void
}

export const Compose = ({
  conversation = null,
  parent = null,
  busy = false,
  disabled = false,
  model,
  link = null,
  empty = false,
  starters,
  onSend,
  onStop,
  onTrouble: _onTrouble,
}: ComposeProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const conversationId = conversation?.conversationId ?? null
  const { draft, write, addFiles, removeFile, clear } = useDraft(conversationId)

  // Web Speech API Voice Dictation
  const toggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    const win = typeof window !== 'undefined' ? (window as any) : null
    if (!win) return

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRec) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome.')
      return
    }

    try {
      const recognition = new SpeechRec()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript.trim()) {
          const currentText = textareaRef.current?.value || ''
          const newText = currentText ? `${currentText} ${transcript.trim()}` : transcript.trim()
          write(newText)
        }
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setIsListening(false)
    }
  }

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Auto-expand textarea on content change
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)
    el.style.height = `${Math.max(newHeight, 36)}px`
  }, [draft.text])

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming: Attachment[] = []
      for (const f of Array.from(fileList)) {
        const isImg = f.type.startsWith('image/')
        let preview = ''
        let text = ''

        if (isImg) {
          preview = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(f)
          })
        } else {
          if (f.size < 500000) {
            text = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.readAsText(f)
            })
          }
        }

        incoming.push({
          file_id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          filename: f.name,
          filepath: preview || '',
          type: f.type || 'application/octet-stream',
          bytes: f.size,
          preview,
          text,
        })
      }

      if (incoming.length > 0) {
        addFiles(incoming)
      }
    },
    [addFiles],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      e.preventDefault()
      void processFiles(e.clipboardData.files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files)
    }
  }

  const fire = useCallback(
    (text: string) => {
      const going: Draft = { ...draft, text: text.trim() }
      const hasContent = going.text.length > 0 || (going.files && going.files.length > 0)
      if (!hasContent || busy || disabled) return
      const gone = onSend(payload({ draft: going, conversation, parent }))
      if (gone !== false) {
        clear()
        if (textareaRef.current) {
          textareaRef.current.style.height = '36px'
        }
      }
    },
    [draft, busy, disabled, conversation, parent, onSend, clear],
  )

  const send = useCallback(() => fire(draft.text), [fire, draft.text])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Send on Enter without shift
      e.preventDefault()
      send()
    }
  }

  const seeded = useRef<string | null>(null)
  const armed = useRef(false)
  useEffect(() => {
    if (!link || seeded.current === link.text) return
    seeded.current = link.text
    armed.current = link.send
    write(link.text)
  }, [link, write])
  useEffect(() => {
    if (!armed.current || draft.text !== seeded.current) return
    armed.current = false
    fire(draft.text)
  }, [draft.text, fire])

  const attachments = draft.files ?? []
  const hasValidInput = draft.text.trim().length > 0 || attachments.length > 0

  return (
    <YStack
      width="100%"
      maxWidth={COLUMN}
      alignSelf="center"
      gap="$3"
      data-testid="compose"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInput}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <XStack gap="$2" flexWrap="wrap" paddingHorizontal="$2">
          {attachments.map((file) => {
            const isImg = file.type.startsWith('image/')
            return (
              <XStack
                key={file.file_id}
                alignItems="center"
                gap="$2"
                paddingHorizontal="$2.5"
                paddingVertical="$1.5"
                borderRadius={8}
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.12)"
                backgroundColor="rgba(255, 255, 255, 0.05)"
                style={{ backdropFilter: 'blur(16px)' }}
              >
                {isImg && file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.filename}
                    style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }}
                  />
                ) : (
                  <Paperclip size={13} color="rgba(255, 255, 255, 0.7)" />
                )}
                <SizableText size="$1" color="$ink" numberOfLines={1} maxWidth={160}>
                  {file.filename}
                </SizableText>
                <button
                  type="button"
                  title="Remove attachment"
                  onClick={() => removeFile(file.file_id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              </XStack>
            )
          })}
        </XStack>
      )}

      {/* Liquid Glass Composer Container (Single Seamless Box) */}
      <div
        style={{
          position: 'relative',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%), rgba(14, 14, 18, 0.88)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px)',
          border: dragOver
            ? '1px dashed #34d399'
            : isFocused
            ? '1px solid rgba(52, 211, 153, 0.45)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isFocused
            ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 211, 153, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.18)'
            : '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          padding: '14px 16px 12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onPaste={handlePaste}
      >
        {/* Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={draft.text}
          onChange={(e) => write(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={busy || disabled}
          placeholder={busy ? 'Agent swarm synthesizing…' : 'Ask anything or @mention an agent...'}
          rows={1}
          style={{
            width: '100%',
            minHeight: 36,
            maxHeight: MAX_TEXTAREA_HEIGHT,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: 14,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            resize: 'none',
            padding: 0,
            margin: 0,
          }}
        />

        {/* Action Toolbar */}
        <XStack alignItems="center" justifyContent="space-between">
          {/* Left: Attachment & Model Selector */}
          <XStack alignItems="center" gap="$2">
            {/* Paperclip upload button */}
            <button
              type="button"
              title="Attach files or images"
              disabled={busy || disabled}
              onClick={() => fileInput.current?.click()}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Paperclip size={14} />
            </button>

            {/* Voice Dictate Button */}
            <button
              type="button"
              data-testid="compose-voice-dictate"
              title={isListening ? 'Listening… Click to stop dictation' : 'Voice dictation (Click to speak)'}
              disabled={busy || disabled}
              onClick={toggleVoice}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 8,
                background: isListening ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: isListening ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isListening ? '#f87171' : 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {/* Model Selector */}
            {model}
          </XStack>

          {/* Right: Hint & Send / Stop Button */}
          <XStack alignItems="center" gap="$3">
            <span
              style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.35)',
                userSelect: 'none',
              }}
            >
              {busy ? 'Generating…' : 'Enter to send'}
            </span>

            {busy ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generating"
                className="tap"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!hasValidInput || disabled}
                title="Send message (Enter)"
                className="tap"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: hasValidInput ? '#34d399' : 'rgba(255, 255, 255, 0.08)',
                  border: hasValidInput ? '1px solid rgba(52, 211, 153, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: hasValidInput ? '#09090b' : 'rgba(255, 255, 255, 0.35)',
                  cursor: hasValidInput ? 'pointer' : 'not-allowed',
                  boxShadow: hasValidInput ? '0 2px 14px rgba(52, 211, 153, 0.4)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: hasValidInput ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <ArrowUp size={15} strokeWidth={2.5} />
              </button>
            )}
          </XStack>
        </XStack>
      </div>

      {/* Examples / Starter Suggestion Cards Below Composer */}
      {empty && <Starters starters={starters} disabled={busy || disabled} onPick={fire} />}
    </YStack>
  )
}
