import React, { useCallback } from 'react';
import { useGetStartupConfig } from '~/data-provider';
import { getHanzoIamSdk } from '~/utils/iam';

/* ------------------------------------------------------------------ */
/*  Design tokens matching dev.hanzo.ai (Geist/fd- design system)     */
/* ------------------------------------------------------------------ */

const colors = {
  bg: '#050505',           /* hsl(0, 0%, 2%) */
  card: '#0a0a0a',         /* hsl(0, 0%, 4%) */
  muted: '#1a1a1a',        /* hsl(0, 0%, 10%) */
  mutedFg: 'hsla(0, 0%, 70%, 0.85)',
  border: 'hsla(0, 0%, 40%, 0.2)',
  fg: 'hsl(0, 0%, 96%)',
  brand: '#fd4444',
  brandDim: 'rgba(253, 68, 68, 0.10)',
  brandGlow: 'rgba(253, 68, 68, 0.04)',
  secondary: '#1f1f1f',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (Lucide-style, no dependencies)                  */
/* ------------------------------------------------------------------ */

const IconTerminal = ({ className = 'size-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  </svg>
);

const IconSparkles = ({ className = 'size-8', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const IconCube = ({ className = 'size-8', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const IconPuzzle = ({ className = 'size-8', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
  </svg>
);

const IconCpuChip = ({ className = 'size-8', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
  </svg>
);

const IconBolt = ({ className = 'size-8', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
  </svg>
);

const IconArrowRight = ({ className = 'ml-2 size-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

/* Hanzo geometric H logo */
const HanzoLogo = ({ className = 'size-5', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 67 67" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
    <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
    <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
    <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
    <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
  </svg>
);

/* GitHub icon */
const IconGitHub = ({ className = 'size-5' }: { className?: string }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: 'Zen Models',
    description:
      '14 frontier models from 4B to 480B parameters. Code, reason, vision, multimodal -- all trained in-house.',
    Icon: IconSparkles,
  },
  {
    title: '100+ Models',
    description:
      'Claude, GPT-5, DeepSeek, Qwen, and more. Every major provider through one interface.',
    Icon: IconCube,
  },
  {
    title: 'MCP Tools',
    description:
      '260+ Model Context Protocol tools for web search, code execution, file management, and APIs.',
    Icon: IconPuzzle,
  },
  {
    title: 'Agents',
    description:
      'Build and deploy custom AI agents with tool use, memory, and multi-step reasoning.',
    Icon: IconCpuChip,
  },
];

const zenModels = [
  { name: 'zen4', description: 'General-purpose frontier model', context: '128K', params: '70B' },
  { name: 'zen4-coder', description: 'Optimized for code generation', context: '128K', params: '70B' },
  { name: 'zen4-ultra', description: 'Maximum capability reasoning', context: '128K', params: '480B' },
  { name: 'zen3-omni', description: 'Multimodal vision and text', context: '128K', params: '32B' },
];

const thirdPartyModels = [
  'GPT-5', 'Claude Opus 4', 'Gemini 2.5', 'DeepSeek R1',
  'Qwen3', 'Llama 4', 'Mistral Large', 'Command R+',
  'Grok', 'Phi-4',
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { data: config } = useGetStartupConfig();
  const serverDomain = config?.serverDomain || '';
  const iamSdk = getHanzoIamSdk();

  // When IAM SDK is available, login is an async redirect (PKCE).
  // Otherwise fall back to the backend OAuth endpoint.
  const loginHref = iamSdk ? '#' : `${serverDomain}/oauth/openid`;

  const handleLoginClick = useCallback(
    (e: React.MouseEvent) => {
      if (iamSdk) {
        e.preventDefault();
        iamSdk.signinRedirect();
      }
    },
    [iamSdk],
  );

  return (
    <div
      className="min-h-screen selection:bg-[#fd4444]/30"
      style={{
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ---- Navbar (matches fd HomeLayout nav) ---- */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(5, 5, 5, 0.8)',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <HanzoLogo className="size-5 text-[#fd4444]" />
            <span className="text-sm font-bold tracking-tight">Hanzo Chat</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://hanzo.ai/docs/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm transition-colors sm:inline"
              style={{ color: colors.mutedFg }}
              onMouseOver={(e) => (e.currentTarget.style.color = colors.fg)}
              onMouseOut={(e) => (e.currentTarget.style.color = colors.mutedFg)}
            >
              Docs
            </a>
            <a
              href="https://github.com/hanzoai/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden transition-colors sm:inline"
              style={{ color: colors.mutedFg }}
              onMouseOver={(e) => (e.currentTarget.style.color = colors.fg)}
              onMouseOut={(e) => (e.currentTarget.style.color = colors.mutedFg)}
            >
              <IconGitHub className="size-[18px]" />
            </a>
            <a
              href={loginHref}
              onClick={handleLoginClick}
              className="rounded-full px-5 py-2 text-sm font-medium tracking-tight transition-colors"
              style={{ backgroundColor: colors.brand, color: '#fff' }}
              onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
            >
              Log in
            </a>
          </div>
        </div>
      </nav>

      {/* ---- Hero (bordered card like dev.hanzo.ai) ---- */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4">
        <section
          className="relative flex min-h-[600px] flex-col overflow-hidden rounded-2xl"
          style={{
            border: `1px solid ${colors.border}`,
            background: `linear-gradient(135deg, rgba(253,68,68,0.08) 0%, transparent 50%, rgba(253,68,68,0.04) 100%)`,
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 flex flex-1 flex-col px-6 py-12 md:px-12">
            {/* Badge */}
            <div
              className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                border: `1px solid rgba(253,68,68,0.5)`,
                color: colors.brand,
              }}
            >
              <IconTerminal className="size-4" />
              AI Chat Platform
            </div>

            {/* Heading */}
            <h1 className="my-8 text-4xl font-medium leading-tight tracking-tight lg:text-5xl xl:text-6xl">
              <span style={{ color: colors.brand }}>Hanzo Chat</span> -- Every
              <br />
              Model, One Interface
            </h1>

            <p className="mb-8 max-w-2xl text-lg" style={{ color: colors.mutedFg }}>
              AI-powered chat with 14 Zen models, 100+ third-party models, MCP tools,
              and custom agents. Pay only for what you use.
            </p>

            {/* Buttons (rounded-full like fd) */}
            <div className="flex flex-row flex-wrap items-center gap-4">
              <a
                href={loginHref}
                onClick={handleLoginClick}
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium tracking-tight transition-colors"
                style={{ backgroundColor: colors.brand, color: '#fff' }}
                onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
              >
                Get Started Free
                <IconArrowRight />
              </a>
              <a
                href="https://hanzo.ai/docs/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium tracking-tight transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.secondary,
                  color: 'hsl(0, 0%, 92%)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'hsla(0, 0%, 40%, 0.3)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
              >
                Documentation
              </a>
            </div>

            {/* Chat Preview (terminal-style card like dev.hanzo.ai) */}
            <div className="mt-12 w-full max-w-3xl">
              <div
                className="overflow-hidden rounded-xl shadow-2xl"
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: 'rgba(26, 26, 26, 0.5)',
                  }}
                >
                  <div className="flex gap-1.5">
                    <div className="size-3 rounded-full bg-red-500" />
                    <div className="size-3 rounded-full bg-yellow-500" />
                    <div className="size-3 rounded-full bg-green-500" />
                  </div>
                  <span className="ml-2 text-xs" style={{ color: colors.mutedFg }}>
                    chat.hanzo.ai
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-sm" style={{ fontFamily: "'Roboto Mono', 'Geist Mono', monospace" }}>
                  <code>{`You: Refactor the auth module to use JWT tokens

zen4-coder: I'll help you refactor the auth module.

  Plan:
  1. Replace session-based auth with JWT
  2. Add token refresh endpoint
  3. Update middleware to verify JWT
  4. Write migration script

  Let me implement this step by step...

  Created: src/auth/jwt.ts
  Modified: src/middleware/auth.ts
  Updated: 8 test files
  All tests passing.`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ---- Feature Grid (fd cardVariants pattern) ---- */}
      <div className="mx-auto mt-12 grid w-full max-w-[1400px] grid-cols-1 gap-10 px-6 md:px-12 lg:grid-cols-2">
        <p className="col-span-full text-2xl font-light leading-snug tracking-tight md:text-3xl xl:text-4xl">
          Ship faster with{' '}
          <span className="font-medium" style={{ color: colors.brand }}>Zen frontier models</span>,{' '}
          <span className="font-medium" style={{ color: colors.brand }}>100+ providers</span>, and{' '}
          <span className="font-medium" style={{ color: colors.brand }}>260+ MCP tools</span>.
        </p>

        {features.map(({ title, description, Icon }) => (
          <div
            key={title}
            className="rounded-2xl p-6 text-sm shadow-lg transition-colors"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'hsla(0, 0%, 40%, 0.35)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = colors.border)}
          >
            <Icon className="mb-4 size-8" style={{ color: colors.brand }} />
            <h3 className="mb-2 text-xl font-medium tracking-tight lg:text-2xl">{title}</h3>
            <p style={{ color: colors.mutedFg }}>{description}</p>
          </div>
        ))}
      </div>

      {/* ---- Zen Models (secondary card variant) ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-sm shadow-lg md:p-8"
          style={{
            backgroundColor: 'rgba(253, 68, 68, 0.06)',
            border: `1px solid rgba(253, 68, 68, 0.15)`,
          }}
        >
          <IconBolt className="mb-4 size-8" style={{ color: colors.brand }} />
          <h3 className="mb-4 text-xl font-medium tracking-tight lg:text-2xl">
            Zen Frontier Models
          </h3>
          <p className="mb-6" style={{ color: colors.mutedFg }}>
            Trained in-house. Fast, capable, affordable.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {zenModels.map((m) => (
              <div
                key={m.name}
                className="rounded-lg p-4 transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(253, 68, 68, 0.3)')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = colors.border)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: colors.brand }} />
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Roboto Mono', 'Geist Mono', monospace" }}>
                    {m.name}
                  </span>
                </div>
                <p className="mb-3 text-xs" style={{ color: colors.mutedFg }}>
                  {m.description}
                </p>
                <div className="flex gap-2 text-xs" style={{ color: 'hsl(0, 0%, 45%)' }}>
                  <span className="rounded px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {m.params}
                  </span>
                  <span className="rounded px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {m.context} ctx
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Third-Party Models ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-sm shadow-lg md:p-8"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h3 className="mb-4 text-xl font-medium tracking-tight lg:text-2xl">
            Every Major Model
          </h3>
          <p className="mb-6" style={{ color: colors.mutedFg }}>
            Switch between providers instantly. No vendor lock-in.
          </p>
          <div className="flex flex-wrap gap-3">
            {thirdPartyModels.map((model) => (
              <div
                key={model}
                className="rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  color: 'hsl(0, 0%, 85%)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 40%, 0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.color = 'hsl(0, 0%, 85%)';
                }}
              >
                {model}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Pricing (col-span-full card) ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-center shadow-lg md:p-12"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2 className="mb-4 text-3xl font-medium tracking-tight lg:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mb-10 text-lg" style={{ color: colors.mutedFg }}>
            Pay only for what you use. No subscriptions. No hidden fees.
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
            <div
              className="rounded-xl p-6"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 45%)' }}>
                Starting at
              </p>
              <p className="text-3xl font-bold">$0.30</p>
              <p className="mt-1 text-sm" style={{ color: colors.mutedFg }}>
                per million tokens
              </p>
            </div>
            <div
              className="rounded-xl p-6"
              style={{
                border: `1px solid rgba(253, 68, 68, 0.3)`,
                backgroundColor: 'rgba(253, 68, 68, 0.04)',
              }}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(253, 68, 68, 0.7)' }}>
                Free credit
              </p>
              <p className="text-3xl font-bold">$5</p>
              <p className="mt-1 text-sm" style={{ color: colors.mutedFg }}>
                no credit card required
              </p>
            </div>
            <div
              className="rounded-xl p-6"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 45%)' }}>
                Billing
              </p>
              <p className="text-3xl font-bold">Usage</p>
              <p className="mt-1 text-sm" style={{ color: colors.mutedFg }}>
                pay as you go
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- CTA (secondary variant card) ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 pb-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-center shadow-lg md:p-12"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2 className="mb-4 text-3xl font-medium tracking-tight lg:text-4xl">
            Ready to Chat?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl" style={{ color: colors.mutedFg }}>
            Sign in with your Hanzo account. $5 free credit, no setup required.
          </p>
          <div className="flex flex-row items-center justify-center gap-4">
            <a
              href={loginHref}
              onClick={handleLoginClick}
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium tracking-tight transition-colors"
              style={{ backgroundColor: colors.brand, color: '#fff' }}
              onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
            >
              Get Started Free
              <IconArrowRight />
            </a>
            <a
              href="https://hanzo.ai/docs/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium tracking-tight transition-colors"
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.secondary,
                color: 'hsl(0, 0%, 92%)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'hsla(0, 0%, 40%, 0.3)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
            >
              Documentation
            </a>
          </div>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <footer
        className="mt-0 py-8"
        style={{ borderTop: `1px solid ${colors.border}` }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 sm:flex-row md:px-12">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(0, 0%, 40%)' }}>
            <HanzoLogo className="size-4" style={{ color: 'hsl(0, 0%, 40%)' }} />
            Powered by Hanzo AI
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'hsl(0, 0%, 40%)' }}>
            {[
              { label: 'hanzo.ai', href: 'https://hanzo.ai' },
              { label: 'Documentation', href: 'https://hanzo.ai/docs/chat' },
              { label: 'Console', href: 'https://console.hanzo.ai' },
              { label: 'Privacy', href: 'https://hanzo.ai/privacy' },
              { label: 'Terms', href: 'https://hanzo.ai/terms' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                onMouseOver={(e) => (e.currentTarget.style.color = colors.fg)}
                onMouseOut={(e) => (e.currentTarget.style.color = 'hsl(0, 0%, 40%)')}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
