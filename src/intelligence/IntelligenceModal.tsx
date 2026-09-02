/**
 * Memory & Code Intelligence Modal.
 */
import {
  Brain,
  FileCode,
  Search,
  Trash2,
  X,
} from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type FormEvent } from 'react'
import { intelligenceStore, useIntelligence, type MemoryItem } from './store'

export const IntelligenceModal = () => {
  const { isOpen, memories, symbols, activeTab } = useIntelligence()
  const [filter, setFilter] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('Project Rule')

  if (!isOpen) return null

  const handleAddMemory = (e: FormEvent) => {
    e.preventDefault()
    if (newContent.trim()) {
      intelligenceStore.addMemory(newCategory, newContent.trim())
      setNewContent('')
    }
  }

  const filteredMemories = memories.filter(
    (m) =>
      m.content.toLowerCase().includes(filter.toLowerCase()) ||
      m.category.toLowerCase().includes(filter.toLowerCase()),
  )

  const filteredSymbols = symbols.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.file.toLowerCase().includes(filter.toLowerCase()),
  )

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
      onClick={() => intelligenceStore.close()}
    >
      <YStack
        width="100%"
        maxWidth={720}
        height={540}
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        style={{
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header */}
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderColor="rgba(255, 255, 255, 0.08)"
        >
          <XStack alignItems="center" gap="$2.5">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25), rgba(167, 139, 250, 0.25))',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Brain size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" color="$ink" style={{ color: '#ffffff' }}>
                Memory & Code Intelligence
              </SizableText>
              <SizableText size="$1" color="$faint" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Persistent vector memory, project constraints, and indexed AST codebase symbols.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={() => intelligenceStore.close()}
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

        {/* Tab & Search Strip */}
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$4"
          paddingVertical="$2"
          borderBottomWidth={1}
          borderColor="rgba(255, 255, 255, 0.06)"
          backgroundColor="rgba(255, 255, 255, 0.01)"
        >
          <XStack gap="$2">
            <button
              type="button"
              onClick={() => intelligenceStore.setTab('memory')}
              className="tap"
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: activeTab === 'memory' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: activeTab === 'memory' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                color: activeTab === 'memory' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Vector Memory ({memories.length})
            </button>
            <button
              type="button"
              onClick={() => intelligenceStore.setTab('symbols')}
              className="tap"
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: activeTab === 'symbols' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: activeTab === 'symbols' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                color: activeTab === 'symbols' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Code Symbols ({symbols.length})
            </button>
          </XStack>

          <XStack
            alignItems="center"
            gap="$1.5"
            paddingHorizontal="$2.5"
            paddingVertical="$1"
            borderRadius="$2"
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.08)"
            backgroundColor="rgba(255, 255, 255, 0.03)"
          >
            <Search size={12} color="rgba(255, 255, 255, 0.4)" />
            <input
              type="text"
              placeholder="Filter entries..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: 11.5,
                width: 140,
              }}
            />
          </XStack>
        </XStack>

        {/* Tab Body */}
        <YStack flex={1} minHeight={0} padding="$4" gap="$3" style={{ overflowY: 'auto' }}>
          {activeTab === 'memory' ? (
            <>
              {/* Add Memory Row */}
              <form onSubmit={handleAddMemory}>
                <XStack gap="$2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 11.5,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Project Rule">Project Rule</option>
                    <option value="Architecture Decision">Architecture Decision</option>
                    <option value="User Preference">User Preference</option>
                    <option value="Enclave KMS Key">Enclave KMS Key</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Add persistent rule or context..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />

                  <button
                    type="submit"
                    className="tap"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: 'none',
                      color: '#000000',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </XStack>
              </form>

              {/* Memories List */}
              <YStack gap="$2" paddingTop="$1">
                {filteredMemories.map((m) => (
                  <XStack
                    key={m.id}
                    alignItems="center"
                    justifyContent="space-between"
                    padding="$3"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="rgba(255, 255, 255, 0.07)"
                    backgroundColor="rgba(255, 255, 255, 0.02)"
                  >
                    <YStack gap="$1" flex={1} paddingRight="$2">
                      <XStack alignItems="center" gap="$2">
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(96, 165, 250, 0.15)',
                            color: '#60a5fa',
                            textTransform: 'uppercase',
                          }}
                        >
                          {m.category}
                        </span>
                        <SizableText size="$1" color="$faint" style={{ fontSize: 10.5 }}>
                          {m.updatedAt}
                        </SizableText>
                      </XStack>
                      <SizableText size="$2" color="$ink" style={{ fontSize: 12 }}>
                        {m.content}
                      </SizableText>
                    </YStack>

                    <button
                      type="button"
                      onClick={() => intelligenceStore.deleteMemory(m.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: 4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </XStack>
                ))}
              </YStack>
            </>
          ) : (
            <YStack gap="$1.5">
              {filteredSymbols.map((s) => (
                <XStack
                  key={`${s.file}:${s.name}`}
                  alignItems="center"
                  justifyContent="space-between"
                  padding="$2.5"
                  borderRadius="$2"
                  backgroundColor="rgba(255, 255, 255, 0.02)"
                  borderWidth={1}
                  borderColor="rgba(255, 255, 255, 0.05)"
                >
                  <XStack alignItems="center" gap="$2">
                    <FileCode size={13} color="#34d399" />
                    <code style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>{s.name}</code>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'rgba(255, 255, 255, 0.6)',
                      }}
                    >
                      {s.kind}
                    </span>
                  </XStack>

                  <SizableText size="$1" color="$faint" style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}>
                    {s.file}:{s.line}
                  </SizableText>
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      </YStack>
    </div>
  )
}
