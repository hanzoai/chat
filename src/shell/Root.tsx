import { Screen, XStack, YStack } from '@hanzo/ui'
import { useCallback, useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useOutletContext } from 'react-router'

import { AgentBuilderModal } from '~/agents/AgentBuilderModal'
import { AgentsAndAppsModal } from '~/agents/AgentsAndAppsModal'
import { AppWorkspaceModal } from '~/apps/AppWorkspaceModal'
import { AutomationsModal } from '~/automations/AutomationsModal'
import { BoardModal } from '~/boards/BoardModal'
import { brand } from '~/brand'
import { CreateChannelModal } from '~/channels/CreateChannelModal'
import { api } from '~/data/api'
import { useModels } from '~/data/config'
import { useConvos } from '~/data/convos'
import { useSession } from '~/data/session'
import type { Convo } from '~/data/types'
import { useNarrow } from '~/gui'
import { IntelligenceModal } from '~/intelligence/IntelligenceModal'
import { McpModal } from '~/mcp/McpModal'
import { PluginsModal } from '~/plugins/PluginsModal'
import { ProjectModal } from '~/projects/ProjectModal'
import { Account } from '~/rail/Account'
import { id } from '~/rail/group'
import { Rail } from '~/rail/Rail'
import { Visitor } from '~/rail/Visitor'
import { Settings } from '~/settings/Settings'
import { Announce } from '~/shell/Announce'
import { Gate } from '~/shell/Gate'
import { Palette } from '~/shell/Palette'
import { Scene } from '~/shell/Scene'
import { TaskQueueModal } from '~/tasks/TaskQueueModal'

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
          served={{ models: models.data }}
          account={{
            person: user ?? undefined,
            onSignOut: signOut,
          }}
        />
      ) : null}

      {/* Channel Creation Modal */}
      <CreateChannelModal />

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

      {/* Unified Micro-Apps Suite: tasks, notes, todo, meet, tunnel */}
      <AppWorkspaceModal />

      {/* Projects, Organizations & User Switcher Modal */}
      <ProjectModal />

      {/* Plugins & Extensions Marketplace Modal */}
      <PluginsModal />

      {/* Scheduled Tasks & Automations Modal */}
      <AutomationsModal />
    </Screen>
  )
}
