import React, { useState, useEffect, useRef } from 'react';
import { useGetStartupConfig } from '~/data-provider';

/* ------------------------------------------------------------------ */
/*  CSS (injected once) — uses @hanzo/ui CSS variable conventions      */
/*  Light/dark follows prefers-color-scheme + .dark class              */
/* ------------------------------------------------------------------ */

const styleId = 'hanzo-landing-css';
function injectStyles() {
  if (document.getElementById(styleId)) return;
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    .hanzo-landing {
      --hl-bg: #ffffff;
      --hl-fg: #0a0a0a;
      --hl-surface: #f5f5f5;
      --hl-border: rgba(0,0,0,0.08);
      --hl-border-hover: rgba(0,0,0,0.16);
      --hl-muted: #737373;
      --hl-dim: #a3a3a3;
      --hl-btn-bg: #0a0a0a;
      --hl-btn-fg: #fafafa;
    }

    @media (prefers-color-scheme: dark) {
      .hanzo-landing {
        --hl-bg: #0a0a0a;
        --hl-fg: #fafafa;
        --hl-surface: #171717;
        --hl-border: rgba(255,255,255,0.08);
        --hl-border-hover: rgba(255,255,255,0.16);
        --hl-muted: #a3a3a3;
        --hl-dim: #525252;
        --hl-btn-bg: #fafafa;
        --hl-btn-fg: #0a0a0a;
      }
    }

    /* Respect .dark class (used by Tailwind dark mode) */
    .dark .hanzo-landing,
    .hanzo-landing.dark {
      --hl-bg: #0a0a0a;
      --hl-fg: #fafafa;
      --hl-surface: #171717;
      --hl-border: rgba(255,255,255,0.08);
      --hl-border-hover: rgba(255,255,255,0.16);
      --hl-muted: #a3a3a3;
      --hl-dim: #525252;
      --hl-btn-bg: #fafafa;
      --hl-btn-fg: #0a0a0a;
    }

    @keyframes hl-logo-spin {
      0% { opacity: 0; transform: rotateY(180deg) scale(0.6); }
      60% { opacity: 1; transform: rotateY(-10deg) scale(1.02); }
      100% { opacity: 1; transform: rotateY(0deg) scale(1); }
    }
    @keyframes hl-wordmark-in {
      from { opacity: 0; max-width: 0; } to { opacity: 1; max-width: 80px; }
    }
    @keyframes hl-wordmark-out {
      from { opacity: 1; max-width: 80px; } to { opacity: 0; max-width: 0; }
    }
    @keyframes hl-fade-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hl-input::placeholder { color: var(--hl-dim); }
    .hl-input:focus { outline: none; }

    .hl-suggestion {
      border: 1px solid var(--hl-border);
      background: transparent;
      color: var(--hl-muted);
      transition: all 0.15s;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
    }
    .hl-suggestion:hover {
      border-color: var(--hl-border-hover);
      background: var(--hl-surface);
      color: var(--hl-fg);
    }

    .hl-badge {
      border: 1px solid var(--hl-border);
      color: var(--hl-dim);
      transition: all 0.15s;
    }
    .hl-badge:hover {
      border-color: var(--hl-border-hover);
      color: var(--hl-muted);
    }
  `;
  document.head.appendChild(s);
}

/* ------------------------------------------------------------------ */
/*  Animated Logo (3D rotation, wordmark show/hide on hover)           */
/* ------------------------------------------------------------------ */

const AnimatedLogo = () => {
  const [introVisible, setIntroVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIntroVisible(true), 800);
    const t2 = setTimeout(() => setIntroVisible(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const show = introVisible || hovered;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: 22, height: 22, perspective: 600, animation: 'hl-logo-spin 0.6s cubic-bezier(0.22,1.28,0,1) 0.15s both' }}>
        <svg viewBox="0 0 67 67" width="22" height="22" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--hl-fg)' }}>
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
          color: 'var(--hl-fg)',
          animation: show ? 'hl-wordmark-in 0.2s ease both' : 'hl-wordmark-out 0.2s ease both',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        Hanzo AI
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Suggestions                                                        */
/* ------------------------------------------------------------------ */

const suggestions = [
  { icon: '✦', text: 'Explain how MCP tools work' },
  { icon: '→', text: 'Help me deploy a Next.js app' },
  { icon: '⚡', text: 'Compare Zen models for my use case' },
  { icon: '◆', text: 'Debug my authentication flow' },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

function getLoginHref(serverDomain: string): string {
  const iamUrl = import.meta.env.VITE_HANZO_IAM_URL;
  const appId = import.meta.env.VITE_HANZO_IAM_APP;
  if (iamUrl && appId) {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = `hanzo-chat-${Date.now()}`;
    sessionStorage.setItem('oauth_state', state);
    return `${iamUrl}/oauth/authorize?${new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: 'code', state, scope: 'openid profile email' })}`;
  }
  return `${serverDomain}/oauth/openid`;
}

export default function LandingPage() {
  const { data: config } = useGetStartupConfig();
  const loginHref = getLoginHref(config?.serverDomain || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { injectStyles(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value?.trim();
    if (q) sessionStorage.setItem('hanzo_chat_initial_query', q);
    window.location.href = loginHref;
  };

  return (
    <div
      className="hanzo-landing"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--hl-bg)',
        color: 'var(--hl-fg)',
        fontFamily: "'Geist Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', flexShrink: 0 }}>
        <AnimatedLogo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={loginHref}
            style={{
              fontSize: 13, color: 'var(--hl-muted)', textDecoration: 'none',
              padding: '7px 16px', borderRadius: 20,
              border: '1px solid var(--hl-border)', transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--hl-fg)'; e.currentTarget.style.borderColor = 'var(--hl-border-hover)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--hl-muted)'; e.currentTarget.style.borderColor = 'var(--hl-border)'; }}
          >
            Log in
          </a>
          <a
            href={loginHref}
            style={{
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              padding: '7px 18px', borderRadius: 20,
              backgroundColor: 'var(--hl-btn-bg)', color: 'var(--hl-btn-fg)',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Sign up
          </a>
        </div>
      </nav>

      {/* Centered search widget */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', maxWidth: 680, width: '100%', margin: '0 auto', marginTop: -48 }}>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 400, textAlign: 'center', marginBottom: 32, letterSpacing: -0.8, lineHeight: 1.15, animation: 'hl-fade-up 0.5s ease 0.3s both' }}>
          What can I help with?
        </h1>

        {/* Search input */}
        <form onSubmit={handleSubmit} style={{ width: '100%', animation: 'hl-fade-up 0.5s ease 0.45s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px 14px 12px 20px', borderRadius: 24, backgroundColor: 'var(--hl-surface)', border: '1px solid var(--hl-border)', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything..."
              className="hl-input"
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--hl-fg)', fontSize: 15, fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <button
              type="submit"
              style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--hl-btn-bg)', color: 'var(--hl-btn-fg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s', marginLeft: 8 }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', marginTop: 16, animation: 'hl-fade-up 0.5s ease 0.6s both' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="hl-suggestion"
              onClick={() => { if (inputRef.current) { inputRef.current.value = s.text; inputRef.current.focus(); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.35 }}
            >
              <span style={{ fontSize: 11, flexShrink: 0, opacity: 0.4 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.text}</span>
            </button>
          ))}
        </div>

        {/* Model badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 24, animation: 'hl-fade-up 0.5s ease 0.75s both' }}>
          {['Zen 4', 'Claude', 'GPT-5', 'DeepSeek', 'Gemini', 'Qwen', '100+ models'].map((m) => (
            <span key={m} className="hl-badge" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10 }}>{m}</span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px 24px', fontSize: 11, color: 'var(--hl-dim)', flexShrink: 0 }}>
        <a href="https://hanzo.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hl-muted)', textDecoration: 'none' }}>hanzo.ai</a>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>$5 free credit, no card required</span>
        <span style={{ margin: '0 6px' }}>·</span>
        <a href="https://hanzo.ai/docs/chat" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hl-muted)', textDecoration: 'none' }}>Docs</a>
      </footer>
    </div>
  );
}
