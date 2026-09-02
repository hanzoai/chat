/**
 * Plugins and Extensions Marketplace Store.
 */
import { useEffect, useState } from 'react'
import type { PluginExtension } from './types'

export interface PluginsState {
  isOpen: boolean
  plugins: PluginExtension[]
}

const DEFAULT_PLUGINS: PluginExtension[] = [
  {
    id: 'plugin-github-actions',
    name: 'GitHub Actions & CI/CD Trigger',
    version: '2.4.1',
    author: 'Hanzo Labs',
    description: 'Dispatch automated test suites, build Docker images, and tag releases directly from agent workflows.',
    iconName: 'GitPullRequest',
    category: 'devtools',
    installed: true,
    enabled: true,
    downloads: '14.2k',
    rating: 4.9,
  },
  {
    id: 'plugin-pgvector-indexer',
    name: 'PostgreSQL pgvector Auto-Indexer',
    version: '1.8.0',
    author: 'Database Core',
    description: 'Automatic AST code embedding extraction, vector index reindexing, and fast cosine similarity search.',
    iconName: 'Database',
    category: 'database',
    installed: true,
    enabled: true,
    downloads: '9.8k',
    rating: 4.8,
  },
  {
    id: 'plugin-kms-enclave',
    name: 'KMS Hardware Enclave Key Rotation',
    version: '3.1.2',
    author: 'SecOps Team',
    description: 'Hardware envelope encryption with automated 30-day ECDSA key rotation and zero-trust IAM attestation.',
    iconName: 'Shield',
    category: 'security',
    installed: true,
    enabled: true,
    downloads: '6.4k',
    rating: 5.0,
  },
  {
    id: 'plugin-figma-sync',
    name: 'Figma to Next.js 16 Component Sync',
    version: '1.2.0',
    author: 'Design Systems',
    description: 'Import Figma design tokens and auto-generate @hanzo/ui TypeScript components in the live worktree.',
    iconName: 'Sparkles',
    category: 'devtools',
    installed: false,
    enabled: false,
    downloads: '8.1k',
    rating: 4.7,
  },
  {
    id: 'plugin-zap-telemetry',
    name: 'ZAP Real-time Profiler & Telemetry',
    version: '0.9.4',
    author: 'Performance Eng',
    description: 'Zero-allocation binary stream telemetry, eBPF packet inspections, and sub-millisecond latency graphs.',
    iconName: 'Zap',
    category: 'cloud',
    installed: true,
    enabled: true,
    downloads: '11.5k',
    rating: 4.9,
  },
]

let state: PluginsState = {
  isOpen: false,
  plugins: DEFAULT_PLUGINS,
}

const listeners = new Set<(state: PluginsState) => void>()
const notify = () => listeners.forEach((fn) => fn(state))

export const pluginsStore = {
  get: () => state,
  open: () => {
    state = { ...state, isOpen: true }
    notify()
  },
  close: () => {
    state = { ...state, isOpen: false }
    notify()
  },
  toggle: () => {
    state = { ...state, isOpen: !state.isOpen }
    notify()
  },
  toggleInstall: (pluginId: string) => {
    state = {
      ...state,
      plugins: state.plugins.map((p) =>
        p.id === pluginId
          ? { ...p, installed: !p.installed, enabled: !p.installed ? true : false }
          : p,
      ),
    }
    notify()
  },
  toggleEnable: (pluginId: string) => {
    state = {
      ...state,
      plugins: state.plugins.map((p) =>
        p.id === pluginId ? { ...p, enabled: !p.enabled } : p,
      ),
    }
    notify()
  },
}

export const usePlugins = () => {
  const [val, setVal] = useState<PluginsState>(state)
  useEffect(() => {
    listeners.add(setVal)
    return () => {
      listeners.delete(setVal)
    }
  }, [])
  return val
}
