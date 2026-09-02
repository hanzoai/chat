/**
 * Terminal and Cloud Sandbox state management.
 */
import { useEffect, useState } from 'react'

export type CloudTab = 'local-k3s' | 'cloud-microvm' | 'zap-telemetry' | 'tabs-workspace'

export interface TerminalState {
  isOpen: boolean
  activeTab: CloudTab
  k3sLogs: string[]
  cloudLogs: string[]
  zapLogs: string[]
  tabsUrl: string
  commandInput: string
  isRunning: boolean
  metrics: {
    cpuPercent: number
    memMb: number
    zapThroughput: number
    microvmLatencyMs: number
  }
}

const DEFAULT_STATE: TerminalState = {
  isOpen: false,
  activeTab: 'local-k3s',
  k3sLogs: [
    '⚡ Local k3s Cluster v1.31.0-k3s1 (linux/amd64)',
    '✔ CoreDNS, Traefik v3, Local Path Provisioner active',
    '✔ Namespace [hanzo-sandbox] ready',
    'pod/sandbox-worker-7f89d   1/1   Running   0   42s',
    '$ pnpm dev --port 8080 --host',
    '[dev] Ready in 280ms on http://localhost:8080',
  ],
  cloudLogs: [
    '☁️ Hanzo Cloud MicroVM Sandbox (gVisor Enclave)',
    '🔒 Hardware KMS Envelope Encryption initialized (AES-256-GCM)',
    '🛡️ Egress Policy: Strict Zero-Trust allowlist',
    '✔ MicroVM booted in 38ms (ID: uvm-hanzo-8829a)',
    '✔ Live URL: https://uvm-hanzo-8829a.sandboxes.hanzo.ai',
  ],
  zapLogs: [
    '🚀 ZAP (Zero-Allocation Protocol) Stream Telemetry',
    '📡 Connected to NATS cluster: nats://edge.hanzo.ai:4222',
    '⚡ Channel: zap.stream.v1.events',
    '[ZAP] Throughput: 14,820 msgs/sec | p99: 0.18ms | Mem alloc: 0 B',
  ],
  tabsUrl: 'https://tabs.hanzo.ai/app',
  commandInput: '',
  isRunning: true,
  metrics: {
    cpuPercent: 12.4,
    memMb: 86.2,
    zapThroughput: 14820,
    microvmLatencyMs: 0.18,
  },
}

let terminalState: TerminalState = { ...DEFAULT_STATE }
const listeners = new Set<(s: TerminalState) => void>()

const notify = () => {
  listeners.forEach((fn) => fn(terminalState))
}

export const terminalStore = {
  get: (): TerminalState => terminalState,

  open: (tab?: CloudTab) => {
    terminalState = {
      ...terminalState,
      isOpen: true,
      activeTab: tab || terminalState.activeTab,
    }
    notify()
  },

  close: () => {
    terminalState = { ...terminalState, isOpen: false }
    notify()
  },

  toggle: () => {
    terminalState = { ...terminalState, isOpen: !terminalState.isOpen }
    notify()
  },

  setTab: (activeTab: CloudTab) => {
    terminalState = { ...terminalState, activeTab }
    notify()
  },

  setTabsUrl: (tabsUrl: string) => {
    terminalState = { ...terminalState, tabsUrl }
    notify()
  },

  executeCommand: (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    const timestamp = new Date().toLocaleTimeString()
    let response = `[${timestamp}] Command completed with exit code 0`

    if (trimmed.startsWith('kubectl') || trimmed.startsWith('k3s')) {
      response = `pod/sandbox-app-worker-99d   1/1   Running   0   12s\nservice/sandbox-http   NodePort   10.43.0.12   8080:31245/TCP   12s`
    } else if (trimmed.startsWith('pnpm') || trimmed.startsWith('npm')) {
      response = `✔ Build succeeded in 0.42s (0 errors, 0 warnings)`
    } else if (trimmed.startsWith('hanzo cloud')) {
      response = `☁️ Hanzo MicroVM deployed: https://uvm-sandbox.hanzo.ai`
    }

    terminalState = {
      ...terminalState,
      k3sLogs: [...terminalState.k3sLogs, `$ ${trimmed}`, response],
      commandInput: '',
    }
    notify()
  },

  clearLogs: () => {
    terminalState = {
      ...terminalState,
      k3sLogs: [`$ clear`],
    }
    notify()
  },
}

export const useTerminal = (): TerminalState => {
  const [current, setCurrent] = useState<TerminalState>(terminalState)

  useEffect(() => {
    const handler = (next: TerminalState) => setCurrent(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return current
}
