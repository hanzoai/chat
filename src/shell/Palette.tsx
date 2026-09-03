import { Palette as Bar, useCommandK, type Op } from '@hanzo/ui/product'
import {
  Blocks,
  Brain,
  Bot,
  Clock,
  Code2,
  FolderGit2,
  Hash,
  Kanban,
  ListTodo,
  LogIn,
  LogOut,
  PanelLeft,
  PanelRight,
  Settings,
  SquarePen,
  Terminal,
  UserPlus,
  UserRound,
} from '@hanzogui/lucide-icons-2'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { swarmStore } from '../agents/store.ts'
import { artifactStore } from '../artifact/store.ts'
import { automationsStore } from '../automations/store.ts'
import { boardStore } from '../boards/store.ts'
import { channelsStore } from '../channels/store.ts'
import { api } from '../data/api.ts'
import { useSession } from '../data/session.tsx'
import { intelligenceStore } from '../intelligence/store.ts'
import { mcpStore } from '../mcp/store.ts'
import { pluginsStore } from '../plugins/store.ts'
import { multiplayerStore } from '../presence/store.ts'
import { projectsStore } from '../projects/store.ts'
import { taskQueueStore } from '../tasks/store.ts'
import { terminalStore } from '../terminal/store.ts'

export interface PaletteProps {
  onSettings: () => void
  onRail: () => void
  onOpenAgentBuilder?: () => void
}

/**
 * ⌘K, on every route this app answers.
 */
