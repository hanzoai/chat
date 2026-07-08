import { useEffect, useState } from 'react'
import { Button, Paragraph, ScrollView, Spinner, Text, XStack, YStack } from '@hanzo/gui'
import { listConversations, ApiError, type Conversation } from '../lib/api'

// Sessions screen: the user's recent conversations from GET /api/convos.
export function Sessions() {
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    listConversations({ signal: controller.signal })
      .then((page) => setItems(page.conversations))
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }

  useEffect(load, [])

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" color="$color10" />
      </YStack>
    )
  }

  return (
    <ScrollView flex={1} backgroundColor="$background" contentContainerStyle={{ padding: 12, gap: 8 }}>
      {error && (
        <YStack gap="$3" backgroundColor="$red3" borderRadius="$4" padding="$3">
          <Text color="$red11">{error}</Text>
          <Button size="$3" onPress={load}>
            Retry
          </Button>
        </YStack>
      )}
      {!error && items.length === 0 && (
        <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
          <Paragraph color="$color10">No conversations yet.</Paragraph>
        </YStack>
      )}
      {items.map((c) => (
        <YStack
          key={c.conversationId}
          backgroundColor="$color2"
          borderRadius="$4"
          padding="$3"
          gap="$1"
          pressStyle={{ opacity: 0.7 }}
        >
          <Text color="$color" fontWeight="600" numberOfLines={1}>
            {c.title?.trim() || 'Untitled'}
          </Text>
          <XStack gap="$2">
            {c.model && (
              <Text fontSize="$1" color="$color10" numberOfLines={1}>
                {c.model}
              </Text>
            )}
            {c.updatedAt && (
              <Text fontSize="$1" color="$color10">
                {new Date(c.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </XStack>
        </YStack>
      ))}
    </ScrollView>
  )
}
