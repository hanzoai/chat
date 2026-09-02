/**
 * A fenced code block with interactive Artifact Canvas and Sandbox Runner affordance.
 */
import { Sparkles } from '@hanzogui/lucide-icons-2'
import { Code } from '@hanzo/ui/chat'
import { artifactStore } from '~/artifact/store'

export interface FenceProps {
  /** The word after the backticks. Shown in the label bar. */
  language?: string
  value: string
}

export const Fence = ({ language = 'text', value }: FenceProps) => {
  const handleOpenSandbox = () => {
    artifactStore.open({
      title: `${language.toUpperCase()} Sandbox`,
      language,
      code: value,
      activeTab: language === 'html' ? 'preview' : 'code',
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Code language={language || 'text'} value={value}>
        {value}
      </Code>
      <button
        type="button"
        onClick={handleOpenSandbox}
        className="tap"
        title="Open in Sandbox / Canvas"
        style={{
          position: 'absolute',
          top: 7,
          right: 36,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          zIndex: 2,
        }}
      >
        <Sparkles size={11} style={{ color: '#ffffff' }} />
        <span>Canvas</span>
      </button>
    </div>
  )
}
