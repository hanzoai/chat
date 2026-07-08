import { useState, type ReactNode } from 'react'
import { Button, Input, Paragraph, Text, YStack } from '@hanzo/gui'
import { hasToken, setToken } from '../lib/auth'

// Simple paste-a-token gate. Renders children once a bearer token is present
// (from VITE_CHAT_TOKEN or a previous paste), otherwise a single input.
// TODO(iam): swap for a Hanzo IAM OIDC login (see lib/auth.ts).
export function TokenGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(hasToken())
  const [value, setValue] = useState('')

  if (authed) return <>{children}</>

  const submit = () => {
    const token = value.trim()
    if (!token) return
    setToken(token)
    setAuthed(true)
  }

  return (
    <YStack flex={1} justifyContent="center" gap="$4" padding="$6" backgroundColor="$background">
      <Text fontSize="$8" fontWeight="700" color="$color">
        Hanzo AI
      </Text>
      <Paragraph color="$color10">
        Paste a bearer token to connect to the chat backend. You can set{' '}
        <Text fontFamily="$mono">VITE_CHAT_TOKEN</Text> to skip this.
      </Paragraph>
      <Input
        value={value}
        onChangeText={setValue}
        placeholder="Bearer token"
        secureTextEntry
        autoCapitalize="none"
        size="$4"
        onSubmitEditing={submit}
      />
      <Button theme="active" size="$4" disabled={!value.trim()} onPress={submit}>
        Connect
      </Button>
    </YStack>
  )
}
