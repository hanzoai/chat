import { Screen, XStack, YStack } from '@hanzo/ui'
import { useCallback, useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router'

import { brand } from '~/brand'
import { api } from '~/data/api'
import { useModels } from '~/data/config'
import { useConvos } from '~/data/convos'
import { useSession } from '~/data/session'
import type { Convo } from '~/data/types'
import { useNarrow } from '~/gui'
import { Account } from '~/rail/Account'
import { id } from '~/rail/group'
import { Rail } from '~/rail/Rail'
import { Visitor } from '~/rail/Visitor'
import { Settings } from '~/settings/Settings'
import { Announce } from '~/shell/Announce'
import { Gate } from '~/shell/Gate'
import { Palette } from '~/shell/Palette'

/**
 * What a screen inside the shell can reach.
 *
 * Three things, and all three are the SHELL's rather than the screen's: whether
 * the conversation column is showing, and how to open the preferences. They
 * travel by outlet context rather than by a store, because they are about what
 * this frame is doing and nothing outside it has any use for them.
 */
export type Frame = {
  rail: boolean
  setRail: (open: boolean) => void
  setSettings: (open: boolean) => void
}

export const useFrame = (): Frame => useOutletContext<Frame>()

/**
 * The frame every conversation screen renders into, and the one place the app's
 * standing furniture is mounted.
 *
 * `Screen` fills the viewport and CLIPS, which is half the contract — a shell
 * whose content escapes paints the thread over the composer — so no screen
 * below has to restate it.
 *
 * Four things live here rather than in a screen, and each for the same reason:
 * they outlive the route. The rail keeps its scroll position and its search
 * while you move between conversations. The palette holds ⌘K, and a chord that
 * only works where a particular bar renders is a chord people learn not to
 * trust. The gate answers a refusal, which can arrive from any screen. The live
 * region has to be in the document BEFORE it has anything to say.
 *
 * It is also where the presentational modules meet the wire. `rail`, `settings`
 * and the rest take props and give callbacks — none of them fetches — so
 * something has to hold the reads and hand them over, and that is what a
 * composition root is for. What it does NOT do is decide anything about a
 * conversation's CONTENT: that is the thread's and the composer's, one level in.
 */
export const Root = () => {
  const narrow = useNarrow()
  const navigate = useNavigate()
  const here = useMatch('/c/:id')?.params.id ?? null

  /**
   * A phone opens with the drawer SHUT, every load — not only on a first visit.
   *
   * The viewport is the authority, and it is read ONCE, from the same answer
   * the drawer itself is decided from, so the two cannot disagree about what
   * narrow means. An initial value rather than an effect: an effect would paint
   * the open column first and then close it, which on a phone is the whole
   * conversation appearing and being covered. A mid-session resize is
   * deliberately left alone, so an open drawer is never yanked shut under
   * somebody who is using it.
   */
  const [rail, setRail] = useState(!narrow)
  const [settings, setSettings] = useState(false)

  const { standing, user, signIn, signOut } = useSession()
  const mine = standing === 'live'

  const models = useModels(mine)
  const convos = useConvos(mine)

  const open = useCallback((c: Convo) => navigate(`/c/${id(c)}`), [navigate])
  const fresh = useCallback(() => navigate('/'), [navigate])
  const preferences = useCallback(() => setSettings(true), [])

  const frame = useMemo<Frame>(() => ({ rail, setRail, setSettings }), [rail])

  /**
   * The foot of the column: who you are, or an invitation to be somebody.
   *
   * Sign-up is not offered here, and that is on purpose. The issuer's own
   * account form takes the same PKCE challenge the authorize endpoint does, so
   * reaching it correctly means starting a sign-in that lands on it — which is
   * `signUp()`, a verb, not an address. A bare link to the form leaves a new
   * account signed in at the issuer and stranded here, so the standing offer is
   * "Log in", and the issuer's screen carries the way to make one.
   */
  const foot = mine && user ? (
    <Account
      name={user.name ?? user.username ?? user.email ?? 'Account'}
      email={user.email}
      avatar={user.avatar}
      collapsed={!rail}
      onSettings={preferences}
      accountHref={api.iam.account}
      onSignOut={signOut}
    />
  ) : (
    <Visitor
      collapsed={!rail}
      onLogIn={signIn}
      onSettings={preferences}
    />
  )

  return (
    <Screen backgroundColor="$background">
      <Announce />

      {/* `position: relative` is load-bearing rather than defensive: below the
          breakpoint the rail is an absolutely-positioned drawer with a scrim,
          and both are placed against this row. */}
      <XStack flex={1} minHeight={0} position="relative">
        <Rail
          convos={convos.data ?? []}
          activeId={here}
          loading={convos.pending}
          open={rail}
          onOpenChange={setRail}
          drawer={narrow}
          title={brand.title}
          onOpen={open}
          onNew={fresh}
          account={foot}
        />

        <YStack flex={1} minWidth={0} minHeight={0}>
          <Outlet context={frame} />
        </YStack>
      </XStack>

      <Gate />
      <Palette onSettings={preferences} onRail={() => setRail(true)} />

      {/* Mounted only while open — @hanzo/ui's Dialog measures the viewport even
          when it is showing nothing, so a shut one costs a media subscription
          per surface that can open it. */}
      {settings ? (
        <Settings
          open
          onOpenChange={setSettings}
          served={{ models: models.data }}
          account={{
            person: user ?? undefined,
            onSignOut: signOut,
          }}
        />
      ) : null}

    </Screen>
  )
}