export const Palette = ({ onSettings, onRail, onOpenAgentBuilder }: PaletteProps) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { standing, signIn, signOut } = useSession()

  useCommandK(useCallback(() => setOpen((was) => !was), []))

  // Global hotkeys for instant agentic surfaces:
  // ⌘` or ⌘\ -> Toggle Terminal & Cloud Sandbox
  // ⌘J -> Toggle Swarm Mode
  // ⌘M -> Toggle MCP Skills & Connectors
  // ⌘B -> Open Sprint Boards
  // ⌘Q -> Open Durable Task Queue
  // ⌘T -> Open Zero-Trust Tunnel Sharing
  // ⌘P -> Open Projects & Switcher
  // ⌘X -> Open Plugins Marketplace
  // ⌘A -> Open Scheduled Tasks & Automations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && (e.key === '`' || e.key === '\\')) {
        e.preventDefault()
        terminalStore.toggle()
      } else if (isCmd && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault()
        artifactStore.toggle()
      } else if (isCmd && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        mcpStore.toggle()
      } else if (isCmd && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        boardStore.toggle()
      } else if (isCmd && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault()
        taskQueueStore.toggle()
      } else if (isCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        projectsStore.toggle()
      } else if (isCmd && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        pluginsStore.toggle()
      } else if (isCmd && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault()
        swarmStore.toggleHub()
      } else if (isCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        automationsStore.toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const ops = useMemo<Op[]>(() => {
    const list: Op[] = [
      {
        id: 'new',
        group: 'Chat',
        label: 'New chat',
        hint: 'Start a conversation',
        icon: <SquarePen size={15} />,
      },
      {
        id: 'agents_apps',
        group: 'Agentic & Cloud',
        label: 'Agents and Apps Hub',
        hint: 'AI agents, micro-apps, plugins, and automations (⌘E)',
        icon: <Bot size={15} />,
      },
      {
        id: 'projects',
        group: 'Workspace & Organization',
        label: 'Projects & Workspaces',
        hint: 'Switch projects, create repos, assign agents (⌘P)',
        icon: <FolderGit2 size={15} />,
      },
      {
        id: 'plugins',
        group: 'Extensions & Tools',
        label: 'Plugins & Extensions Marketplace',
        hint: 'CI/CD, pgvector, KMS enclaves, ZAP profiler (⌘X)',
        icon: <Blocks size={15} />,
      },
      {
        id: 'automations',
        group: 'Extensions & Tools',
        label: 'Scheduled Tasks & Automations',
        hint: 'Cron jobs, git push hooks, agent schedules (⌘A)',
        icon: <Clock size={15} />,
      },
      {
        id: 'inspector',
        group: 'Agentic & Cloud',
        label: 'Toggle Inspector & Right Sidebar',
        hint: 'Inputs/outputs telemetry summary, preview iframe, logs (⌘J)',
        icon: <PanelRight size={15} />,
      },
      {
        id: 'terminal',
        group: 'Agentic & Cloud',
        label: 'Toggle Terminal & Cloud Sandbox',
        hint: 'Local k3s, MicroVMs, Tabs, ZAP stream (⌘\\)',
        icon: <Terminal size={15} />,
      },
      {
        id: 'tasks',
        group: 'Agentic & Cloud',
        label: 'tasks.hanzo.ai & CI/CD Pipelines',
        hint: 'Orchestrate async background tasks & builds (⌘Q)',
        icon: <ListTodo size={15} />,
      },
      {
        id: 'boards',
        group: 'Agentic & Cloud',
        label: 'Sprint Boards & Agent Tasks',
        hint: 'Kanban issues with autonomous agent dispatch (⌘B)',
        icon: <Kanban size={15} />,
      },
      {
        id: 'mcp',
        group: 'Agentic & Cloud',
        label: 'MCP Skills & Server Connectors',
        hint: 'Filesystem, GitHub, Postgres, k3s, Web Search (⌘M)',
        icon: <Blocks size={15} />,
      },
      {
        id: 'intelligence',
        group: 'Agentic & Cloud',
        label: 'Memory & Code Intelligence',
        hint: 'What the estate remembers, and a search of the code index',
        icon: <Brain size={15} />,
      },
      {
        id: 'builder',
        group: 'Agentic & Cloud',
        label: 'Agent Builder & Studio',
        hint: 'Create and deploy custom agent specialists',
        icon: <Bot size={15} />,
      },
      {
        id: 'canvas',
        group: 'Agentic & Cloud',
        label: 'Open Artifact Canvas',
        hint: 'Live code editor and preview iframe',
        icon: <Code2 size={15} />,
      },
      {
        id: 'channel',
        group: 'Collaboration',
        label: 'Create Channel or Group',
        hint: 'New topic or informal agent room',
        icon: <Hash size={15} />,
      },
      {
        id: 'invite',
        group: 'Collaboration',
        label: 'Invite Friends & Multiplayer Collaboration',
        hint: 'Multiplayer room share & co-piloting',
        icon: <UserPlus size={15} />,
      },
      {
        id: 'rail',
        group: 'Chat',
        label: 'Show conversations',
        hint: 'Open the left column',
        icon: <PanelLeft size={15} />,
      },
      {
        id: 'settings',
        group: 'You',
        label: 'Settings',
        hint: 'Model, appearance, account',
        icon: <Settings size={15} />,
      },
    ]

    if (standing === 'live') {
      list.push(
        {
          id: 'account',
          group: 'You',
          label: 'Account',
          hint: 'Manage your identity',
          icon: <UserRound size={15} />,
        },
        { id: 'signout', group: 'You', label: 'Log out', icon: <LogOut size={15} /> },
      )
    } else {
      list.push({ id: 'signin', group: 'You', label: 'Log in', icon: <LogIn size={15} /> })
    }

    return list
  }, [standing])

  const run = useCallback(
    (op: Op) => {
      switch (op.id) {
        case 'new':
          navigate('/')
          break
        case 'agents_apps':
          swarmStore.openHub()
          break
        case 'projects':
        case 'plugins':
          pluginsStore.open()
          break
        case 'automations':
          automationsStore.open()
          break
        case 'inspector':
          artifactStore.toggle()
          break
        case 'terminal':
          terminalStore.toggle()
          break
        case 'tasks':
          taskQueueStore.open()
          break
        case 'boards':
          boardStore.open()
          break
        case 'mcp':
          mcpStore.open()
          break
        case 'intelligence':
          intelligenceStore.open()
          break
        case 'builder':
          onOpenAgentBuilder?.()
          break
        case 'canvas':
          artifactStore.open({
            title: 'Untitled Sandbox',
            code: '// Write TypeScript, TSX or HTML code here\nconsole.log("Hello from Hanzo Sandbox!");',
            language: 'typescript',
          })
          break
        case 'channel':
          channelsStore.open()
          break
        case 'invite':
          multiplayerStore.openInvite()
          break
        case 'rail':
          onRail()
          break
        case 'settings':
          onSettings()
          break
        case 'account':
          window.open(api.iam.account, '_blank', 'noopener')
          break
        case 'signin':
          void signIn()
          break
        case 'signout':
          void signOut()
          break
      }
    },
    [navigate, onOpenAgentBuilder, onRail, onSettings, signIn, signOut],
  )

  return <Bar open={open} onOpenChange={setOpen} ops={ops} onRun={run} />
}
