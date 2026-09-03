import {
  Check,
  Copy,
  Download,
  FileCode,
  FileText,
  GitFork,
  Share2,
  X,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { client, ESTATE } from '../data/origin.ts'
import * as store from '../data/store.ts'
import { useChannels } from '../channels/store.ts'
import { exportStore, useExport } from './exportStore.ts'

export const ExportModal = () => {
  const navigate = useNavigate()
  const { isOpen } = useExport()
  const { selected, rooms } = useChannels()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exportStore.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  if (!isOpen) return null

  const turns = store.turns.get()
  const room = rooms.find((r) => r.key === selected)
  const roomTitle = room ? `#${room.roomId}` : 'conversation'

  const generateMarkdown = () => {
    let md = `# ${roomTitle}\n\n*Exported from Hanzo Chat on ${new Date().toLocaleString()}*\n\n---\n\n`
    for (const t of turns) {
      const author = t.role === 'user' ? '**You**' : '**Hanzo Swarm**'
      md += `### ${author}\n\n${t.text}\n\n---\n\n`
    }
    return md
  }

  const handleCopyMarkdown = () => {
    const md = generateMarkdown()
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${roomTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    exportStore.close()
  }

  const handleDownloadJson = () => {
    const json = JSON.stringify(turns, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${roomTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    exportStore.close()
  }

  /**
   * Fork: write these turns under a NEW thread and open it.
   *
   * `threads.record` with no id opens one and answers the id it opened, so a
   * fork is the same write a first turn makes — which is why the copy stays a
   * copy and this stays a fork. It used to put the transcript on the clipboard
   * and close, so the only thing forked was the reader's paste buffer.
   */
  const [forking, setForking] = useState(false)
  const handleForkConversation = async () => {
    if (forking) return
    setForking(true)
    const thread = await client(ESTATE)
      .threads.record(turns.map((t) => ({ role: t.role, content: t.text ?? '' })))
      .catch(() => null)
    setForking(false)
    if (!thread) return
    exportStore.close()
    navigate(`/c/${thread}`)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => exportStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#0e0e12',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="export-modal"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(52, 211, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <Share2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Export & Fork Thread
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Download transcript or branch reasoning
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => exportStore.close()}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Action Options */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Download Markdown */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={18} style={{ color: '#34d399' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Download Markdown (.md)</div>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Formatted with headings & code blocks</div>
              </div>
            </div>
            <Download size={15} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
          </button>

          {/* Download JSON */}
          <button
            type="button"
            onClick={handleDownloadJson}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileCode size={18} style={{ color: '#60a5fa' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Download Raw JSON (.json)</div>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Full message structures and parts</div>
              </div>
            </div>
            <Download size={15} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
          </button>

          {/* Copy Markdown to Clipboard */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {copied ? <Check size={18} style={{ color: '#34d399' }} /> : <Copy size={18} style={{ color: '#fbbf24' }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{copied ? 'Copied to Clipboard!' : 'Copy Transcript to Clipboard'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Quick paste into Notion, Slack, or Docs</div>
              </div>
            </div>
            <Copy size={15} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
          </button>

          {/* Fork Thread */}
          <button
            type="button"
            onClick={handleForkConversation}
            className="tap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GitFork size={18} style={{ color: '#c084fc' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c084fc' }}>Fork Thread into New Branch</div>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Duplicate messages to explore alternate reasoning</div>
              </div>
            </div>
            <GitFork size={15} style={{ color: '#c084fc' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
