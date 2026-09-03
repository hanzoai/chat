import { Screen, XStack, YStack } from '@hanzo/ui'
import { useCallback, useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router'

import { AgentBuilderModal } from '../agents/AgentBuilderModal.tsx'
import { AgentsAndAppsModal } from '../agents/AgentsAndAppsModal.tsx'
import { AutomationsModal } from '../automations/AutomationsModal.tsx'
import { BoardModal } from '../boards/BoardModal.tsx'
import { brand } from '../brand.ts'
import { api } from '../data/api.ts'
import { useModels } from '../data/config.ts'
import { useConvos } from '../data/convos.ts'
import { useSession } from '../data/session.tsx'
import type { Convo } from '../data/types.ts'
import { useNarrow } from '../gui.ts'
import { McpModal } from '../mcp/McpModal.tsx'
import { IntelligenceModal } from '../intelligence/IntelligenceModal.tsx'
import { PluginsModal } from '../plugins/PluginsModal.tsx'
import { ProjectModal } from '../projects/ProjectModal.tsx'
import { Account } from '../rail/Account.tsx'
import { id } from '../rail/group.ts'
import { Rail } from '../rail/Rail.tsx'
import { Visitor } from '../rail/Visitor.tsx'
import { Settings } from '../settings/Settings.tsx'
import { Announce } from './Announce.tsx'
import { Gate } from './Gate.tsx'
import { Palette } from './Palette.tsx'
import { Scene } from './Scene.tsx'
import { TaskQueueModal } from '../tasks/TaskQueueModal.tsx'

/**
 * What a screen inside the shell can reach.
 */
export type Frame = {
  rail: boolean
  setRail: (open: boolean) => void
  setSettings: (open: boolean) => void
}

export const useFrame = (): Frame => useOutletContext<Frame>()

export const Root = () => {
  const narrow = useNarrow()
  const navigate = useNavigate()
  const here = useMatch('/c/:id')?.params.id ?? null

  const [rail, setRail] = useState(!narrow)
  const [settings, setSettings] = useState(false)
  const [agentBuilder, setAgentBuilder] = useState(false)

  const { standing, user, signIn, signOut } = useSession()
  const mine = standing === 'live'

  const models = useModels(mine)
  const convos = useConvos(mine)

  const open = useCallback((c: Convo) => navigate(`/c/${id(c)}`), [navigate])
  const fresh = useCallback(() => navigate('/'), [navigate])
  const preferences = useCallback(() => setSettings(true), [])

  const frame = useMemo<Frame>(() => ({ rail, setRail, setSettings }), [rail])

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
      <Scene />
      <Announce />

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
      <Palette
        onSettings={preferences}
        onRail={() => setRail(true)}
        onOpenAgentBuilder={() => setAgentBuilder(true)}
      />

      {/* Mounted only while open */}
      {settings ? (
        <Settings
          open
          onOpenChange={setSettings}
          served={models.data}
          account={{
            person: user ?? undefined,
            onSignOut: signOut,
          }}
        />
      ) : null}

      {/* MCP Skills & Server Connectors Modal */}
      <McpModal />

      {/* Memory & Code Intelligence Modal */}
      <IntelligenceModal />

      {/* Agent Builder & Studio Modal */}
      <AgentBuilderModal
        isOpen={agentBuilder}
        onClose={() => setAgentBuilder(false)}
      />

      {/* Agents & Apps Hub Modal */}
      <AgentsAndAppsModal
        onOpenAgentBuilder={() => setAgentBuilder(true)}
      />

      {/* Sprint Boards & Issue Kanban Modal */}
      <BoardModal />

      {/* Durable Task Queue & CI/CD Modal */}
      <TaskQueueModal />

      {/* Projects, Organizations & User Switcher Modal */}
      <ProjectModal />

      {/* Plugins & Extensions Marketplace Modal */}
      <PluginsModal />

      {/* Scheduled Tasks & Automations Modal */}
      <AutomationsModal />
    </Screen>
  )
}
