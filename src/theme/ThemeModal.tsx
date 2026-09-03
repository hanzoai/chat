import { useEffect } from 'react'
import { Check, Palette, X } from '@hanzogui/lucide-icons-2'
import { ACCENT_PALETTE, themeCustomizerStore, useThemeCustomizer } from './store.ts'

export const ThemeModal = () => {
  const { isOpen, accent, blurPx, glassOpacity } = useThemeCustomizer()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') themeCustomizerStore.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  if (!isOpen) return null

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
      onClick={() => themeCustomizerStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          backgroundColor: '#0e0e12',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="theme-modal"
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
              <Palette size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                Appearance & Liquid Glass
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' }}>
                Customize system accent colors and refraction
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => themeCustomizerStore.close()}
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

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Accent Colors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Accent Color Palette
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
              {ACCENT_PALETTE.map((pal) => {
                const isSelected = accent === pal.id
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => themeCustomizerStore.setAccent(pal.id)}
                    className="tap"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 8px',
                      borderRadius: 10,
                      background: isSelected ? pal.bg : 'rgba(255, 255, 255, 0.025)',
                      border: isSelected ? `1px solid ${pal.primary}` : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 0 16px ${pal.glow}` : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 9999,
                        background: pal.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                      }}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: isSelected ? pal.primary : 'rgba(255, 255, 255, 0.7)' }}>
                      {pal.label.split(' ')[1] || pal.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Glass Blur Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Backdrop Blur Intensity
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>{blurPx}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="48"
              value={blurPx}
              onChange={(e) => themeCustomizerStore.setBlur(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#34d399', cursor: 'pointer' }}
            />
          </div>

          {/* Glass Surface Opacity Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Glass Surface Opacity
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>{glassOpacity}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={glassOpacity}
              onChange={(e) => themeCustomizerStore.setOpacity(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#34d399', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
