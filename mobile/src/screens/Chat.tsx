import { useRef, useState } from 'react'
import { Button, Input, Paragraph, ScrollView, Spinner, Text, XStack, YStack } from '@hanzo/gui'
import { chat, ApiError, type ChatMessage } from '../lib/api'

// Chat screen: message list + composer. Sends the full history to the backend's
// OpenAI-compatible completions endpoint and appends the reply.
export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // RN-style ScrollView exposes scrollToEnd; the gui ref type is broad, so we
  // narrow to the one method we call and attach it with a cast.
  const scrollRef = useRef<{ scrollToEnd?: (o?: { animated?: boolean }) => void }>(null)

  const send = async () => {
    const content = draft.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setDraft('')
    setError(null)
    setBusy(true)
    try {
      const reply = await chat(next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e)
      setError(msg)
      setMessages(next)
    } finally {
      setBusy(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }))
    }
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView ref={scrollRef as never} flex={1} contentContainerStyle={{ padding: 12, gap: 10 }}>
        {messages.length === 0 && (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
            <Paragraph color="$color10">Ask anything to get started.</Paragraph>
          </YStack>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {busy && (
          <XStack gap="$2" alignItems="center" paddingVertical="$2">
            <Spinner size="small" color="$color10" />
            <Text color="$color10">Thinking…</Text>
          </XStack>
        )}
        {error && (
          <YStack backgroundColor="$red3" borderRadius="$4" padding="$3">
            <Text color="$red11">{error}</Text>
          </YStack>
        )}
      </ScrollView>

      <XStack
        gap="$2"
        padding="$3"
        borderTopWidth={1}
        borderColor="$borderColor"
        alignItems="flex-end"
      >
        <Input
          flex={1}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          multiline
          maxHeight={120}
          size="$4"
          onSubmitEditing={send}
        />
        <Button theme="active" size="$4" disabled={busy || !draft.trim()} onPress={send}>
          Send
        </Button>
      </XStack>
    </YStack>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'}>
      <YStack
        maxWidth="85%"
        backgroundColor={mine ? '$color5' : '$color2'}
        borderRadius="$5"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <Paragraph color="$color" whiteSpace="pre-wrap">
          {message.content}
        </Paragraph>
      </YStack>
    </XStack>
  )
}
