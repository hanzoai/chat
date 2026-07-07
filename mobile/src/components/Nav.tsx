import type { ReactElement } from 'react'
import { Text, YStack } from '@hanzo/gui'

export type Screen = 'chat' | 'sessions' | 'usage'

// Inline SVG glyphs — the @hanzo/gui web output renders to the DOM, so a plain
// <svg> is the lightest icon (avoids react-native-svg, whose web build wants a
// react-native-web internal that RNW 0.21 no longer ships).
type Glyph = (p: { active: boolean }) => ReactElement

const stroke = (active: boolean) => (active ? '#fff' : '#888')

const ChatIcon: Glyph = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ListIcon: Glyph = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const GaugeIcon: Glyph = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2">
    <path d="M12 14l4-4M20.66 17A9 9 0 1 0 3.34 17" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TABS: Array<{ id: Screen; label: string; Icon: Glyph }> = [
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'sessions', label: 'Sessions', Icon: ListIcon },
  { id: 'usage', label: 'Usage', Icon: GaugeIcon },
]

// Bottom tab bar — the app's only navigation. Plain state, no router lib.
export function Nav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  return (
    <YStack
      flexDirection="row"
      borderTopWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
      paddingBottom="$2"
    >
      {TABS.map(({ id, label, Icon }) => {
        const selected = id === active
        return (
          <YStack
            key={id}
            flex={1}
            alignItems="center"
            gap="$1"
            paddingVertical="$3"
            pressStyle={{ opacity: 0.6 }}
            onPress={() => onChange(id)}
          >
            <Icon active={selected} />
            <Text fontSize="$1" color={selected ? '$color' : '$color10'}>
              {label}
            </Text>
          </YStack>
        )
      })}
    </YStack>
  )
}
