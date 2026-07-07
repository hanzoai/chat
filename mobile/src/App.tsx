import { useState } from 'react'
import { Text, XStack, YStack } from '@hanzo/gui'
import { Nav, type Screen } from './components/Nav'
import { TokenGate } from './components/TokenGate'
import { Chat } from './screens/Chat'
import { Sessions } from './screens/Sessions'
import { Usage } from './screens/Usage'

// App shell: fixed header, active screen, bottom nav. State-based routing only.
export function App() {
  const [screen, setScreen] = useState<Screen>('chat')

  return (
    <TokenGate>
      <YStack flex={1} backgroundColor="$background">
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderColor="$borderColor"
          alignItems="center"
        >
          <Text fontSize="$6" fontWeight="700" color="$color">
            Hanzo AI
          </Text>
        </XStack>

        <YStack flex={1}>
          {screen === 'chat' && <Chat />}
          {screen === 'sessions' && <Sessions />}
          {screen === 'usage' && <Usage />}
        </YStack>

        <Nav active={screen} onChange={setScreen} />
      </YStack>
    </TokenGate>
  )
}
