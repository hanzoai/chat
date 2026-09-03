/**
 * The artifact, side by side with the conversation.
 *
 * Four tabs, each showing something that exists. Code is the text itself.
 * Preview renders that text, and is drawn only for a language the browser can
 * render alone. Logs are the sandbox's, shared with the terminal. Turn is what
 * the composer reported about the last exchange.
 *
 * There is no Diff tab, because the served contract answers no diff for a chat
 * artifact and there is nothing to bind a viewer to.
 */
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Play,
  Square,
  Terminal,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { useLease, type Line } from '../terminal/sandbox.ts'
import { artifactStore, previewable, runner, useArtifact, type ArtifactTab } from './store.ts'

const TAB = (active: boolean): CSSProperties => ({
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

const ACTION: CSSProperties = {
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

const CARD: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const INK: Record<Line['kind'], string> = {
  said: '#60a5fa',
  out: 'rgba(255, 255, 255, 0.82)',
  err: '#f87171',
  note: 'rgba(255, 255, 255, 0.45)',
}

const NOTHING: CSSProperties = {
  padding: 24,
  fontSize: 12.5,
  color: 'rgba(255, 255, 255, 0.45)',
  lineHeight: 1.6,
}

export const ArtifactPanel = () => {
  const { title, language, code, activeTab, isOpen, turn } = useArtifact()
  const { lines, busy } = useLease()
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(540)
  const dragging = useRef(false)
  const from = useRef(0)
  const was = useRef(540)
  const end = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (activeTab === 'logs') end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length, activeTab])

  const grab = (event: React.MouseEvent) => {
    event.preventDefault()
    dragging.current = true
    from.current = event.clientX
    was.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const move = (moved: MouseEvent) => {
      if (!dragging.current) return
      setWidth(Math.min(900, Math.max(340, was.current + (from.current - moved.clientX))))
    }
    const drop = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', drop)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', drop)
  }

  if (!isOpen) return null

  const how = runner(language)
  const shows = previewable(language)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const ext = shows ? language : (how?.ext ?? 'txt')
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || 'artifact'}.${ext}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const tabs: [ArtifactTab, string, typeof Code2][] = [
    ['code', 'Code', Code2],
    ...(shows ? ([['preview', 'Preview', Eye]] as [ArtifactTab, string, typeof Code2][]) : []),
    ['turn', 'Turn', Zap],
    ['logs', 'Logs', Terminal],
  ]

  const tab = tabs.some(([which]) => which === activeTab) ? activeTab : 'code'

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
      <div
        onMouseDown={grab}
        title="Drag to resize"
        style={{
          position: 'absolute',
          top: 0,
          left: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 40,
        }}
      >
        <div style={{ width: 2, height: '100%', background: 'rgba(255, 255, 255, 0.08)' }} />
      </div>

      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3.5"
        paddingVertical="$2.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.08)"
        backgroundColor="rgba(255, 255, 255, 0.015)"
      >
        <SizableText size="$2" fontWeight="700" color="$ink" numberOfLines={1}>
          {title || 'Artifact'}
        </SizableText>
        <button type="button" onClick={() => artifactStore.close()} className="tap" style={ACTION} title="Close (⌘J)">
          <X size={14} />
        </button>
      </XStack>

      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3.5"
        paddingVertical="$2"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.06)"
        backgroundColor="rgba(0, 0, 0, 0.25)"
      >
        <XStack alignItems="center" gap="$1">
          {tabs.map(([which, label, Icon]) => (
            <button key={which} type="button" onClick={() => artifactStore.setTab(which)} style={TAB(tab === which)}>
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </XStack>

        <XStack alignItems="center" gap="$1.5">
          {tab === 'code' && (
            <>
              <button type="button" onClick={copy} className="tap" style={ACTION} title="Copy code">
                {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              </button>
              <button type="button" onClick={download} className="tap" style={ACTION} title="Download">
                <Download size={13} />
              </button>
            </>
          )}

          {/* Drawn only for a language with an interpreter to name. */}
          {how &&
            (busy ? (
              <button
                type="button"
                onClick={() => void artifactStore.stop()}
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
                onClick={() => void artifactStore.run()}
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
            ))}
        </XStack>
      </XStack>

      <YStack flex={1} minHeight={0} backgroundColor="#000000">
        {tab === 'code' && (
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

        {tab === 'preview' && (
          <iframe
            srcDoc={code}
            title={title || 'Preview'}
            sandbox="allow-scripts"
            style={{ width: '100%', height: '100%', border: 'none', background: '#09090b' }}
          />
        )}

        {tab === 'turn' && (
          <YStack flex={1} minHeight={0} padding="$3.5" gap="$3" style={{ overflowY: 'auto' }}>
            {turn.inputSummary || turn.outputSummary ? (
              <>
                {turn.model && (
                  <div style={CARD}>
                    <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Model
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>{turn.model}</div>
                  </div>
                )}
                {turn.inputSummary && (
                  <div style={CARD}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#60a5fa' }}>Sent</div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {turn.inputSummary}
                    </div>
                  </div>
                )}
                {turn.outputSummary && (
                  <div style={CARD}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#34d399' }}>Returned</div>
                    <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {turn.outputSummary}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={NOTHING}>Nothing sent yet.</div>
            )}
          </YStack>
        )}

        {tab === 'logs' && (
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
            {lines.length ? (
              lines.map((line, index) => (
                <div
                  key={index}
                  style={{ color: INK[line.kind], whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 18 }}
                >
                  {line.kind === 'said' ? `$ ${line.text}` : line.text}
                </div>
              ))
            ) : (
              <div style={NOTHING}>
                {how
                  ? 'Nothing has run. Run leases a sandbox, writes this file to it and runs it there.'
                  : `No interpreter is named for ${language}, so this artifact is not run.`}
              </div>
            )}
            <div ref={end} />
          </div>
        )}
      </YStack>
    </YStack>
  )
}
