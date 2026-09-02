/**
 * Interactive Terminal & Cloud Sandbox Panel.
 *
 * Provides real-time execution in local k3s clusters, Hanzo Cloud gVisor MicroVMs,
 * Tabs Workspace (tabs.hanzo.ai), and live ZAP zero-allocation streaming telemetry.
 */
import {
  Activity,
  Check,
  Cloud,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Shield,
  Trash2,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { terminalStore, useTerminal } from './store'

const TAB_STYLE = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 7,
  fontSize: 12,
  fontWeight: 600,
  color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: active ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
})

const ACTION_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 6,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const QUICK_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 5,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export const TerminalPanel = () => {
  const { isOpen, activeTab, k3sLogs, cloudLogs, zapLogs, tabsUrl, metrics } = useTerminal()
  const [cmd, setCmd] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const logs = activeTab === 'local-k3s' ? k3sLogs : activeTab === 'cloud-microvm' ? cloudLogs : zapLogs

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (cmd.trim()) {
      terminalStore.executeCommand(cmd)
      setCmd('')
    }
  }

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback
    }
  }

  return (
    <YStack
      width="100%"
      maxWidth={620}
      height="100%"
      borderLeftWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
      backgroundColor="rgba(8, 8, 10, 0.96)"
      style={{
        backdropFilter: 'blur(32px) saturate(190%)',
        WebkitBackdropFilter: 'blur(32px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 35,
      }}
    >
      {/* Top Bar */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.07)"
      >
        <XStack gap="$1.5" flexWrap="wrap" flex={1}>
          <button
            type="button"
            onClick={() => terminalStore.setTab('local-k3s')}
            style={TAB_STYLE(activeTab === 'local-k3s')}
          >
            <Zap size={13} style={{ color: activeTab === 'local-k3s' ? '#34d399' : 'currentColor' }} />
            <span>Local k3s</span>
          </button>

          <button
            type="button"
            onClick={() => terminalStore.setTab('tabs-workspace')}
            style={TAB_STYLE(activeTab === 'tabs-workspace')}
          >
            <Layers size={13} style={{ color: activeTab === 'tabs-workspace' ? '#a78bfa' : 'currentColor' }} />
            <span>Tabs (tabs.hanzo.ai)</span>
          </button>

          <button
            type="button"
            onClick={() => terminalStore.setTab('cloud-microvm')}
            style={TAB_STYLE(activeTab === 'cloud-microvm')}
          >
            <Cloud size={13} style={{ color: activeTab === 'cloud-microvm' ? '#60a5fa' : 'currentColor' }} />
            <span>Cloud MicroVM</span>
          </button>

          <button
            type="button"
            onClick={() => terminalStore.setTab('zap-telemetry')}
            style={TAB_STYLE(activeTab === 'zap-telemetry')}
          >
            <Activity size={13} style={{ color: activeTab === 'zap-telemetry' ? '#fbbf24' : 'currentColor' }} />
            <span>ZAP Stream</span>
          </button>
        </XStack>

        <XStack alignItems="center" gap="$1.5">
          {activeTab === 'tabs-workspace' && (
            <button
              type="button"
              title="Open tabs.hanzo.ai in new window"
              onClick={() => window.open(tabsUrl, '_blank', 'noopener,noreferrer')}
              style={ACTION_BTN}
            >
              <ExternalLink size={13} />
            </button>
          )}

          <button
            type="button"
            title="Copy logs"
            onClick={handleCopyLogs}
            style={ACTION_BTN}
          >
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            title="Clear terminal"
            onClick={() => terminalStore.clearLogs()}
            style={ACTION_BTN}
          >
            <Trash2 size={13} />
          </button>

          <button
            type="button"
            title="Close terminal"
            onClick={() => terminalStore.close()}
            style={ACTION_BTN}
          >
            <X size={14} />
          </button>
        </XStack>
      </XStack>

      {/* Metrics Strip */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingVertical="$1.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.05)"
        backgroundColor="rgba(255, 255, 255, 0.01)"
      >
        <XStack gap="$3" alignItems="center">
          <XStack alignItems="center" gap="$1">
            <Cpu size={11} color="rgba(255, 255, 255, 0.4)" />
            <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
              CPU: <strong>{metrics.cpuPercent}%</strong>
            </SizableText>
          </XStack>

          <XStack alignItems="center" gap="$1">
            <Shield size={11} color="rgba(255, 255, 255, 0.4)" />
            <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
              RAM: <strong>{metrics.memMb} MB</strong>
            </SizableText>
          </XStack>

          <XStack alignItems="center" gap="$1">
            <Zap size={11} color="#34d399" />
            <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
              p99: <strong>{metrics.microvmLatencyMs}ms</strong>
            </SizableText>
          </XStack>
        </XStack>

        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(52, 211, 153, 0.12)',
            color: '#34d399',
            border: '1px solid rgba(52, 211, 153, 0.25)',
          }}
        >
          CONNECTED
        </span>
      </XStack>

      {/* Quick Action Chips */}
      <XStack
        gap="$1.5"
        paddingHorizontal="$3"
        paddingVertical="$1.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.04)"
        overflow="hidden"
        flexWrap="wrap"
      >
        <button
          type="button"
          onClick={() => terminalStore.executeCommand('kubectl get pods -n hanzo-sandbox')}
          style={QUICK_BTN}
        >
          $ kubectl get pods
        </button>
        <button
          type="button"
          onClick={() => terminalStore.executeCommand('pnpm build')}
          style={QUICK_BTN}
        >
          $ pnpm build
        </button>
        <button
          type="button"
          onClick={() => terminalStore.executeCommand('hanzo cloud microvm status')}
          style={QUICK_BTN}
        >
          $ hanzo microvm
        </button>
      </XStack>

      {/* Main Panel View */}
      {activeTab === 'tabs-workspace' ? (
        <YStack flex={1} minHeight={0} position="relative">
          <iframe
            title="Tabs Workspace"
            src={tabsUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#09090b',
            }}
          />
        </YStack>
      ) : (
        <>
          {/* Live Log Area */}
          <YStack
            flex={1}
            minHeight={0}
            backgroundColor="#050507"
            padding="$3"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              lineHeight: 1.55,
              overflowY: 'auto',
            }}
          >
            {logs.map((line, idx) => {
              const isCmd = line.startsWith('$')
              const isCheck = line.includes('✔') || line.includes('online') || line.includes('Ready')
              const isHead = line.startsWith('⚡') || line.startsWith('☁️') || line.startsWith('🚀')
              return (
                <div
                  key={idx}
                  style={{
                    color: isCmd
                      ? '#60a5fa'
                      : isCheck
                      ? '#34d399'
                      : isHead
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: isHead || isCmd ? 600 : 400,
                    marginBottom: 3,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {line}
                </div>
              )
            })}
          </YStack>

          {/* Interactive Command Shell Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
              $
            </span>
            <input
              type="text"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              placeholder="Run sandbox or k3s command (e.g. kubectl get pods, pnpm test)..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 12.5,
              }}
            />
            <button
              type="submit"
              className="tap"
              style={{
                padding: '4px 10px',
                borderRadius: 5,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Run
            </button>
          </form>
        </>
      )}
    </YStack>
  )
}
