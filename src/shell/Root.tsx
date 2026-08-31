import { Dialog, DialogContent, Screen, XStack, YStack } from '@hanzo/ui'
import { ConfirmDelete } from '@hanzo/ui/product'
import { useCallback, useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router'

import { brand } from '~/brand'
import { api } from '~/data/api'
import { useCloseAccount, useConfig, useEndpoints, useModels } from '~/data/config'
import { useArchive, useConvos, useDelete, useDeleteAll, useRename } from '~/data/convos'
import { useConnections, useRestart, useServers } from '~/data/mcp'
import { useSession } from '~/data/session'
import { useShares, useUnshare } from '~/data/share'
import type { Convo } from '~/data/types'
import { useNarrow } from '~/gui'
import { Account } from '~/rail/Account'
import { id, named } from '~/rail/group'
import type { Verbs } from '~/rail/Menu'
import { Rail } from '~/rail/Rail'
import { Visitor } from '~/rail/Visitor'
import { Settings } from '~/settings/Settings'
import { announce, Announce } from '~/shell/Announce'
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
  /** The conversation somebody asked to delete, held while they confirm it. */
  const [doomed, setDoomed] = useState<Convo | null>(null)

  const { standing, user, signIn, signOut } = useSession()
  const mine = standing === 'live'

  const config = useConfig()
  const endpoints = useEndpoints()
  const models = useModels()

  const convos = useConvos({}, mine)
  const rename = useRename()
  const archive = useArchive()
  const drop = useDelete()
  const dropAll = useDeleteAll()
  const closeAccount = useCloseAccount()

  // Read only while the dialog that shows them is open. A settings tab nobody
  // has opened is four requests nobody asked for, on every visit.
  const archived = useConvos({ isArchived: true }, mine && settings)
  const shares = useShares({}, mine && settings)
  const unshare = useUnshare()
  const servers = useServers(mine && settings)
  const connections = useConnections(mine && settings)
  const restart = useRestart()

  const open = useCallback((c: Convo) => navigate(`/c/${id(c)}`), [navigate])
  const fresh = useCallback(() => navigate('/'), [navigate])
  const preferences = useCallback(() => setSettings(true), [])

  /**
   * What a row can do to its conversation. `delete` only ASKS — the menu is
   * deliberately not the place a confirm or a request lives, so it hands the
   * conversation back and this holds it until somebody says yes.
   */
  const verbs = useMemo<Verbs>(
    () => ({
      rename: (c, title) => void rename.send({ conversationId: id(c), title }),
      pin: (c, yes) => void rename.send({ conversationId: id(c), isPinned: yes }),
      archive: (c, yes) => void archive.send({ conversationId: id(c), isArchived: yes }),
      delete: setDoomed,
    }),
    [rename, archive],
  )

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
      helpHref={config.data?.helpAndFaqURL}
      onSignOut={signOut}
    />
  ) : (
    <Visitor
      collapsed={!rail}
      onLogIn={signIn}
      onSettings={preferences}
      helpHref={config.data?.helpAndFaqURL}
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
          convos={convos.items}
          activeId={here}
          loading={convos.pending}
          more={convos.more}
          onEnd={convos.next}
          open={rail}
          onOpenChange={setRail}
          drawer={narrow}
          title={brand.title}
          on={verbs}
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
          served={{
            endpoints: endpoints.data,
            models: models.data,
            specs: config.data?.modelSpecs?.list,
          }}
          account={{
            person: user ?? undefined,
            onSignOut: signOut,
            onClear: async () => {
              await dropAll.send()
              announce('Every conversation has been deleted.')
              navigate('/')
            },
            onDelete: async () => {
              await closeAccount.send()
              signOut()
            },
          }}
          apps={{
            servers: servers.data,
            status: connections.data,
            loading: servers.pending,
            onConnect: (server) => void restart.send(server),
          }}
          archive={{
            archived: archived.items,
            loading: archived.pending,
            onRestore: (id) => void archive.send({ conversationId: id, isArchived: false }),
            onDelete: async (id) => {
              await drop.send(id)
              announce('Conversation deleted.')
            },
          }}
          links={{
            links: shares.items,
            loading: shares.pending,
            onRevoke: async (shareId) => {
              await unshare.send(shareId)
              announce('That link no longer works.')
            },
          }}
        />
      ) : null}

      {doomed ? (
        <Dialog open onOpenChange={() => setDoomed(null)}>
          <DialogContent maxWidth={440}>
            <ConfirmDelete
              message={`Delete “${named(doomed)}”? Every turn in it goes with it, and there is no undo.`}
              confirmLabel="Delete conversation"
              run={async () => {
                await drop.send(id(doomed))
                announce('Conversation deleted.')
                if (here === id(doomed)) navigate('/')
              }}
              onDone={() => setDoomed(null)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </Screen>
  )
}
