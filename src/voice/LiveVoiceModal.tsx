import {
  Bot,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Volume2,
  VolumeX,
  X,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useRef } from 'react'

import { liveVoiceStore, useLiveVoice } from './store'

export const LiveVoiceModal = () => {
  const { isOpen, isMuted, isSpeakerMuted, status, activeAgent, transcript, durationSeconds } = useLiveVoice()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') liveVoiceStore.close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Animated visualizer loop
  useEffect(() => {
    if (!isOpen) return
    let animationFrame: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let phase = 0

    const render = () => {
      phase += 0.05
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = 64

      // Outer ambient glowing rings
      for (let r = 3; r >= 1; r--) {
        const pulse = Math.sin(phase * 1.5 + r) * 8
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius + r * 16 + pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(52, 211, 153, ${0.03 * (4 - r)})`
        ctx.fill()
      }

      // Middle vibrant aura
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius + 20)
      grad.addColorStop(0, 'rgba(52, 211, 153, 0.4)')
      grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.15)')
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)')

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + Math.sin(phase * 2) * 6, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Dynamic waveform spokes
      const bars = 36
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2
        const spokeLen = Math.abs(Math.sin(phase * 3 + i * 0.4)) * (status === 'speaking' ? 24 : 12) + 6
        const x1 = centerX + Math.cos(angle) * (radius - 2)
        const y1 = centerY + Math.sin(angle) * (radius - 2)
        const x2 = centerX + Math.cos(angle) * (radius + spokeLen)
        const y2 = centerY + Math.sin(angle) * (radius + spokeLen)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = status === 'speaking' ? '#60a5fa' : '#34d399'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      animationFrame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [isOpen, status])

  if (!isOpen) return null

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={() => liveVoiceStore.close()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#0c0c10',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 24px',
          gap: 20,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="live-voice-modal"
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={() => liveVoiceStore.close()}
          className="tap"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>

        {/* Agent Info & Live Status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 9999,
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <Radio size={12} />
            <span>LIVE DUPLEX CALL</span>
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 6 }}>
            Collaborating with {activeAgent}
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
            ZAP Ultra-Low Latency Audio Stream • {timeFormatted}
          </div>
        </div>

        {/* Dynamic Animated Canvas Orb */}
        <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={canvasRef} width={220} height={220} style={{ width: 220, height: 220 }} />
          <div
            style={{
              position: 'absolute',
              width: 68,
              height: 68,
              borderRadius: 9999,
              background: 'rgba(14, 14, 18, 0.9)',
              border: '1px solid rgba(52, 211, 153, 0.5)',
              boxShadow: '0 0 20px rgba(52, 211, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <Bot size={28} />
          </div>
        </div>

        {/* Real-Time Transcript Preview */}
        <div
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.5,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {transcript}
        </div>

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
          {/* Mute Mic */}
          <button
            type="button"
            onClick={() => liveVoiceStore.toggleMute()}
            className="tap"
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isMuted ? '#f87171' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => liveVoiceStore.close()}
            className="tap"
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: '#ef4444',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
            }}
            title="End voice call"
          >
            <PhoneOff size={22} />
          </button>

          {/* Mute Speaker */}
          <button
            type="button"
            onClick={() => liveVoiceStore.toggleSpeaker()}
            className="tap"
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              background: isSpeakerMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: isSpeakerMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isSpeakerMuted ? '#f87171' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          >
            {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}
