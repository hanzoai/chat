/**
 * Modal to create a new multiplayer channel in Chat2.
 */
import { Hash, Lock, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type FormEvent } from 'react'
import { channelsStore, useChannels } from './store'

export const CreateChannelModal = () => {
  const { isCreateOpen } = useChannels()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  if (!isCreateOpen) return null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      channelsStore.createRoom('channel', ['user_self'], name.trim(), topic.trim(), isPrivate ? 'org' : 'global')
      setName('')
      setTopic('')
      setIsPrivate(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={() => channelsStore.closeCreate()}
    >
      <YStack
        width="100%"
        maxWidth={440}
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
              <Hash size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                Create Channel
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Channels organize discussions by project or agent swarm.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={() => channelsStore.closeCreate()}
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
          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Channel Name
            </SizableText>
            <XStack
              alignItems="center"
              gap="$2"
              paddingHorizontal="$2.5"
              paddingVertical="$1.5"
              borderRadius="$2"
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.1)"
              backgroundColor="rgba(255, 255, 255, 0.04)"
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>#</span>
              <input
                type="text"
                placeholder="e.g. quantum-swarms"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 13,
                }}
              />
            </XStack>
          </YStack>

          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Topic / Purpose (Optional)
            </SizableText>
            <input
              type="text"
              placeholder="What is this channel about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: 12.5,
                outline: 'none',
              }}
            />
          </YStack>

          <XStack alignItems="center" justifyContent="space-between" paddingTop="$1">
            <XStack alignItems="center" gap="$2">
              <Lock size={14} color="rgba(255, 255, 255, 0.5)" />
              <YStack gap="$0.5">
                <SizableText size="$1" fontWeight="600" color="$ink">
                  Private Channel
                </SizableText>
                <SizableText size="$1" color="$faint" style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                  Only invited members and active agents can view.
                </SizableText>
              </YStack>
            </XStack>

            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ cursor: 'pointer', width: 16, height: 16 }}
            />
          </XStack>

          <XStack justifyContent="flex-end" gap="$2" paddingTop="$3">
            <button
              type="button"
              onClick={() => channelsStore.closeCreate()}
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
              Create Channel
            </button>
          </XStack>
        </form>
      </YStack>
    </div>
  )
}
