import React, { useCallback } from 'react';
import { HanzoHeader, HanzoPreFooterCTA, HanzoFooter } from '@hanzogui/shell';
import { useLandingPlans } from '~/utils/plans';
import { getHanzoIamSdk } from '~/utils/iam';

/**
 * What hanzo.chat says it is, to someone who has not used it yet.
 *
 * It answers at /welcome, and at the root when a guest session could not be
 * minted — see routes/Root.tsx for that second case. Either way the reader is
 * one click from the product, so this page's whole job is to say what the
 * product is and get out of the way.
 *
 * WHAT THIS PAGE IS NOT. hanzo.chat is the chat product; hanzo.ai/chat is the
 * company's page ABOUT the chat product, and hanzo.ai/pricing is where a price
 * is published. Three earlier sections here were second copies of surfaces that
 * already exist elsewhere — a wall of house models, a wall of third-party model
 * version strings, and a pitch built on the number of models reachable. Two
 * things go wrong with a page like that. It rots, because a model id written
 * into marketing copy outlives the model. And it sells the wrong product: "every
 * model, one interface" describes a gateway, and this is a chat app.
 *
 * The plans strip stays, and it stays read from the catalog (see utils/plans),
 * because what a consumer product costs is a fair question to ask on its front
 * page. The detail lives at hanzo.ai/pricing and every card goes there.
 *
 * ATTRIBUTION. Enso is Hanzo's. Zen is Zoo Labs Foundation's. Models from other
 * labs belong to those labs. This page previously said fourteen frontier models
 * were "all trained in-house", which was not ours to say — and the correction
 * that landed first, naming Zoo Labs Foundation beside the wall, still left the
 * wall itself counting models and quoting a parameter range. Removing the wall
 * settles both: nothing here counts what we serve, so nothing has to be kept in
 * step with a catalog that changes without asking.
 */

/* ------------------------------------------------------------------ */
/*  Design tokens matching dev.hanzo.ai (Geist/fd- design system)     */
/* ------------------------------------------------------------------ */

