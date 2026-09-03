/**
 * Openings — starter suggestions when entering a conversation.
 * Rendered below the centered composer in the ChatGPT/lux.chat style.
 * Supports category filtering between building fullstack apps vs deep swarm chat.
 */
import {
  Boxes,
  Bot,
  Code,
  Layers,
  Server,
  ShoppingBag,
  Sparkles,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { useState, type CSSProperties } from 'react'

export interface Starter {
  id: string
  category: 'build' | 'swarm' | 'commerce' | 'cloud'
  label: string
  subtitle?: string
  text: string
  icon?: typeof Code
}

const TEMPLATES: Starter[] = [
  {
    id: 'build-next16',
    category: 'build',
    label: 'Next.js 16 + React 19',
    subtitle: 'Fullstack App Blueprint',
    text: 'Scaffold a production-ready Next.js 16 application with React 19 server actions, @hanzo/ui liquid-glass components, and pgvector semantic search.',
    icon: Code,
  },
  {
    id: 'build-commerce',
    category: 'commerce',
    label: 'Autonomous Commerce Store',
    subtitle: 'Luxury Storefront & Checkout',
    text: 'Build an autonomous luxury commerce storefront with @hanzo/ui design system, zero-fee multi-currency checkout, and pgvector product recommendations.',
    icon: ShoppingBag,
  },
  {
    id: 'swarm-refactor',
    category: 'swarm',
    label: 'Autonomous Agent Swarm',
    subtitle: 'Vi, Dev & Cyber Pipeline',
    text: 'Coordinate a multi-agent engineering swarm (@vi, @dev, @cyber) to analyze codebase architecture, refactor modules, and run Playwright tests.',
    icon: Bot,
  },
  {
    id: 'build-zap',
    category: 'build',
    label: 'ZAP Binary Microservice',
    subtitle: '0.18ms Zero-Allocation Stream',
    text: 'Design and benchmark a high-throughput microservice in Go and TypeScript using the ZAP zero-allocation binary protocol and NATS JetStream.',
    icon: Zap,
  },
  {
    id: 'cloud-kms',
    category: 'cloud',
    label: 'Zero-Trust KMS Enclave',
    subtitle: 'gVisor & Hardware Secrets',
    text: 'Generate a zero-trust cloud infrastructure blueprint with 42ms gVisor sandboxes, hardware KMS envelope encryption, and PostgreSQL 16 connection pooling.',
    icon: Server,
  },
  {
    id: 'build-spatial',
    category: 'build',
    label: 'Spatial 3D & WebGL Studio',
    subtitle: 'Three.js & WebGPU Engine',
    text: 'Scaffold an interactive 3D spatial product showcase using Three.js, WebGPU shaders, physical materials, and liquid-glass floating HUD controls.',
    icon: Boxes,
  },
  {
    id: 'swarm-research',
    category: 'swarm',
    label: 'Deep Research & RAG Memory',
    subtitle: 'AST Graph & Vector Indexing',
    text: 'Task @data with crawling live documentation, analyzing GitHub repository patterns, and indexing vector embeddings into pgvector.',
    icon: Sparkles,
  },
  {
    id: 'cloud-k8s',
    category: 'cloud',
    label: 'Local k3s Cloud Sandbox',
    subtitle: 'Container MicroVMs & eBPF',
    text: 'Deploy an isolated local k3s sandbox cluster with ephemeral ingress routes, container logging sidecars, and eBPF network observability.',
    icon: Layers,
  },
]

export const filled = (text: string, at = new Date()): string => {
  const day = at.getDay()
  return text
    .replace(/\{\{current_date\}\}/gi, `${at.toLocaleDateString('sv')} (${day})`)
    .replace(/\{\{current_datetime\}\}/gi, `${at.toLocaleString('sv')} (${day})`)
    .replace(/\{\{iso_datetime\}\}/gi, at.toISOString())
}

export interface StartersProps {
  starters?: Starter[]
  disabled?: boolean
  onPick: (text: string) => void
}

const CARD_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 14,
  fontSize: 12.5,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%), rgba(18, 18, 22, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'build', label: '⚡ Build Apps' },
  { id: 'swarm', label: '🤖 Agent Swarms' },
  { id: 'commerce', label: '🛍️ Commerce' },
  { id: 'cloud', label: '🔒 Cloud & KMS' },
] as const

export const Starters = ({ disabled = false, onPick }: StartersProps) => {
  const [selectedCat, setSelectedCat] = useState<string>('all')

  const visible = selectedCat === 'all'
    ? TEMPLATES.slice(0, 4)
    : TEMPLATES.filter((t) => t.category === selectedCat).slice(0, 4)

  return (
    <div style={{ display: 'grid', alignContent: 'start', justifyItems: 'center', width: '100%', maxWidth: 768, marginTop: 12, gap: 10 }}>
      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCat === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCat(cat.id)}
              className="tap"
              style={{
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                background: active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: active ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Grid of Starter Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
          width: '100%',
        }}
      >
        {visible.map((starter) => {
          const Icon = starter.icon ?? Code
          return (
            <button
              key={starter.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(starter.text)}
              className="tap"
              style={CARD_STYLE}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%), rgba(28, 28, 35, 0.8)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%), rgba(18, 18, 22, 0.6)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.85)',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
                  {starter.label}
                </div>
                {starter.subtitle && (
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                    {starter.subtitle}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
