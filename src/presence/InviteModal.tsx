/**
 * Multiplayer Room Invite & Team Access Modal.
 */
import {
  Check,
  Copy,
  Link,
  Trash2,
  Users,
  X,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type FormEvent } from 'react'
import { multiplayerStore, useMultiplayer } from './store'

export const InviteModal = ({ conversationId }: { conversationId?: string | null }) => {
  const { isInviteOpen, participants } = useMultiplayer()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [copied, setCopied] = useState(false)

  if (!isInviteOpen) return null

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://hanzo.chat'}/c/${conversationId || 'new'}?invite=inv_${conversationId || 'hanzo_team'}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleInvite = (e: FormEvent) => {
    e.preventDefault()
    if (email.trim() && email.includes('@')) {
      multiplayerStore.inviteMember(email.trim(), role)
      setEmail('')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => multiplayerStore.closeInvite()}
    >
      <YStack
        width="100%"
        maxWidth={500}
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        padding="$5"
        gap="$4"
        style={{
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        }}
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
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Users size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                Multiplayer Collaboration
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Invite teammates to co-pilot, review code, and chat with AI agents.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={() => multiplayerStore.closeInvite()}
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

        {/* Invite Link Row */}
        <YStack gap="$1.5">
          <SizableText size="$1" fontWeight="600" color="$ink">
            Shareable Room Link
          </SizableText>
          <XStack
            alignItems="center"
            gap="$2"
            padding="$2"
            borderRadius="$3"
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.08)"
            backgroundColor="rgba(255, 255, 255, 0.03)"
          >
            <Link size={14} color="rgba(255, 255, 255, 0.4)" />
            <input
              type="text"
              readOnly
              value={inviteLink}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="tap"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                background: copied ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: copied ? '#34d399' : '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </XStack>
        </YStack>

        {/* Invite by Email */}
        <form onSubmit={handleInvite}>
          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Invite by Email / IAM Handle
            </SizableText>
            <XStack gap="$2">
              <input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="editor">Can Edit & Chat</option>
                <option value="viewer">Viewer Only</option>
              </select>
              <button
                type="submit"
                className="tap"
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  background: '#ffffff',
                  border: 'none',
                  color: '#000000',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Invite
              </button>
            </XStack>
          </YStack>
        </form>

        {/* Current Members List */}
        <YStack gap="$2" paddingTop="$2">
          <SizableText size="$1" fontWeight="600" color="$faint">
            Members in this Chat ({participants.length})
          </SizableText>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {participants.map((p) => (
              <XStack
                key={p.id}
                alignItems="center"
                justifyContent="space-between"
                padding="$2"
                borderRadius="$2"
                backgroundColor="rgba(255, 255, 255, 0.02)"
              >
                <XStack alignItems="center" gap="$2.5">
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 9999,
                      background: p.color,
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <SizableText size="$1" fontWeight="600" color="$ink">
                      {p.name}
                    </SizableText>
                    <SizableText size="$1" color="$faint" style={{ fontSize: 10.5 }}>
                      {p.email}
                    </SizableText>
                  </div>
                </XStack>

                <XStack alignItems="center" gap="$2">
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.65)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p.role}
                  </span>
                  {p.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => multiplayerStore.removeMember(p.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </XStack>
              </XStack>
            ))}
          </div>
        </YStack>
      </YStack>
    </div>
  )
}
