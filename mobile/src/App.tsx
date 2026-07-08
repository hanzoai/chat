import { useEffect, useState } from 'react'
import { Text, XStack, YStack } from '@hanzo/gui'
import { Nav, type Screen } from './components/Nav'
import { TokenGate } from './components/TokenGate'
import { Chat } from './screens/Chat'
import { Sessions } from './screens/Sessions'
import { Usage } from './screens/Usage'
import { fetchRoutingDefaults } from './lib/api'
import { cacheRoutingDefaults, type RoutingDefaults } from './lib/routing'

// App shell: fixed header, active screen, bottom nav. State-based routing only.
// The authed shell is split out so the org routing-defaults boot fetch runs only
// once we hold a token (TokenGate renders children after auth).
export function App() {
  return (
    <TokenGate>
      <AppShell />
    </TokenGate>
  )
}

function AppShell() {
  const [screen, setScreen] = useState<Screen>('chat')
  const [routingDefaults, setRoutingDefaults] = useState<RoutingDefaults | null>(null)

  // On boot (authed), fetch the server-driven auto-routing defaults once. The
  // fetch is fail-soft (never throws → { available: false }); we cache the result
  // for the non-React api layer AND hold it in state for the Usage toggle.
  useEffect(() => {
    let live = true
    const controller = new AbortController()
    fetchRoutingDefaults({ signal: controller.signal }).then((defaults) => {
      if (!live) return
      cacheRoutingDefaults(defaults)
      setRoutingDefaults(defaults)
    })
    return () => {
      live = false
      controller.abort()
    }
  }, [])

  return (
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
        {screen === 'usage' && <Usage routingDefaults={routingDefaults} />}
      </YStack>

      <Nav active={screen} onChange={setScreen} />
    </YStack>
  )
}
