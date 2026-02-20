import React from 'react';
import { useGetStartupConfig } from '~/data-provider';

const features = [
  {
    title: 'Multi-Model AI',
    description: 'Access frontier models from OpenAI, Anthropic, Google, and more through a single unified interface.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
  {
    title: 'MCP Tools',
    description: 'Extend your AI with Model Context Protocol — connect to databases, APIs, and custom tools seamlessly.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
      </svg>
    ),
  },
  {
    title: 'Team Workspaces',
    description: 'Collaborate with your team in shared conversations. Manage access with organization-level controls.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    title: 'Secure by Default',
    description: 'Enterprise SSO via Hanzo Identity. Your conversations are encrypted and private to your organization.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  const { data: config } = useGetStartupConfig();
  const serverDomain = config?.serverDomain || '';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.svg" alt="Hanzo Chat" className="h-8 w-auto brightness-0 invert" />
            <span className="text-xl font-semibold">Hanzo Chat</span>
          </div>
          <a
            href={`${serverDomain}/oauth/openid`}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
          >
            Log in
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            Powered by Hanzo AI
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI chat for
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              your entire team
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
            Access every frontier model through one beautiful interface.
            Built for teams that ship fast.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={`${serverDomain}/oauth/openid`}
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-lg font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              Get Started
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="https://hanzo.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-gray-700 px-8 py-3.5 text-lg font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Everything you need
            </h2>
            <p className="text-lg text-gray-400">
              One platform for AI-powered collaboration
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-800 bg-gray-800/30 p-8 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
              >
                <div className="mb-4 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                <p className="leading-relaxed text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="border-t border-gray-800 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Every model, one interface
          </h2>
          <p className="mb-12 text-lg text-gray-400">
            Switch between providers instantly. No vendor lock-in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {['GPT-4o', 'Claude 4', 'Gemini 2', 'Llama 4', 'Mistral', 'DeepSeek'].map((model) => (
              <div
                key={model}
                className="rounded-xl border border-gray-700 bg-gray-800/50 px-6 py-3 text-sm font-medium text-gray-300"
              >
                {model}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-lg text-gray-400">
            Sign in with your Hanzo account and start chatting in seconds.
          </p>
          <a
            href={`${serverDomain}/oauth/openid`}
            className="inline-flex items-center rounded-xl bg-white px-8 py-3.5 text-lg font-medium text-gray-900 transition-colors hover:bg-gray-200"
          >
            Log in with Hanzo
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <img src="/assets/logo.svg" alt="" className="h-5 w-auto brightness-0 invert opacity-50" />
              Powered by Hanzo AI
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="https://hanzo.ai" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                Hanzo AI
              </a>
              <a href="https://hanzo.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                Privacy
              </a>
              <a href="https://hanzo.ai/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
