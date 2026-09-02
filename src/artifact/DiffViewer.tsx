import { Check, Copy, FileCode } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

export interface DiffLine {
  type: 'add' | 'del' | 'same'
  oldNum?: number
  newNum?: number
  content: string
}

const SAMPLE_DIFF: DiffLine[] = [
  { type: 'same', oldNum: 1, newNum: 1, content: "import { createZAPStream } from '@hanzo/zap'" },
  { type: 'same', oldNum: 2, newNum: 2, content: "import { kmsEnclave } from '@hanzo/security'" },
  { type: 'del', oldNum: 3, content: '- const transport = new HttpTransport({ keepAlive: false })' },
  { type: 'add', newNum: 3, content: '+ const transport = createZAPBinaryTransport({ zeroAllocation: true })' },
  { type: 'same', oldNum: 4, newNum: 4, content: '' },
  { type: 'same', oldNum: 5, newNum: 5, content: 'export async function POST(req: Request) {' },
  { type: 'same', oldNum: 6, newNum: 6, content: '  const { prompt } = await req.json()' },
  { type: 'del', oldNum: 7, content: '  // Legacy synchronous handler' },
  { type: 'del', oldNum: 8, content: '  const res = await legacyProcess(prompt)' },
  { type: 'add', newNum: 7, content: '  // Hardware enclave KMS attestation & sub-millisecond memory stream' },
  { type: 'add', newNum: 8, content: '  const stream = createZAPStream({' },
  { type: 'add', newNum: 9, content: "    target: 'local-k3s'," },
  { type: 'add', newNum: 10, content: '    enclaveKey: kmsEnclave.getAttestationKey(),' },
  { type: 'add', newNum: 11, content: '  })' },
  { type: 'same', oldNum: 9, newNum: 12, content: '  return stream.dispatch({ status: "ok", payload: prompt })' },
  { type: 'same', oldNum: 10, newNum: 13, content: '}' },
]

export const DiffViewer = () => {
  const [copied, setCopied] = useState(false)

  const copyDiff = () => {
    const raw = SAMPLE_DIFF.map((l) =>
      l.type === 'add' ? `+ ${l.content}` : l.type === 'del' ? `- ${l.content}` : `  ${l.content}`,
    ).join('\n')
    navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0c0c10',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      data-testid="diff-viewer"
    >
      {/* Diff Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCode size={14} style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
            src/api/stream.ts (Git Worktree Diff)
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'rgba(52, 211, 153, 0.15)',
              color: '#34d399',
              fontWeight: 700,
            }}
          >
            +6 -3
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={copyDiff}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Diff'}</span>
          </button>
        </div>
      </div>

      {/* Diff Lines Table */}
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
        {SAMPLE_DIFF.map((line, idx) => {
          const isAdd = line.type === 'add'
          const isDel = line.type === 'del'

          const bg = isAdd
            ? 'rgba(52, 211, 153, 0.1)'
            : isDel
            ? 'rgba(239, 68, 68, 0.1)'
            : 'transparent'

          const textColor = isAdd
            ? '#34d399'
            : isDel
            ? '#f87171'
            : 'rgba(255, 255, 255, 0.85)'

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: bg,
                borderLeft: isAdd ? '3px solid #34d399' : isDel ? '3px solid #ef4444' : '3px solid transparent',
                padding: '2px 8px',
                lineHeight: '20px',
              }}
            >
              {/* Line Numbers */}
              <div
                style={{
                  width: 36,
                  color: 'rgba(255, 255, 255, 0.3)',
                  textAlign: 'right',
                  paddingRight: 8,
                  userSelect: 'none',
                  fontSize: 11,
                }}
              >
                {line.oldNum || ''}
              </div>
              <div
                style={{
                  width: 36,
                  color: 'rgba(255, 255, 255, 0.3)',
                  textAlign: 'right',
                  paddingRight: 12,
                  userSelect: 'none',
                  fontSize: 11,
                }}
              >
                {line.newNum || ''}
              </div>

              {/* Type Marker */}
              <div
                style={{
                  width: 16,
                  color: textColor,
                  fontWeight: 700,
                  userSelect: 'none',
                  textAlign: 'center',
                }}
              >
                {isAdd ? '+' : isDel ? '-' : ' '}
              </div>

              {/* Code Content */}
              <div style={{ color: textColor, whiteSpace: 'pre', overflowX: 'auto', flex: 1 }}>
                {line.content.replace(/^[+-]\s?/, '')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
