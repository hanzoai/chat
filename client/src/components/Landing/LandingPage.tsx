import React from 'react';
import { useGetStartupConfig } from '~/data-provider';

/* ------------------------------------------------------------------ */
/*  Design tokens — Hanzo dark theme (aligned with @hanzo/ui)          */
/* ------------------------------------------------------------------ */

const c = {
  bg: '#0a0a0a',
  surface: '#171717',
  border: 'rgba(255,255,255,0.10)',
  borderHover: 'rgba(255,255,255,0.20)',
  fg: '#fafafa',
  muted: '#a3a3a3',
  dim: '#666',
  brand: '#fd4444',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG                                                         */
/* ------------------------------------------------------------------ */

const HanzoLogo = ({ className = 'size-6' }: { className?: string }) => (
  <svg viewBox="0 0 67 67" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
    <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
    <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
    <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
    <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
  </svg>
);

const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Suggestion prompts                                                 */
/* ------------------------------------------------------------------ */

const suggestions = [
  { icon: '💡', text: 'Explain how MCP tools work' },
  { icon: '🚀', text: 'Help me deploy a Next.js app' },
  { icon: '🧠', text: 'Compare Zen models for code generation' },
  { icon: '🔧', text: 'Debug my authentication flow' },
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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: c.bg,
        color: c.fg,
        fontFamily: "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ---- Navbar ---- */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${c.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HanzoLogo className="size-5" />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
            Hanzo Chat
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={loginHref}
            style={{
              fontSize: 13,
              color: c.muted,
              textDecoration: 'none',
              padding: '6px 14px',
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
              color: '#fff',
              textDecoration: 'none',
              padding: '6px 16px',
              borderRadius: 20,
              backgroundColor: c.brand,
              transition: 'filter 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
            onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
          >
            Sign up free
          </a>
        </div>
      </nav>

      {/* ---- Main: centered chat widget ---- */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          marginTop: -40,
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 32,
            letterSpacing: -0.5,
            lineHeight: 1.2,
          }}
        >
          What can I help with?
        </h1>

        {/* Chat input pill */}
        <a
          href={loginHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '14px 16px',
            borderRadius: 26,
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
            textDecoration: 'none',
            cursor: 'text',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = c.borderHover;
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.04)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = c.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ color: c.dim, marginRight: 8, display: 'flex' }}>
            <IconPlus />
          </span>
          <span
            style={{
              flex: 1,
              color: c.dim,
              fontSize: 15,
            }}
          >
            Ask anything...
          </span>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: c.fg,
              color: c.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconSend />
          </span>
        </a>

        {/* Suggestion prompts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
            width: '100%',
            marginTop: 20,
          }}
        >
          {suggestions.map((s) => (
            <a
              key={s.text}
              href={loginHref}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid ${c.border}`,
                backgroundColor: 'transparent',
                color: c.muted,
                fontSize: 13,
                textDecoration: 'none',
                transition: 'all 0.15s',
                lineHeight: 1.4,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = c.borderHover;
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.color = c.fg;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = c.muted;
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.text}</span>
              <IconArrow />
            </a>
          ))}
        </div>

        {/* Model badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginTop: 28,
          }}
        >
          {['Zen 4', 'Claude Opus 4', 'GPT-5', 'DeepSeek R1', 'Gemini 2.5', '100+ more'].map(
            (m) => (
              <span
                key={m}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: `1px solid ${c.border}`,
                  color: c.dim,
                }}
              >
                {m}
              </span>
            ),
          )}
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
        }}
      >
        <span>Powered by </span>
        <a
          href="https://hanzo.ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.muted, textDecoration: 'none' }}
        >
          Hanzo AI
        </a>
        <span> · $5 free credit · No credit card required</span>
      </footer>
    </div>
  );
}
