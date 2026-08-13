import React, { useCallback } from 'react';
import { HanzoHeader, HanzoPreFooterCTA, HanzoFooter } from '@hanzogui/shell';
import { label } from '~/utils/model';
import { useLandingPlans } from '~/utils/plans';
import { getHanzoIamSdk } from '~/utils/iam';

/* ------------------------------------------------------------------ */
/*  Design tokens matching dev.hanzo.ai (Geist/fd- design system)     */
/* ------------------------------------------------------------------ */

const colors = {
  bg: '#000000' /* true-black canvas */,
  card: '#050505' /* panel — converged off #0a0a0a onto the token scale */,
  muted: '#171717' /* elevated / border — token scale */,
  mutedFg: 'hsla(0, 0%, 70%, 0.85)',
  border: 'hsla(0, 0%, 40%, 0.2)',
  fg: 'hsl(0, 0%, 96%)',
  /* Dimmest legible grey on the #050505 card: hsl 45% measured 4.04:1 against the
     featured tier's rgba(255,255,255,0.04) composite, under the 4.5:1 floor. */
  dim: 'hsl(0, 0%, 52%)',
  brand: '#ffffff',
  brandDim: 'rgba(255, 255, 255, 0.10)',
  brandGlow: 'rgba(255, 255, 255, 0.06)',
  secondary: '#1f1f1f',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (Lucide-style, no dependencies)                  */
/* ------------------------------------------------------------------ */

const IconTerminal = ({ className = 'size-4' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
    />
  </svg>
);

const IconSparkles = ({
  className = 'size-8',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
    />
  </svg>
);

const IconCube = ({
  className = 'size-8',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
    />
  </svg>
);

const IconPuzzle = ({
  className = 'size-8',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
    />
  </svg>
);

const IconCpuChip = ({
  className = 'size-8',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z"
    />
  </svg>
);

const IconBolt = ({
  className = 'size-8',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
    />
  </svg>
);

const IconArrowRight = ({ className = 'ml-2 size-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: 'Zen Models',
    description:
      '14 frontier models from 4B to 480B parameters. Code, reason, vision, multimodal — built by Zoo Labs Foundation.',
    Icon: IconSparkles,
  },
  {
    title: '100+ Models',
    description:
      'The Zen model family plus Claude, GPT-5, Gemini, and more. Every major provider through one interface.',
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

// The frontier models served today: Enso, which is Hanzo's, and Zen, which is
// Zoo Labs Foundation's. Names only — the repo carries no authoritative
// param/context numbers, so we advertise none rather than invent them (honesty:
// only claim what's live).
const frontierModels = [
  { name: 'enso', description: 'Flagship reasoning model' },
  { name: 'enso-flash', description: 'Fast, low-latency responses' },
  { name: 'zen5', description: 'General-purpose frontier model' },
  { name: 'zen5-coder', description: 'Optimized for code generation' },
  { name: 'zen3-omni', description: 'Multimodal vision and text' },
];

// Independent third-party models the gateway actually streams today (verified
// live via api.hanzo.ai). This is the third-party wall — distinct from the
// frontier models above; we only list providers that are genuinely served.
const thirdPartyModels = [
  'Claude Opus 4.8',
  'Claude 5 Sonnet',
  'GPT-5.2',
  'DeepSeek V4',
  'Qwen3.5',
  'Llama 4',
];

/* ------------------------------------------------------------------ */
/*  Call to action                                                    */
/* ------------------------------------------------------------------ */

/**
 * The ONE call-to-action pair, used by the hero and the closing card.
 *
 * Both buttons carry a 1px border — the filled one transparent — so the two
 * boxes measure identically. Bordering only the secondary made it 46px tall
 * next to a 44px sibling, one pixel higher on the baseline.
 */
const CTA =
  'inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-medium tracking-tight transition-colors';

function CtaPair({ onSignIn }: { onSignIn: (e: React.MouseEvent) => void }) {
  return (
    <>
      <a
        href="#"
        onClick={onSignIn}
        className={CTA}
        style={{ borderColor: 'transparent', backgroundColor: colors.brand, color: '#000' }}
        onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
        onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
      >
        Get Started Free
        <IconArrowRight />
      </a>
      <a
        href="https://docs.hanzo.ai/docs/chat"
        target="_blank"
        rel="noopener noreferrer"
        className={CTA}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          color: 'hsl(0, 0%, 92%)',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'hsla(0, 0%, 40%, 0.3)')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
      >
        Documentation
      </a>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  // The plans the strip below advertises, from the catalog rather than restated.
  const landingPlans = useLandingPlans();

  // Login is the @hanzo/iam redirect-PKCE flow.
  const handleLoginClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    getHanzoIamSdk().signinRedirect();
  }, []);

  return (
    <div
      className="min-h-screen selection:bg-white/20"
      style={{
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ---- Unified Hanzo marketing header (shared @hanzogui/shell) ---- */}
      <HanzoHeader surface="hanzo.chat" />

      {/* ---- Hero (bordered card like dev.hanzo.ai) ---- */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4">
        <section
          className="relative flex min-h-[600px] flex-col overflow-hidden rounded-2xl"
          style={{
            border: `1px solid ${colors.border}`,
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)`,
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 flex flex-1 flex-col px-6 py-12 md:px-12">
            {/* Badge */}
            <div
              className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                border: `1px solid rgba(255,255,255,0.5)`,
                color: colors.brand,
              }}
            >
              <IconTerminal className="size-4" />
              AI Chat Platform
            </div>

            {/* Heading */}
            <h1 className="my-8 text-4xl font-medium leading-tight tracking-tight lg:text-5xl xl:text-6xl">
              <span style={{ color: colors.brand }}>Hanzo Chat</span> — Every
              <br />
              Model, One Interface
            </h1>

            <p className="mb-8 max-w-2xl text-lg" style={{ color: colors.mutedFg }}>
              AI-powered chat with 14 Zen models, 100+ third-party models, MCP tools, and custom
              agents. One plan, shared across every Hanzo app.
            </p>

            {/* Buttons (rounded-full like fd) */}
            <div className="flex flex-row flex-wrap items-center gap-4">
              <CtaPair onSignIn={handleLoginClick} />
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
                    hanzo.chat
                  </span>
                </div>
                <pre
                  className="overflow-x-auto p-4 text-sm"
                  style={{ fontFamily: "'Roboto Mono', 'Geist Mono', monospace" }}
                >
                  <code>{`You: Compare the three big open-source vector databases
     for a 10M-embedding product search

zen5: Searched the web — 21 sources. Short version:

  Qdrant    fastest filtered search, Rust core
  Milvus    biggest scale, GPU index builds
  pgvector  simplest ops if you already run Postgres

  At 10M vectors any of them fits in one node.
  Start with pgvector; revisit past ~50M or when
  filter-heavy queries dominate.

  Want the benchmark table or a migration checklist?`}</code>
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
          <span className="font-medium" style={{ color: colors.brand }}>
            Zen frontier models
          </span>
          ,{' '}
          <span className="font-medium" style={{ color: colors.brand }}>
            100+ providers
          </span>
          , and{' '}
          <span className="font-medium" style={{ color: colors.brand }}>
            260+ MCP tools
          </span>
          .
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
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: `1px solid rgba(255, 255, 255, 0.15)`,
          }}
        >
          <IconBolt className="mb-4 size-8" style={{ color: colors.brand }} />
          <h3 className="mb-4 text-xl font-medium tracking-tight lg:text-2xl">Frontier Models</h3>
          <p className="mb-6" style={{ color: colors.mutedFg }}>
            Enso by Hanzo, Zen by Zoo Labs Foundation. Fast, capable, affordable.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {frontierModels.map((m) => (
              <div
                key={m.name}
                className="rounded-lg p-4 transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)')
                }
                onMouseOut={(e) => (e.currentTarget.style.borderColor = colors.border)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: colors.brand }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'Roboto Mono', 'Geist Mono', monospace" }}
                  >
                    {label(m.name)}
                  </span>
                </div>
                <p className="text-xs" style={{ color: colors.mutedFg }}>
                  {m.description}
                </p>
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
          <h3 className="mb-4 text-xl font-medium tracking-tight lg:text-2xl">Every Major Model</h3>
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
            One plan, every Hanzo app
          </h2>
          <p className="mb-10 text-lg" style={{ color: colors.mutedFg }}>
            Shared AI usage across chat, the app builder, and the API — plus pay-as-you-go beyond
            your plan.
          </p>
          {/* Read from the catalog, never restated. Three literals lived here —
              Pro $20, Plus $100, Max $200 — and by the time anyone looked all
              three were wrong: Pro is $49, Max is $99, and Plus was retired.
              Every card links to hanzo.ai/pricing, so a visitor read one price
              here and a different one the moment they clicked. */}
          {/* Responsive, not a fixed column count: an inline gridTemplateColumns
              would put four cards side by side on a phone. The ladder grew from
              three tiers to four, so the old sm:grid-cols-3 no longer fits either
              — the fourth would wrap alone underneath. */}
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {landingPlans.map(({ name, price, blurb, featured }) => (
              <a
                key={name}
                href="https://hanzo.ai/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl p-6 text-left transition-colors"
                style={{
                  border: featured
                    ? '1px solid rgba(255, 255, 255, 0.3)'
                    : `1px solid ${colors.border}`,
                  backgroundColor: featured ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'hsla(0, 0%, 40%, 0.5)')}
                onMouseOut={(e) =>
                  (e.currentTarget.style.borderColor = featured
                    ? 'rgba(255, 255, 255, 0.3)'
                    : colors.border)
                }
              >
                <p
                  className="mb-2 text-xs font-medium tracking-wider"
                  style={{ color: colors.dim }}
                >
                  {name}
                </p>
                <p className="text-3xl font-bold">
                  {price}
                  <span className="text-base font-normal" style={{ color: colors.mutedFg }}>
                    /mo
                  </span>
                </p>
                <p className="mt-1 text-sm" style={{ color: colors.mutedFg }}>
                  {blurb}
                </p>
                <span
                  className="mt-4 inline-flex items-center text-sm font-medium"
                  style={{ color: colors.fg }}
                >
                  See plan details
                  <IconArrowRight className="ml-1.5 size-4" />
                </span>
              </a>
            ))}
          </div>
          <p className="mt-8 text-sm" style={{ color: colors.dim }}>
            Start free — $5 credit, no card required. Usage is shared across every Hanzo app.
          </p>
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
          <h2 className="mb-4 text-3xl font-medium tracking-tight lg:text-4xl">Ready to Chat?</h2>
          <p className="mx-auto mb-8 max-w-2xl" style={{ color: colors.mutedFg }}>
            Sign in with your Hanzo account. $5 free credit, no setup required.
          </p>
          <div className="flex flex-row flex-wrap items-center justify-center gap-4">
            <CtaPair onSignIn={handleLoginClick} />
          </div>
        </div>
      </div>

      {/* ---- Unified Hanzo pre-footer CTA + ecosystem footer (shared shell) ---- */}
      <HanzoPreFooterCTA surface="hanzo.chat" />
      <HanzoFooter currentProductId="chat" />
    </div>
  );
}
