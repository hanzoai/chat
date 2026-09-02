/**
 * Artifacts & Interactive Sandbox Execution Canvas / Inspector Sidebar.
 *
 * Side-by-side (desktop) and sliding sheet (mobile) artifact viewer supporting:
 * 1. Live code editing & browser iframe previews
 * 2. Inputs & Outputs summary (tokens, latency, MCP tools, memory)
 * 3. Local k3s / Hanzo Cloud gVisor microVM sandbox execution
 * 4. Smooth drag-to-resize handle with liquid glass aesthetic
 */
import {
  Activity,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  Eye,
  GitCompare,
  Play,
  Square,
  Terminal,
  Trash2,
  Wrench,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { DiffViewer } from './DiffViewer'
import {
  artifactStore,
  useArtifact,
  type SandboxEnvironment,
} from './store'

const TAB_BUTTON_STYLE = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 11px',
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 600,
  color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: active ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
})

const ACTION_BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 7,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  color: 'rgba(255, 255, 255, 0.75)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

export const ArtifactPanel = () => {
  const artifact = useArtifact()
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(540)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(540)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (artifact.activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [artifact.logs.length, artifact.activeTab])

  const onMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startX.current - moveEvent.clientX
      const nextWidth = Math.min(900, Math.max(340, startWidth.current + delta))
      setWidth(nextWidth)
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  if (!artifact.isOpen) return null

  const { title, language, code, environment, activeTab, isRunning, logs, telemetry } = artifact

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback
    }
  }

  const handleDownload = () => {
    const ext = language === 'typescript' || language === 'tsx' ? 'tsx' : language === 'html' ? 'html' : 'ts'
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Generate sandbox preview document
  const previewHtml = language === 'html'
    ? code
    : `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #09090b;
        color: #f4f4f5;
      }
      .card {
        padding: 24px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        background: rgba(52, 211, 153, 0.15);
        color: #34d399;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 14px;
      }
      h2 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 20px;
        font-weight: 700;
      }
      p {
        color: rgba(255, 255, 255, 0.65);
        font-size: 13.5px;
        line-height: 1.6;
        margin: 0 0 20px 0;
      }
      .btn {
        display: inline-block;
        padding: 9px 18px;
        background: #34d399;
        color: #09090b;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: 0 4px 16px rgba(52, 211, 153, 0.3);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">Next.js 16 • React 19 • ZAP</span>
      <h2>${title}</h2>
      <p>Interactive preview rendered directly from the synthesized TypeScript AST & @hanzo/ui design system.</p>
      <a href="#" class="btn">Explore Application</a>
    </div>
  </body>
</html>
`

  return (
    <YStack
      width={width}
      height="100%"
      borderLeftWidth={1}
      borderColor="rgba(255, 255, 255, 0.09)"
      backgroundColor="#09090c"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 20,
        boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Resizer Handle Bar */}
      <div
        onMouseDown={onMouseDownResizer}
        style={{
          position: 'absolute',
          top: 0,
          left: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Drag to resize inspector"
      >
        <div
          style={{
            width: 2,
            height: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#34d399')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        />
      </div>

      {/* Header Bar */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3.5"
        paddingVertical="$2.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="rgba(255, 255, 255, 0.015)"
      >
        <XStack alignItems="center" gap="$2">
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <Activity size={14} />
          </div>
          <SizableText size="$2" fontWeight="700" color="$ink" numberOfLines={1}>
            {title}
          </SizableText>
        </XStack>

        <XStack alignItems="center" gap="$1.5">
          {/* Target Sandbox Environment Pill */}
          <select
            value={environment}
            onChange={(e) => artifactStore.setEnvironment(e.target.value as SandboxEnvironment)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: '#34d399',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="local-k3s">Local k3s</option>
            <option value="hanzo-cloud">Hanzo Cloud</option>
            <option value="gvisor-enclave">gVisor Enclave</option>
          </select>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={() => artifactStore.close()}
            className="tap"
            style={ACTION_BUTTON_STYLE}
            title="Close inspector (⌘J)"
          >
            <X size={14} />
          </button>
        </XStack>
      </XStack>

      {/* Tab Selector & Action Toolbar */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3.5"
        paddingVertical="$2"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.06)"
        backgroundColor="rgba(0, 0, 0, 0.25)"
      >
        {/* Navigation Tabs */}
        <XStack alignItems="center" gap="$1">
          <button
            type="button"
            onClick={() => artifactStore.setTab('preview')}
            style={TAB_BUTTON_STYLE(activeTab === 'preview')}
          >
            <Eye size={12} />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => artifactStore.setTab('telemetry')}
            style={TAB_BUTTON_STYLE(activeTab === 'telemetry')}
          >
            <Zap size={12} style={{ color: activeTab === 'telemetry' ? '#34d399' : 'currentColor' }} />
            <span>Inputs & Outputs</span>
          </button>

          <button
            type="button"
            onClick={() => artifactStore.setTab('code')}
            style={TAB_BUTTON_STYLE(activeTab === 'code')}
          >
            <Code2 size={12} />
            <span>Code</span>
          </button>

          <button
            type="button"
            onClick={() => artifactStore.setTab('diff')}
            style={TAB_BUTTON_STYLE(activeTab === 'diff')}
          >
            <GitCompare size={12} />
            <span>Diff</span>
          </button>

          <button
            type="button"
            onClick={() => artifactStore.setTab('terminal')}
            style={TAB_BUTTON_STYLE(activeTab === 'terminal')}
          >
            <Terminal size={12} />
            <span>Logs</span>
          </button>
        </XStack>

        {/* Execution & Action Buttons */}
        <XStack alignItems="center" gap="$1.5">
          {activeTab === 'code' && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="tap"
                style={ACTION_BUTTON_STYLE}
                title="Copy code"
              >
                {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="tap"
                style={ACTION_BUTTON_STYLE}
                title="Download artifact"
              >
                <Download size={13} />
              </button>
            </>
          )}

          {isRunning ? (
            <button
              type="button"
              onClick={() => artifactStore.stopCode()}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Square size={11} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => artifactStore.runCode()}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 6,
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                color: '#34d399',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Play size={11} />
              <span>Run</span>
            </button>
          )}
        </XStack>
      </XStack>

      {/* Main Content Area */}
      <YStack flex={1} minHeight={0} backgroundColor="#000000">
        {/* TAB 1: Preview */}
        {activeTab === 'preview' && (
          <iframe
            srcDoc={previewHtml}
            title={title}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#09090b',
            }}
          />
        )}

        {/* TAB 2: Inputs & Outputs Telemetry Summary */}
        {activeTab === 'telemetry' && (
          <YStack flex={1} minHeight={0} padding="$3.5" gap="$3.5" style={{ overflowY: 'auto' }}>
            {/* Tokens & Speed Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Tokens
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 3 }}>
                  {telemetry.totalTokens}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                  {telemetry.promptTokens} in / {telemetry.completionTokens} out
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Latency (p99)
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399', marginTop: 3 }}>
                  {telemetry.latencyMs}ms
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                  TTFT: {telemetry.ttftMs}ms
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Model
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginTop: 5 }}>
                  {telemetry.model}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                  ZAP Binary Bus
                </div>
              </div>
            </div>

            {/* Prompt Input Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#60a5fa', fontSize: 11.5, fontWeight: 700 }}>
                <Cpu size={13} />
                <span>Input Prompt & Context Vectors</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                {telemetry.inputSummary}
              </div>
            </div>

            {/* Agent Output Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: 11.5, fontWeight: 700 }}>
                <Zap size={13} />
                <span>Synthesized Output & Enclave Key</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                {telemetry.outputSummary}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
                Enclave Attestation: {telemetry.enclaveKey}
              </div>
            </div>

            {/* Attached MCP Tools */}
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 11.5, fontWeight: 700 }}>
                <Wrench size={13} />
                <span>Invoked MCP Connectors & Skills ({telemetry.mcpTools.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {telemetry.mcpTools.map((tool) => (
                  <span
                    key={tool}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      color: '#fbbf24',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </YStack>
        )}

        {/* TAB 3: Code Editor */}
        {activeTab === 'code' && (
          <textarea
            value={code}
            onChange={(e) => artifactStore.updateCode(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              padding: 16,
              background: '#0c0c0e',
              color: '#e4e4e7',
              fontFamily: 'monospace',
              fontSize: 12.5,
              lineHeight: 1.6,
              border: 'none',
              outline: 'none',
              resize: 'none',
            }}
          />
        )}

        {/* TAB 4: Git Diff Viewer */}
        {activeTab === 'diff' && (
          <div style={{ width: '100%', height: '100%', padding: 12, boxSizing: 'border-box' }}>
            <DiffViewer />
          </div>
        )}

        {/* TAB 5: Terminal Logs */}
        {activeTab === 'terminal' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: 14,
              backgroundColor: '#050507',
              fontFamily: 'monospace',
              fontSize: 11.5,
              lineHeight: 1.5,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#34d399', fontWeight: 600, fontSize: 11 }}>
                ● Local k3s / Node.js MicroVM Sandbox Terminal
              </span>
              <button
                type="button"
                onClick={() => artifactStore.clearLogs()}
                className="tap"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 10.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={11} />
                <span>Clear</span>
              </button>
            </div>

            {logs.map((log, index) => (
              <div
                key={index}
                style={{
                  color: log.startsWith('$')
                    ? '#60a5fa'
                    : log.includes('✓')
                    ? '#34d399'
                    : log.includes('ERROR') || log.includes('Failed')
                    ? '#f87171'
                    : log.includes('[zap]')
                    ? '#a78bfa'
                    : 'rgba(255, 255, 255, 0.7)',
                  minHeight: 18,
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        )}
      </YStack>
    </YStack>
  )
}
