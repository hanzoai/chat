/**
 * The borrowed computer, on screen.
 *
 * A line typed here goes to `POST /v1/sandbox/run` and what comes back is the
 * program's own stdout, stderr and exit code. There is no local interpretation
 * of a command and no output produced on the server's behalf, so a command that
 * finds no interpreter reads as the sandbox's own error rather than a success.
 */
import { Check, Copy, Power, Square, Trash2, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import type { SandboxRuntime } from '@hanzo/ai'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'

import { sandbox, useLease, type Line } from './sandbox.ts'
import { terminalStore, useTerminal } from './store.ts'

const ACTION: CSSProperties = {
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

/** The isolations `LeaseParams.runtime` accepts. Empty asks for no preference. */
const RUNTIMES: SandboxRuntime[] = ['runc', 'gvisor', 'kata-clh', 'kata-fc']

const INK: Record<Line['kind'], string> = {
  said: '#60a5fa',
  out: 'rgba(255, 255, 255, 0.82)',
  err: '#f87171',
  note: 'rgba(255, 255, 255, 0.45)',
}

export const TerminalPanel = () => {
  const { isOpen } = useTerminal()
  const { held, want, busy, lines } = useLease()
  const [command, setCommand] = useState('')
  const [copied, setCopied] = useState(false)
  const end = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  if (!isOpen) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const line = command.trim()
    if (!line) return
    setCommand('')
    void sandbox.run(line)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
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
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.07)"
      >
        <XStack alignItems="center" gap="$2">
          <SizableText size="$1" style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
            Sandbox
          </SizableText>
          <select
            value={want ?? ''}
            onChange={(e) => sandbox.runtime((e.target.value || null) as SandboxRuntime | null)}
            title="Isolation to request when the next lease is taken"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">any runtime</option>
            {RUNTIMES.map((runtime) => (
              <option key={runtime} value={runtime}>
                {runtime}
              </option>
            ))}
          </select>
        </XStack>

        <XStack alignItems="center" gap="$1.5">
          {busy && (
            <button type="button" title="Interrupt what is running" onClick={() => void sandbox.interrupt()} style={ACTION}>
              <Square size={12} />
            </button>
          )}
          {held && (
            <button type="button" title="End the lease" onClick={() => void sandbox.release()} style={ACTION}>
              <Power size={13} />
            </button>
          )}
          <button type="button" title="Copy output" onClick={copy} style={ACTION}>
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
          </button>
          <button type="button" title="Clear the view" onClick={() => sandbox.clear()} style={ACTION}>
            <Trash2 size={13} />
          </button>
          <button type="button" title="Close" onClick={() => terminalStore.close()} style={ACTION}>
            <X size={14} />
          </button>
        </XStack>
      </XStack>

      {/* What the lease actually is. Every value here came back from the server. */}
      <XStack
        alignItems="center"
        gap="$2"
        paddingHorizontal="$3"
        paddingVertical="$1.5"
        borderBottomWidth={1}
        borderColor="rgba(255, 255, 255, 0.05)"
        backgroundColor="rgba(255, 255, 255, 0.01)"
        style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}
      >
        {held ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{held.id}</span>
            {held.runtime && <span>{held.runtime}</span>}
            {held.status && <span>{held.status}</span>}
            {held.workdir && <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{held.workdir}</span>}
          </>
        ) : (
          <span>No sandbox held. The first command leases one.</span>
        )}
      </XStack>

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
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              color: INK[line.kind],
              fontWeight: line.kind === 'said' ? 600 : 400,
              marginBottom: 3,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {line.kind === 'said' ? `$ ${line.text}` : line.text}
          </div>
        ))}
        <div ref={end} />
      </YStack>

      <form
        onSubmit={submit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="A shell line, run by sh -c in the sandbox"
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
          disabled={busy}
          style={{
            padding: '4px 10px',
            borderRadius: 5,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: busy ? 'rgba(255, 255, 255, 0.4)' : '#ffffff',
            fontSize: 11,
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          Run
        </button>
      </form>
    </YStack>
  )
}
