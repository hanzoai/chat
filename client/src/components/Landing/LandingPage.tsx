import React, { useState, useEffect, useRef } from 'react';
import { useGetStartupConfig } from '~/data-provider';

/* ------------------------------------------------------------------ */
/*  Monochrome tokens — matches hanzo.ai design system                 */
/* ------------------------------------------------------------------ */

const c = {
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  fg: '#fafafa',
  muted: '#a3a3a3',
  dim: '#525252',
  brand: '#e4e4e7',
} as const;

/* ------------------------------------------------------------------ */
/*  CSS keyframes (injected once)                                      */
/* ------------------------------------------------------------------ */

const styleId = 'hanzo-landing-styles';
function injectStyles() {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes hanzo-logo-spin {
      0% { opacity: 0; transform: rotateY(180deg) scale(0.6); }
      60% { opacity: 1; transform: rotateY(-10deg) scale(1.02); }
      100% { opacity: 1; transform: rotateY(0deg) scale(1); }
    }
    @keyframes hanzo-wordmark-in {
      0% { opacity: 0; transform: translateX(-4px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes hanzo-wordmark-out {
      0% { opacity: 1; transform: translateX(0); }
      100% { opacity: 0; transform: translateX(-4px); width: 0; overflow: hidden; }
    }
    @keyframes hanzo-fade-up {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes hanzo-glow-pulse {
      0%, 100% { opacity: 0.04; }
      50% { opacity: 0.08; }
    }
    .hanzo-landing-input::placeholder { color: ${c.dim}; }
    .hanzo-landing-input:focus { outline: none; }
    .hanzo-suggestion:hover { border-color: ${c.borderHover} !important; background: rgba(255,255,255,0.03) !important; color: ${c.fg} !important; }
    .hanzo-model-badge:hover { border-color: ${c.borderHover} !important; color: ${c.muted} !important; }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Hanzo Logo (geometric H with 3D rotation animation)                */
/* ------------------------------------------------------------------ */

const HanzoLogoAnimated = () => {
  const [showWordmark, setShowWordmark] = useState(false);
  const [introWordmark, setIntroWordmark] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIntroWordmark(true), 800);
    const t2 = setTimeout(() => setIntroWordmark(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const wordmarkVisible = introWordmark || hovered;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 22, height: 22, perspective: 600,
          animation: 'hanzo-logo-spin 0.6s cubic-bezier(0.22, 1.28, 0, 1) 0.15s both',
        }}
      >
        <svg viewBox="0 0 67 67" width="22" height="22" xmlns="http://www.w3.org/2000/svg" style={{ color: c.fg }}>
          <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
          <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
          <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
          <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
          <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
        </svg>
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: -0.3,
          color: c.fg,
          animation: wordmarkVisible ? 'hanzo-wordmark-in 0.25s ease both' : 'hanzo-wordmark-out 0.25s ease both',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        Hanzo AI
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Suggestion prompts                                                 */
/* ------------------------------------------------------------------ */

const suggestions = [
  { icon: '✦', text: 'Explain how MCP tools work' },
  { icon: '→', text: 'Help me deploy a Next.js app' },
  { icon: '⚡', text: 'Compare Zen models for my use case' },
  { icon: '◆', text: 'Debug my authentication flow' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function getLoginHref(serverDomain: string): string {
  const iamUrl = import.meta.env.VITE_HANZO_IAM_URL;
  const appId = import.meta.env.VITE_HANZO_IAM_APP;
  if (iamUrl && appId) {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = `hanzo-chat-${Date.now()}`;
    sessionStorage.setItem('oauth_state', state);
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'openid profile email',
    });
    return `${iamUrl}/oauth/authorize?${params.toString()}`;
  }
  return `${serverDomain}/oauth/openid`;
}

export default function LandingPage() {
  const { data: config } = useGetStartupConfig();
  const serverDomain = config?.serverDomain || '';
  const loginHref = getLoginHref(serverDomain);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { injectStyles(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to login — after auth, the query could be forwarded
    const q = inputRef.current?.value?.trim();
    if (q) {
      sessionStorage.setItem('hanzo_chat_initial_query', q);
    }
    window.location.href = loginHref;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: c.bg,
        color: c.fg,
        fontFamily: "'Geist Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow (matches hanzo.ai hero) */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          animation: 'hanzo-glow-pulse 8s ease-in-out infinite',
        }}
      />

      {/* Grid lines (architectural element from hanzo.ai) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}
      />

      {/* ---- Navbar ---- */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <HanzoLogoAnimated />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={loginHref}
            style={{
              fontSize: 13,
              color: c.muted,
              textDecoration: 'none',
              padding: '7px 16px',
              borderRadius: 20,
              border: `1px solid ${c.border}`,
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = c.fg;
              e.currentTarget.style.borderColor = c.borderHover;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = c.muted;
              e.currentTarget.style.borderColor = c.border;
            }}
          >
            Log in
          </a>
          <a
            href={loginHref}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: c.bg,
              textDecoration: 'none',
              padding: '7px 18px',
              borderRadius: 20,
              backgroundColor: c.fg,
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Sign up
          </a>
        </div>
      </nav>

      {/* ---- Main: centered search/chat widget ---- */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          maxWidth: 680,
          width: '100%',
          margin: '0 auto',
          marginTop: -48,
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 400,
            textAlign: 'center',
            marginBottom: 32,
            letterSpacing: -0.8,
            lineHeight: 1.15,
            animation: 'hanzo-fade-up 0.5s ease 0.3s both',
          }}
        >
          What can I help with?
        </h1>

        {/* Search / chat input */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            animation: 'hanzo-fade-up 0.5s ease 0.45s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 14px 12px 18px',
              borderRadius: 24,
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={() => {}}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything..."
              className="hanzo-landing-input"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: c.fg,
                fontSize: 15,
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <button
              type="submit"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: c.fg,
                color: c.bg,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'opacity 0.15s',
                marginLeft: 8,
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>

        {/* Suggestion prompts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            width: '100%',
            marginTop: 16,
            animation: 'hanzo-fade-up 0.5s ease 0.6s both',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="hanzo-suggestion"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = s.text;
                  inputRef.current.focus();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 12,
                border: `1px solid ${c.border}`,
                backgroundColor: 'transparent',
                color: c.dim,
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                lineHeight: 1.35,
              }}
            >
              <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.5 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.text}</span>
            </button>
          ))}
        </div>

        {/* Model badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            marginTop: 24,
            animation: 'hanzo-fade-up 0.5s ease 0.75s both',
          }}
        >
          {['Zen 4', 'Claude', 'GPT-5', 'DeepSeek', 'Gemini', 'Qwen', '100+ models'].map((m) => (
            <span
              key={m}
              className="hanzo-model-badge"
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                color: c.dim,
                transition: 'all 0.15s',
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer
        style={{
          textAlign: 'center',
          padding: '16px 24px',
          fontSize: 11,
          color: c.dim,
          flexShrink: 0,
          position: 'relative',
          zIndex: 5,
        }}
      >
        <a
          href="https://hanzo.ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.muted, textDecoration: 'none' }}
        >
          hanzo.ai
        </a>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>$5 free credit, no card required</span>
        <span style={{ margin: '0 6px' }}>·</span>
        <a
          href="https://hanzo.ai/docs/chat"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.muted, textDecoration: 'none' }}
        >
          Docs
        </a>
      </footer>
    </div>
  );
}
