/**
 * Custom Agent Studio & Agent Builder Modal.
 */
import {
  Bot,
  Database,
  Github,
  Globe,
  Save,
  Terminal,
  X,
  Zap,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type FormEvent } from 'react'
import type { AgentDefinition } from './types'

export interface AgentBuilderProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (agent: AgentDefinition) => void
}

export const AgentBuilderModal = ({ isOpen, onClose, onSave }: AgentBuilderProps) => {
  const [handle, setHandle] = useState('@custom-agent')
  const [name, setName] = useState('Custom Specialist')
  const [role, setRole] = useState('Domain-specific agent with custom skills and prompt.')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a specialized Hanzo AI assistant. Focus on concise, correct code and verify with tests.',
  )
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'filesystem',
    'web-search',
    'terminal',
  ])

  if (!isOpen) return null

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId))
    } else {
      setSelectedTools([...selectedTools, toolId])
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`
    const id = cleanHandle.replace('@', '').toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    const newAgent: AgentDefinition = {
      id: id || `agent-${Date.now()}`,
      handle: cleanHandle,
      name,
      role,
      avatar: 'https://cdn.hanzo.ai/avatars/custom.png',
      badgeColor: '#a78bfa',
      systemPrompt,
      capabilities: selectedTools,
      iconName: 'code',
    }

    onSave?.(newAgent)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <YStack
        width="100%"
        maxWidth={680}
        maxHeight="90vh"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        style={{
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          overflowY: 'auto',
        }}
        padding="$5"
        gap="$4"
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$2.5">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.25), rgba(52, 211, 153, 0.25))',
                border: '1px solid rgba(167, 139, 250, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <Bot size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                Agent Builder & Studio
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Design custom agents, bind MCP tools, and deploy them to the active Swarm.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </XStack>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Handle & Name Row */}
          <XStack gap="$3">
            <YStack flex={1} gap="$1.5">
              <SizableText size="$1" fontWeight="600" color="$ink">
                Agent Handle
              </SizableText>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@architect"
                required
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
            </YStack>

            <YStack flex={1.5} gap="$1.5">
              <SizableText size="$1" fontWeight="600" color="$ink">
                Display Name
              </SizableText>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Systems Architect"
                required
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
            </YStack>
          </XStack>

          {/* Role / Description */}
          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Role & Purpose
            </SizableText>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="What does this agent specialize in?"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: 12.5,
                outline: 'none',
              }}
            />
          </YStack>

          {/* System Prompt */}
          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              System Instructions
            </SizableText>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define behavioral rules, style constraints, and expected tool usage..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </YStack>

          {/* Tool Bindings */}
          <YStack gap="$2">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Bind MCP Tools & Capabilities
            </SizableText>
            <XStack gap="$2" flexWrap="wrap">
              {[
                { id: 'filesystem', label: 'Local Filesystem', icon: Terminal },
                { id: 'github', label: 'GitHub & Git', icon: Github },
                { id: 'postgres', label: 'PostgreSQL & pgvector', icon: Database },
                { id: 'web-search', label: 'Brave Web Search', icon: Globe },
                { id: 'k8s', label: 'Kubernetes Sandbox', icon: Zap },
              ].map((t) => {
                const active = selectedTools.includes(t.id)
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTool(t.id)}
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 9px',
                      borderRadius: 6,
                      background: active ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: active
                        ? '1px solid rgba(52, 211, 153, 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: active ? '#34d399' : 'rgba(255, 255, 255, 0.65)',
                      fontSize: 11.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={12} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </XStack>
          </YStack>

          {/* Actions Footer */}
          <XStack justifyContent="flex-end" gap="$2" paddingTop="$3">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 16px',
                borderRadius: 6,
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={13} />
              <span>Deploy Agent</span>
            </button>
          </XStack>
        </form>
      </YStack>
    </div>
  )
}
