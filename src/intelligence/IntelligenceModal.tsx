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
import { useShown } from '~/show'
import { intelligenceStore, useForget, useIntelligence, useRemember } from './store'

export const IntelligenceModal = () => {
  const { isOpen, memories, symbols, query, activeTab, pending, fault, degraded } =
    useIntelligence()
  const [filter, setFilter] = useState('')
  const [newContent, setNewContent] = useState('')
  // The store records a `kind`, which is free text, not one of four categories.
  const [newKind, setNewKind] = useState('')
  // Two writes, each with its own pending and its own refusal.
  const remembering = useRemember()
  const forgetting = useForget()

  if (!isOpen) return null

  const handleAddMemory = async (e: FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return
    // Clear the box only on a memory that was actually stored.
    if (await remembering.run(newContent.trim(), newKind.trim())) setNewContent('')
  }

  const filteredMemories = memories.filter(
    (m) =>
      m.content.toLowerCase().includes(filter.toLowerCase()) ||
      m.kind.toLowerCase().includes(filter.toLowerCase()),
  )

  // The SYMBOLS are already the answer to a query the server ran, so a second
  // filter over them would hide rows the index said matched.
  const filteredSymbols = symbols

  // Both lists grow with the ORG: /v1/ai/memory/list takes no limit at all, and
  // a symbol search is capped at 50 server-side. This bounds what is DRAWN.
  const shownMemories = useShown(filteredMemories, 60)
  const shownSymbols = useShown(filteredSymbols, 60)

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
            {/* On memories this filters what was read; on symbols it IS the
                query the index answers, so the two are not one control with
                one meaning and the placeholder says which. */}
            <input
              type="text"
              placeholder={activeTab === 'memory' ? 'Filter memories…' : 'Search symbols…'}
              value={activeTab === 'memory' ? filter : query}
              onChange={(e) =>
                activeTab === 'memory'
                  ? setFilter(e.target.value)
                  : intelligenceStore.search(e.target.value)
              }
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: 11.5,
                width: 140,
              }}
            />
            {pending ? (
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>…</span>
            ) : null}
          </XStack>
        </XStack>

        {/* Tab Body */}
        <YStack flex={1} minHeight={0} padding="$4" gap="$3" style={{ overflowY: 'auto' }}>
          {fault || remembering.fault || forgetting.fault ? (
            <SizableText size="$1" color="#f87171">
              {fault || remembering.fault || forgetting.fault}
            </SizableText>
          ) : null}
          {/* An empty result after a failed retrieval is an OUTAGE, not an
              absence of matches, and the route says which. */}
          {degraded ? (
            <SizableText size="$1" color="#fbbf24">
              The index was unreachable — this is not "no matches".
            </SizableText>
          ) : null}
          {activeTab === 'memory' ? (
            <>
              {/* Add Memory Row */}
              <form onSubmit={(e) => void handleAddMemory(e)}>
                <XStack gap="$2">
                  {/* A kind is free text. The four categories offered here
                      were this app's own, and one of them — "Enclave KMS Key" —
                      invited somebody to type key material into a memory. */}
                  <input
                    type="text"
                    placeholder="kind"
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                    style={{
                      width: 110,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 11.5,
                      outline: 'none',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Remember something…"
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
                {shownMemories.rows.map((m) => (
                  <XStack
                    key={m.name}
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
                          {m.kind || 'memory'}
                        </span>
                        <SizableText size="$1" color="$faint" style={{ fontSize: 10.5 }}>
                          {m.updatedTime}
                        </SizableText>
                      </XStack>
                      <SizableText size="$2" color="$ink" style={{ fontSize: 12 }}>
                        {m.content}
                      </SizableText>
                    </YStack>

                    <button
                      type="button"
                      onClick={() => void forgetting.run(m.name)}
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
                {shownMemories.more > 0 ? (
                  <button type="button" onClick={shownMemories.grow} className="tap" style={{
                    padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                    fontSize: 11.5, cursor: 'pointer',
                  }}>
                    {shownMemories.more} more of {shownMemories.total}
                  </button>
                ) : null}
              </YStack>
            </>
          ) : (
            <YStack gap="$1.5">
              {shownSymbols.rows.map((s) => (
                <XStack
                  key={`${s.repo}:${s.file}:${s.line}`}
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
                    <code style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>
                      {s.symbol || s.file.split('/').pop()}
                    </code>
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
              {shownSymbols.more > 0 ? (
                <button type="button" onClick={shownSymbols.grow} className="tap" style={{
                  padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                  fontSize: 11.5, cursor: 'pointer',
                }}>
                  {shownSymbols.more} more of {shownSymbols.total}
                </button>
              ) : null}
            </YStack>
          )}
        </YStack>
      </YStack>
    </div>
  )
}
