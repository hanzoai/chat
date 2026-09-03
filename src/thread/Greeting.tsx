/**
 * The empty conversation greeting, category filter tabs, and production template gallery.
 *
 * Provides a high-end Linear/Lux-style entrance to Hanzo Chat with responsive
 * CSS Grid template cards across AI & Agents, Autonomous Commerce, SaaS & Studio,
 * Web3 & DeFi, Spatial & 3D, and Cloud Infrastructure.
 */
import {
  ArrowRight,
  Bot,
  Boxes,
  Coins,
  Cpu,
  Database,
  Globe,
  Layers,
  Shield,
  ShoppingBag,
  Sparkles,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { H2, Paragraph, YStack } from '@hanzo/ui'
import type { ComponentType, CSSProperties } from 'react'
import { useState } from 'react'

export interface TemplateCard {
  id: string
  icon: ComponentType<{ size?: number; style?: CSSProperties }>
  category: 'AI & Agents' | 'Commerce' | 'SaaS & Studio' | 'Web3 & DeFi' | 'Spatial & 3D' | 'Cloud Infra'
  badge: string
  title: string
  description: string
  tags: readonly string[]
  prompt: string
}

const TEMPLATES: TemplateCard[] = [
  {
    id: 'commerce-storefront',
    icon: ShoppingBag,
    category: 'Commerce',
    badge: 'Luxury Commerce',
    title: 'Autonomous Luxury Commerce Store',
    description: 'High-ticket storefront with @hanzo/ui design system, pgvector semantic search, and multi-currency checkout.',
    tags: ['Next.js 16', 'React 19', 'pgvector', 'Commerce Checkout', 'Zero-Fee'],
    prompt: 'Scaffold an autonomous luxury commerce storefront using Next.js 16, React 19, @hanzo/ui liquid-glass components, PostgreSQL pgvector semantic search, and Hanzo Commerce multi-currency checkout.',
  },
  {
    id: 'ai-studio-saas',
    icon: Sparkles,
    category: 'SaaS & Studio',
    badge: 'AI SaaS & Studio',
    title: 'Multi-Model Intelligence Studio',
    description: 'Streaming AI workspace with DeepSeek reasoning channels, model catalog picker, and token telemetry.',
    tags: ['Next.js 16', 'React 19', 'DeepSeek', '@hanzo/ai', 'IAM PKCE'],
    prompt: 'Build a production-ready Next.js 16 AI Studio SaaS application with streaming reasoning folding, multi-model switcher (/v1/models), and IAM PKCE authentication.',
  },
  {
    id: 'agent-swarm-orchestrator',
    icon: Bot,
    category: 'AI & Agents',
    badge: 'Autonomous Swarm',
    title: 'Multi-Agent Code Engine & SWE Swarm',
    description: 'Coordinate Vi, Dev, and Cyber agents to refactor code with worktree isolation and Playwright gates.',
    tags: ['Agent Swarm', 'Playwright', 'Git Worktrees', 'Automated PRs'],
    prompt: 'Create an autonomous multi-agent software engineering workflow that coordinates Vi, Dev, and Cyber agents to refactor code with git worktree isolation and live Playwright E2E verification.',
  },
  {
    id: 'web3-defi-portal',
    icon: Coins,
    category: 'Web3 & DeFi',
    badge: 'Web3 & DeFi',
    title: 'Cross-Chain DeFi & MPC Portal',
    description: 'Multi-chain dApp with MPC non-custodial wallet connect, gasless meta-transactions, and asset bridge.',
    tags: ['Solana', 'EVM', 'MPC Wallets', 'Gasless Relayer', 'DeFi'],
    prompt: 'Scaffold a Web3 DeFi portal supporting multi-chain MPC wallets (Solana + EVM), gasless transaction relayers, and cross-chain token swap interfaces.',
  },
  {
    id: 'spatial-3d-showcase',
    icon: Boxes,
    category: 'Spatial & 3D',
    badge: 'Spatial 3D & WebGL',
    title: 'Interactive 3D Product Metaverse',
    description: 'Photorealistic WebGL / WebGPU 3D spatial experience with physics, shaders, and real-time configurator.',
    tags: ['Three.js', 'WebGPU', 'GLSL Shaders', '3D Configurator'],
    prompt: 'Build an interactive 3D spatial product configurator with Three.js, WebGPU rendering, dynamic lighting shaders, and liquid-glass UI controls.',
  },
  {
    id: 'cloud-microvm-cluster',
    icon: Shield,
    category: 'Cloud Infra',
    badge: 'MicroVM & KMS',
    title: 'Zero-Trust gVisor & KMS Enclaves',
    description: 'Hardware enclave KMS envelope encryption, zero-trust IAM policies, and 42ms gVisor sandboxes.',
    tags: ['gVisor', 'KMS Enclave', 'Postgres 16', 'Qdrant v1.12', 'eBPF'],
    prompt: 'Generate a zero-trust cloud infrastructure blueprint configuring 42ms gVisor sandboxes, hardware KMS envelope secrets, PostgreSQL 16 pgvector pool, and Qdrant vector cluster.',
  },
  {
    id: 'cloud-database-cluster',
    icon: Database,
    category: 'Cloud Infra',
    badge: 'Vector Database',
    title: 'PostgreSQL 16 + Qdrant Cluster',
    description: 'Production vector pool with sub-millisecond hybrid semantic search and in-memory Redis cache.',
    tags: ['Postgres 16', 'Qdrant v1.12', 'Redis 7', 'Traefik v3'],
    prompt: 'Generate a production cloud blueprint for PostgreSQL 16 with pgvector, Qdrant vector database cluster, Redis caching, and Traefik v3 ingress.',
  },
  {
    id: 'zap-stream',
    icon: Zap,
    category: 'Cloud Infra',
    badge: 'ZAP Protocol',
    title: 'Zero-Allocation ZAP Binary Stream',
    description: 'Sub-millisecond high-throughput event processing with ZAP binary protocol, NATS pubsub, and eBPF tracing.',
    tags: ['ZAP Binary', 'Zero-Allocation', 'NATS PubSub', 'eBPF Tracing'],
    prompt: 'Design a high-throughput microservice architecture using the ZAP zero-allocation binary protocol, distributed NATS pubsub, and sub-millisecond p99 latency.',
  },
  {
    id: 'realtime-voice-agent',
    icon: Globe,
    category: 'AI & Agents',
    badge: 'Real-time Multimodal',
    title: 'Ultra-Low Latency Voice & Vision Agent',
    description: 'Streaming WebSocket duplex voice agent with live audio transcription, tool use, and vision feeds.',
    tags: ['WebSocket', 'Audio Streaming', 'Vision Feed', 'Voice Agent'],
    prompt: 'Build an ultra-low latency multimodal streaming AI assistant with real-time WebSocket audio duplex, vision perception, and tool-calling capabilities.',
  },
  {
    id: 'saas-multi-tenant',
    icon: Layers,
    category: 'SaaS & Studio',
    badge: 'Multi-Tenant SaaS',
    title: 'Modern B2B Workspace & Billing',
    description: 'Multi-tenant organization architecture with Stripe billing subscriptions and granular team roles.',
    tags: ['Next.js 16', 'React 19', 'Multi-Tenant', 'Stripe Billing'],
    prompt: 'Scaffold a modern multi-tenant B2B SaaS platform with organization switching, Stripe subscription billing, and role-based access control.',
  },
  {
    id: 'cloud-microvm-edge',
    icon: Cpu,
    category: 'Cloud Infra',
    badge: 'Edge Compute',
    title: 'Distributed 280+ PoP Edge Cluster',
    description: 'Edge execution network with anycast routing, TLS termination, and distributed KV cache.',
    tags: ['Edge Network', 'Anycast', 'TLS 1.3', 'Distributed KV'],
    prompt: 'Configure a global edge compute network blueprint with Anycast routing across 280+ PoPs, TLS 1.3 termination, and distributed KV cache.',
  },
]

const CATEGORIES = [
  'All',
  'Commerce',
  'SaaS & Studio',
  'AI & Agents',
  'Web3 & DeFi',
  'Spatial & 3D',
  'Cloud Infra',
] as const

export interface GreetingProps {
  name?: string
  hint?: string
  prompts?: string[]
  onPick?: (prompt: string) => void
}

const CARD_STYLE: CSSProperties = {
  display: 'grid',
  alignContent: 'space-between',
  padding: '16px 18px',
  borderRadius: 14,
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  minHeight: 148,
}

export const Greeting = ({
  name,
  hint = 'Select a production template, ask a question, or orchestrate autonomous agent swarms.',
  onPick,
}: GreetingProps) => {
  const [filter, setFilter] = useState<typeof CATEGORIES[number]>('All')

  const visible = filter === 'All'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === filter)

  return (
    <YStack
      alignItems="center"
      gap="$4"
      maxWidth={780}
      width="100%"
      marginHorizontal="auto"
      paddingVertical="$6"
    >
      {/* Brand Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 14px',
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#ffffff',
        }}
      >
        <Sparkles size={13} style={{ color: '#ffffff' }} />
        <span>Hanzo Production Templates & Intelligence</span>
      </div>

      {/* Main Title & Subtitle */}
      <YStack alignItems="center" gap="$2">
        <H2
          size="$8"
          textAlign="center"
          style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: '#ffffff',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {name ? `What will we build, ${name}?` : 'Where ideas become production systems.'}
        </H2>
        <Paragraph
          color="$quiet"
          textAlign="center"
          style={{
            fontSize: 'clamp(0.9rem, 1.6vw, 1.05rem)',
            color: 'rgba(255, 255, 255, 0.55)',
            maxWidth: 600,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {hint}
        </Paragraph>
      </YStack>

      {/* Category Filter Tabs (Linear.app / lux.chat style) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 6,
          padding: 4,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginTop: 8,
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = filter === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className="tap"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                background: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: active ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Responsive CSS Grid of Starter Template Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 12,
          width: '100%',
          marginTop: 12,
        }}
      >
        {visible.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onPick?.(card.prompt)}
              className="tap"
              style={CARD_STYLE}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {card.badge}
                  </span>
                  <Icon size={16} style={{ color: 'rgba(255, 255, 255, 0.75)' }} />
                </div>

                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '-0.015em',
                    marginBottom: 5,
                  }}
                >
                  {card.title}
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: 'rgba(255, 255, 255, 0.55)',
                    lineHeight: 1.45,
                    marginBottom: 10,
                  }}
                >
                  {card.description}
                </div>

                {/* Tech Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  opacity: 0.85,
                }}
              >
                <span>Scaffold template</span>
                <ArrowRight size={12} />
              </div>
            </button>
          )
        })}
      </div>
    </YStack>
  )
}