const colors = {
  bg: '#000000' /* true-black canvas */,
  card: '#050505' /* panel — converged off #0a0a0a onto the token scale */,
  mutedFg: 'hsla(0, 0%, 70%, 0.85)',
  border: 'hsla(0, 0%, 40%, 0.2)',
  fg: 'hsl(0, 0%, 96%)',
  /* Dimmest legible grey on the #050505 card: hsl 45% measured 4.04:1 against the
     featured tier's rgba(255,255,255,0.04) composite, under the 4.5:1 floor. */
  dim: 'hsl(0, 0%, 52%)',
  brand: '#ffffff',
  secondary: '#1f1f1f',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (Lucide-style, no dependencies)                  */
/* ------------------------------------------------------------------ */

const Icon = ({
  d,
  className = 'size-8',
  style,
}: {
  d: string;
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
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const PATH = {
  globe:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.95 8.95 0 0 0 3.6-8.95A8.95 8.95 0 0 0 12 3m0 18a8.95 8.95 0 0 1-3.6-8.95A8.95 8.95 0 0 1 12 3M3.6 9h16.8M3.6 15h16.8',
  terminal:
    'm6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  files:
    'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  agent:
    'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z',
  route:
    'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
  arrowRight: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
};

/* ------------------------------------------------------------------ */
/*  What a conversation here can do.                                   */
/*                                                                     */
/*  Every one of these is on in production for a signed-in reader.      */
/*  Four things that were on this page are NOT here, and each was       */
/*  checked rather than assumed: image generation ships no key and      */
/*  there is no image endpoint behind it; MCP has a standing build      */
/*  gate refusing it until something filters its tools, so a reader     */
/*  may bring a server but we do not hand them tools; the agent         */
/*  marketplace is off for the USER role; and projects and scheduled    */
/*  tasks are cards that link to hanzo.app, with no scheduler anywhere  */
/*  in the tree. A capability is claimed here only if it answers.       */
/* ------------------------------------------------------------------ */

const abilities = [
  {
    title: 'It can look things up',
    body: 'Ask about something that happened this morning and it searches the web, then tells you where the answer came from.',
    d: PATH.globe,
  },
  {
    title: 'It can run the code it writes',
    body: 'Code runs in a sandbox and the output comes back in the thread, so an answer that does not work is visibly broken rather than confidently formatted.',
    d: PATH.terminal,
  },
  {
    title: 'It can read what you give it',
    body: 'Drop in images, PDFs and text and ask across all of them at once, rather than one document at a time.',
    d: PATH.files,
  },
  {
    title: 'It can be given a standing job',
    body: 'Build an agent in the conversation, hand it the tools it needs, and call it by name the next time the same work comes round.',
    d: PATH.agent,
  },
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
 *
 * The first goes to the product rather than to the issuer. Guest chat is on
 * here, so a visitor can ask before deciding anything; signing in is the second
 * button, for the people who already know they want their history kept.
 */
const CTA =
  'inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-medium tracking-tight transition-colors';

function CtaPair({ onSignIn }: { onSignIn: (e: React.MouseEvent) => void }) {
  return (
    <>
      <a
        href="/"
        className={CTA}
        style={{ borderColor: 'transparent', backgroundColor: colors.brand, color: '#000' }}
        onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
        onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
      >
        Start a conversation
        <Icon d={PATH.arrowRight} className="ml-2 size-4" />
      </a>
      <a
        href="#"
        onClick={onSignIn}
        className={CTA}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          color: 'hsl(0, 0%, 92%)',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'hsla(0, 0%, 40%, 0.3)')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
      >
        Sign in
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

      {/* ---- Hero ---- */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4">
        <section
          className="relative flex flex-col overflow-hidden rounded-2xl"
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
            <h1 className="mb-6 max-w-3xl text-4xl font-medium leading-tight tracking-tight lg:text-5xl xl:text-6xl">
              Ask Hanzo anything.
            </h1>

            <p className="mb-8 max-w-2xl text-lg" style={{ color: colors.mutedFg }}>
              A chat app that searches the web, runs the code it writes, and reads the files
              you drop in — all in the conversation you are already having.
            </p>

            <div className="flex flex-row flex-wrap items-center gap-4">
              <CtaPair onSignIn={handleLoginClick} />
            </div>

            {/* Two, exactly: a guest gets GUEST_MESSAGE_MAX messages on one model
                and none of the tools above. Saying "a couple" invited the reader
                to find out which couple; saying two is the whole disclosure. */}
            <p className="mt-4 text-sm" style={{ color: colors.dim }}>
              Ask two questions as a guest. Sign in for the rest.
            </p>

            {/* The product's own screen. It used to be a made-up transcript typed
                into a terminal card — a conversation nobody ever had, quoting a
                source count nobody ever counted. */}
            <div className="mt-12 w-full max-w-4xl">
              <img
                src="assets/chat-screen.jpg"
                alt="A Hanzo Chat conversation, with earlier chats listed alongside it."
                className="block w-full rounded-xl shadow-2xl"
                style={{ border: `1px solid ${colors.border}` }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ---- What a conversation can do ---- */}
      <div className="mx-auto mt-12 grid w-full max-w-[1400px] grid-cols-1 gap-10 px-6 md:px-12 lg:grid-cols-2">
        <p className="col-span-full text-2xl font-light leading-snug tracking-tight md:text-3xl xl:text-4xl">
          Most chat apps can only tell you about the work.{' '}
          <span className="font-medium" style={{ color: colors.brand }}>
            This one can go and do it.
          </span>
        </p>

        {abilities.map(({ title, body, d }) => (
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
            <Icon d={d} className="mb-4 size-8" style={{ color: colors.brand }} />
            <h3 className="mb-2 text-xl font-medium tracking-tight lg:text-2xl">{title}</h3>
            <p style={{ color: colors.mutedFg }}>{body}</p>
          </div>
        ))}
      </div>

      {/* ---- Which model answers ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-sm shadow-lg md:p-8"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: `1px solid rgba(255, 255, 255, 0.15)`,
          }}
        >
          <Icon d={PATH.route} className="mb-4 size-8" style={{ color: colors.brand }} />
          <h3 className="mb-4 text-xl font-medium tracking-tight lg:text-2xl">
            You do not have to pick a model
          </h3>
          {/* Enso is ours and it routes — the same sentence hanzo.ai's front page
              makes. What is NOT said is how it decides or what that costs; the
              mechanism is not this page's to describe and no measurement of it
              lives in this repo. Models from other labs belong to those labs. */}
          <p className="max-w-3xl" style={{ color: colors.mutedFg }}>
            Enso is our own model, and it picks which model answers each question, so you can
            leave it alone and get on with asking. Models from other labs are here too, and
            you can name one yourself at any point. Change your mind halfway through and the
            conversation carries over, so you never have to say it all again.
          </p>
        </div>
      </div>

      {/* ---- Plans ---- */}
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
            What you pay here also covers the app builder and the API.
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
                  <Icon d={PATH.arrowRight} className="ml-1.5 size-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ---- CTA ---- */}
      <div className="mx-auto mt-10 w-full max-w-[1400px] px-6 pb-6 md:px-12">
        <div
          className="rounded-2xl p-6 text-center shadow-lg md:p-12"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2 className="mb-4 text-3xl font-medium tracking-tight lg:text-4xl">
            Go ask it something
          </h2>
          <p className="mx-auto mb-8 max-w-2xl" style={{ color: colors.mutedFg }}>
            The first two questions do not need an account.
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
