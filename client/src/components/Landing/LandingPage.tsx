import React from 'react';
import { useGetStartupConfig } from '~/data-provider';

/* ------------------------------------------------------------------ */
/*  Inline SVG icon components (Heroicons outline, no dependencies)   */
/* ------------------------------------------------------------------ */

const IconSparkles = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const IconCube = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const IconPuzzle = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
  </svg>
);

const IconCpuChip = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
  </svg>
);

const IconArrowRight = () => (
  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

/* Hanzo geometric H logo (inline SVG, no external dependency) */
const HanzoLogo = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 67 67" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
    <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
    <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
    <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
    <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
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
  {
    name: 'zen4',
    description: 'General-purpose frontier model',
    context: '128K',
    params: '70B',
  },
  {
    name: 'zen4-coder',
    description: 'Optimized for code generation',
    context: '128K',
    params: '70B',
  },
  {
    name: 'zen4-ultra',
    description: 'Maximum capability reasoning',
    context: '128K',
    params: '480B',
  },
  {
    name: 'zen3-omni',
    description: 'Multimodal vision and text',
    context: '128K',
    params: '32B',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { data: config } = useGetStartupConfig();
  const serverDomain = config?.serverDomain || '';
  const loginHref = `${serverDomain}/oauth/openid`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#fd4444]/30">
      {/* ---- Navbar ---- */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <HanzoLogo className="h-7 w-7 text-[#fd4444]" />
            <span className="text-lg font-semibold tracking-tight">Hanzo Chat</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://hanzo.ai/docs/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-neutral-400 transition-colors hover:text-white sm:inline"
            >
              Docs
            </a>
            <a
              href={loginHref}
              className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-200"
            >
              Log in
            </a>
          </div>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden pt-36 pb-28 sm:pt-44 sm:pb-36">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-200px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[#fd4444]/[0.04] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#fd4444]/20 bg-[#fd4444]/[0.06] px-4 py-1.5 text-sm text-[#fd4444]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#fd4444]" />
            $5 free credit -- no card required
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-white">Hanzo Chat</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
            AI-powered chat with 14 Zen models, 100+ third-party models, and MCP tools.
            One interface for every model. Pay only for what you use.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={loginHref}
              className="inline-flex items-center rounded-xl bg-[#fd4444] px-8 py-3.5 text-lg font-medium text-white shadow-lg shadow-[#fd4444]/20 transition-all hover:shadow-[#fd4444]/30 hover:brightness-110"
            >
              Get Started
              <IconArrowRight />
            </a>
            <a
              href="https://hanzo.ai/docs/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-white/10 px-8 py-3.5 text-lg font-medium text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              Documentation
            </a>
          </div>
        </div>
      </section>

      {/* ---- Feature Grid ---- */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need
            </h2>
            <p className="text-lg text-neutral-400">
              One platform. Every model. Unlimited tools.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map(({ title, description, Icon }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <div className="mb-5 inline-flex rounded-xl bg-[#fd4444]/10 p-3 text-[#fd4444]">
                  <Icon />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{title}</h3>
                <p className="leading-relaxed text-neutral-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Model Showcase ---- */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Zen Models
            </h2>
            <p className="text-lg text-neutral-400">
              Frontier models trained in-house. Fast, capable, affordable.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {zenModels.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-[#fd4444]/20 hover:bg-white/[0.04]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#fd4444]" />
                  <span className="font-mono text-sm font-semibold text-white">{m.name}</span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-neutral-400">{m.description}</p>
                <div className="flex gap-3 text-xs text-neutral-500">
                  <span className="rounded bg-white/[0.06] px-2 py-0.5">{m.params}</span>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5">{m.context} ctx</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Third-Party Models ---- */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Every major model, one interface
          </h2>
          <p className="mb-12 text-lg text-neutral-400">
            Switch between providers instantly. No vendor lock-in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              'GPT-5', 'Claude Opus 4', 'Gemini 2.5', 'DeepSeek R1',
              'Qwen3', 'Llama 4', 'Mistral Large', 'Command R+',
              'Grok', 'Phi-4',
            ].map((model) => (
              <div
                key={model}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-white/[0.12] hover:text-white"
              >
                {model}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mb-12 text-lg text-neutral-400">
            Pay only for what you use. No subscriptions. No hidden fees.
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-neutral-500">Starting at</p>
              <p className="text-3xl font-bold text-white">$0.30</p>
              <p className="mt-1 text-sm text-neutral-400">per million tokens</p>
            </div>
            <div className="rounded-2xl border border-[#fd4444]/20 bg-[#fd4444]/[0.04] p-8">
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[#fd4444]/70">Free credit</p>
              <p className="text-3xl font-bold text-white">$5</p>
              <p className="mt-1 text-sm text-neutral-400">no credit card required</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-neutral-500">Billing</p>
              <p className="text-3xl font-bold text-white">Usage</p>
              <p className="mt-1 text-sm text-neutral-400">pay as you go</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Start chatting in seconds
          </h2>
          <p className="mb-8 text-lg text-neutral-400">
            Sign in with your Hanzo account. $5 free credit, no setup required.
          </p>
          <a
            href={loginHref}
            className="inline-flex items-center rounded-xl bg-[#fd4444] px-8 py-3.5 text-lg font-medium text-white shadow-lg shadow-[#fd4444]/20 transition-all hover:shadow-[#fd4444]/30 hover:brightness-110"
          >
            Get Started Free
            <IconArrowRight />
          </a>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <HanzoLogo className="h-5 w-5 text-neutral-500" />
              Powered by Hanzo AI
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
              <a
                href="https://hanzo.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                hanzo.ai
              </a>
              <a
                href="https://hanzo.ai/docs/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                docs.hanzo.ai
              </a>
              <a
                href="https://console.hanzo.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                console.hanzo.ai
              </a>
              <a
                href="https://hanzo.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Privacy
              </a>
              <a
                href="https://hanzo.ai/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
