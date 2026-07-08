import { useEffect, useState } from 'react'
import { Button, Paragraph, ScrollView, Spinner, Switch, Text, XStack, YStack } from '@hanzo/gui'
import { useUsage } from '@hanzo/usage/react'
import type { UsageStore, ProviderState, RateWindow } from '@hanzo/usage'
import { createUsageStore, isTauri } from '../lib/usage'
import { getSmartRoutingPref, setSmartRoutingPref } from '../lib/settings'
import {
  resolveSmartRouting,
  orgDefaultRouting,
  orgAutoRoutingActive,
  type RoutingDefaults,
} from '../lib/routing'

const PROVIDERS: Array<{ id: string; label: string }> = [
  { id: 'hanzo', label: 'Hanzo' },
  { id: 'codex', label: 'Codex' },
  { id: 'claude', label: 'Claude' },
]

// Usage screen: provider cards from @hanzo/usage. Needs a filesystem host
// (Tauri) to read ~/.codex, ~/.claude, ~/.hanzo — outside Tauri we show a
// connect empty-state.
export function Usage({ routingDefaults }: { routingDefaults: RoutingDefaults | null }) {
  const [store, setStore] = useState<UsageStore | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    let created: UsageStore | null = null
    createUsageStore()
      .then((s) => {
        if (!live) {
          s?.stop()
          return
        }
        created = s
        setStore(s)
        s?.start()
      })
      .finally(() => live && setReady(true))
    return () => {
      live = false
      created?.stop()
    }
  }, [])

  // Smart routing is a chat setting, not usage data — keep it visible in every
  // state (loading, connected, empty).
  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack padding={12} paddingBottom={0}>
        <SmartRoutingToggle routingDefaults={routingDefaults} />
      </YStack>
      {!ready ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$color10" />
        </YStack>
      ) : !store ? (
        <ConnectEmptyState />
      ) : (
        <UsageCards store={store} />
      )}
    </YStack>
  )
}

// Smart-routing toggle: flips new chats between the configured model and the
// gateway's "auto" smart-routing model. The effective state is resolved from the
// local override (null === follow org default) against the org's server-driven
// defaults (fail-soft: absent === today's local-only behavior). When the org has
// disabled auto-routing the toggle is locked off. See lib/routing + lib/settings.
function SmartRoutingToggle({ routingDefaults }: { routingDefaults: RoutingDefaults | null }) {
  const [pref, setPref] = useState<boolean | null>(getSmartRoutingPref)
  const { enabled, toggleDisabled } = resolveSmartRouting(
    pref,
    orgDefaultRouting(routingDefaults),
    orgAutoRoutingActive(routingDefaults),
  )
  const onChange = (value: boolean) => {
    setPref(value)
    setSmartRoutingPref(value)
  }
  return (
    <YStack backgroundColor="$color2" borderRadius="$5" padding="$4" gap="$2">
      <XStack justifyContent="space-between" alignItems="center" gap="$3">
        <Text fontSize="$5" fontWeight="600" color="$color">
          Smart routing
        </Text>
        <Switch size="$3" checked={enabled} disabled={toggleDisabled} onCheckedChange={onChange}>
          <Switch.Thumb />
        </Switch>
      </XStack>
      <Paragraph fontSize="$2" color="$color10">
        {toggleDisabled
          ? 'Disabled for your organization'
          : "Automatically route each message to the best, cheapest capable model. You're billed for whichever model serves it. Learn more at docs.hanzo.ai/docs/usage/routing"}
      </Paragraph>
    </YStack>
  )
}

function ConnectEmptyState() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$3"
      padding="$6"
      backgroundColor="$background"
    >
      <Text fontSize="$6" fontWeight="700" color="$color">
        Usage is a desktop feature
      </Text>
      <Paragraph color="$color10" textAlign="center">
        {isTauri()
          ? 'Usage data is unavailable in this build.'
          : 'Open the Hanzo AI app to read your local Codex, Claude, and Hanzo provider usage.'}
      </Paragraph>
    </YStack>
  )
}

function UsageCards({ store }: { store: UsageStore }) {
  const state = useUsage(store)
  return (
    <ScrollView flex={1} backgroundColor="$background" contentContainerStyle={{ padding: 12, gap: 10 }}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color">
          Usage
        </Text>
        <Button size="$2" disabled={state.refreshing} onPress={() => void store.refresh()}>
          {state.refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </XStack>
      {PROVIDERS.map(({ id, label }) => (
        <ProviderCard key={id} label={label} state={state.providers[id]} />
      ))}
    </ScrollView>
  )
}

function ProviderCard({ label, state }: { label: string; state?: ProviderState }) {
  const snap = state?.snapshot
  return (
    <YStack backgroundColor="$color2" borderRadius="$5" padding="$4" gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$5" fontWeight="600" color="$color">
          {label}
        </Text>
        {state?.refreshing && <Spinner size="small" color="$color10" />}
      </XStack>

      {state?.error && <Text color="$red11">{state.error}</Text>}

      {!state?.error && !snap && (
        <Paragraph color="$color10">
          {state?.refreshing ? 'Loading…' : 'Not connected. Sign in to this provider on this device.'}
        </Paragraph>
      )}

      {snap && (
        <YStack gap="$3">
          <Meter title="Session" window={snap.primary} />
          <Meter title="Weekly" window={snap.secondary} />
          {snap.identity?.plan && (
            <Text fontSize="$1" color="$color10">
              Plan: {snap.identity.plan}
            </Text>
          )}
          {state?.sourceLabel && (
            <Text fontSize="$1" color="$color10">
              Source: {state.sourceLabel}
            </Text>
          )}
        </YStack>
      )}
    </YStack>
  )
}

function Meter({ title, window: w }: { title: string; window?: RateWindow }) {
  if (!w) return null
  const pct = Math.round(Math.max(0, Math.min(100, w.usedPercent)))
  return (
    <YStack gap="$1.5">
      <XStack justifyContent="space-between">
        <Text fontSize="$2" color="$color11">
          {title}
        </Text>
        <Text fontSize="$2" color="$color11">
          {pct}% used
        </Text>
      </XStack>
      <YStack height={8} borderRadius="$10" backgroundColor="$color4" overflow="hidden">
        <YStack height={8} width={`${pct}%`} backgroundColor="$color10" />
      </YStack>
      {w.resetDescription && (
        <Text fontSize="$1" color="$color10">
          Resets {w.resetDescription}
        </Text>
      )}
    </YStack>
  )
}
