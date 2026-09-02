import {
  Check,
  Compass,
  Hash,
  Plus,
  Search,
  Users,
  X,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useMemo, useState } from 'react'

import { channelsStore, useChannels } from './store'
import type { ChannelCategory } from './types'

const CATEGORIES: { id: ChannelCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Channels' },
  { id: 'official', label: 'Official Hanzo' },
  { id: 'dev', label: 'Engineering & ZAP' },
  { id: 'infra', label: 'Cloud & Sandbox' },
  { id: 'design', label: 'Design & UI' },
  { id: 'community', label: 'Community' },
]

export const BrowseChannelsModal = () => {
  const { isBrowseOpen, discoverableChannels, rooms } = useChannels()
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<ChannelCategory | 'all'>('all')

  useEffect(() => {
    if (!isBrowseOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') channelsStore.closeBrowse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isBrowseOpen])

  const followedIds = useMemo(() => new Set(rooms.map((r) => r.id)), [rooms])

  const filtered = useMemo(() => {
    return discoverableChannels.filter((chan) => {
      if (selectedCat !== 'all' && chan.category !== selectedCat) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        const matchName = chan.name?.toLowerCase().includes(q)
        const matchTopic = chan.topic?.toLowerCase().includes(q)
        const matchCreator = chan.creator?.toLowerCase().includes(q)
        return matchName || matchTopic || matchCreator
      }
      return true
    })
  }, [discoverableChannels, selectedCat, query])

  if (!isBrowseOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => channelsStore.closeBrowse()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          backgroundColor: '#0e0e12',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="browse-channels-modal"
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px 14px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(52, 211, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <Compass size={17} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                Browse & Follow Channels
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                Discover public channels across the Hanzo network
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => channelsStore.closeBrowse()}
            className="tap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search and Category Filter Toolbar */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels by name, topic, or creator…"
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    background: active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: active ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Channels List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255, 255, 255, 0.4)' }}>
              No channels match your search.
            </div>
          ) : (
            filtered.map((chan) => {
              const isFollowed = followedIds.has(chan.id)

              return (
                <div
                  key={chan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1, marginRight: 16 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34d399',
                        flexShrink: 0,
                      }}
                    >
                      <Hash size={16} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                          #{chan.name}
                        </span>
                        {chan.category && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {chan.category}
                          </span>
                        )}
                      </div>

                      {chan.topic && (
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2, lineHeight: 1.4 }}>
                          {chan.topic}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} /> {chan.memberCount || chan.members.length} members
                        </span>
                        {chan.creator && <span>Created by {chan.creator}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => channelsStore.toggleFollowChannel(chan.id)}
                    className="tap"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isFollowed ? 'rgba(255, 255, 255, 0.08)' : '#34d399',
                      border: isFollowed ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                      color: isFollowed ? 'rgba(255, 255, 255, 0.8)' : '#0a0a0d',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {isFollowed ? (
                      <>
                        <Check size={12} strokeWidth={2.5} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
