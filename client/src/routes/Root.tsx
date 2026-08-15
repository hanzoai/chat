import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useIsSmallScreen } from '@hanzochat/client';
import { useAtom } from 'jotai';
import type { ContextType } from '~/common';
import {
  useSearchEnabled,
  useAssistantsMap,
  useAuthContext,
  useAgentsMap,
  useFileMap,
} from '~/hooks';
import {
  PromptGroupsProvider,
  AssistantsMapContext,
  AgentsMapContext,
  SetConvoProvider,
  FileMapContext,
} from '~/Providers';
import { useUserTermsQuery, useGetStartupConfig } from '~/data-provider';
import { Nav, MobileNav } from '~/components/Nav';
import { TermsAndConditionsModal } from '~/components/ui';
import { useHealthCheck } from '~/data-provider';
import { Banner } from '~/components/Banners';
import Backdrop from '~/components/Chat/Backdrop';
import LandingPage from '~/components/Landing/LandingPage';
import { IAM_ORG } from '~/utils/iam';
import LoginGate from '~/components/Auth/LoginGate';
import { Consent } from '~/components/Free';
import ProjectBanner from '~/components/Chat/ProjectBanner';
import Palette from '~/components/Palette';
import store from '~/store';

/** Two controls open Settings — the account menu and the palette — so the dialog
    stands here, above both, rather than inside either. Lazy because its tab tree
    is large and it arrived here from a block that was itself lazy-loaded. */
const Settings = lazy(() => import('~/components/Nav/Settings'));

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  // One value, owned by the atom — which also owns its first-visit default
  // (canvas on desktop, chrome on a phone) and its persistence. Root reads it
  // like any other consumer instead of being the place it lives.
  const [navVisible, setNavVisible] = useAtom(store.navVisible);
  const [showSettings, setShowSettings] = useAtom(store.showSettings);

  const { isAuthenticated, isGuest, logout, token } = useAuthContext();
  const [authChecked, setAuthChecked] = useState(false);

  // Guests get the chat UI without a full session. Capability-scoped hooks below
  // stay gated on `isAuthenticated`, so guests never query agents/files/search.
  const showChat = isAuthenticated || isGuest;

  // Wait for the initial silent refresh before deciding to show landing vs chat
  useEffect(() => {
    if (isAuthenticated || token !== undefined) {
      setAuthChecked(true);
    } else {
      // Give silentRefresh time to complete before showing landing page
      const timer = setTimeout(() => setAuthChecked(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, token]);
  const isSmallScreen = useIsSmallScreen();
  const location = useLocation();

  // A phone opens with the drawer SHUT every load, not only on first visit. The
  // atom owns the correct first-visit default (chrome on a phone), but its
  // PERSISTED value can carry a `true` from a wider session and would then drop
  // the drawer over the chat on a phone. The viewport is the authority here, so
  // close it once on mount when the screen is small. `useIsSmallScreen` reads
  // matchMedia synchronously, so its mount value is real; a mid-session resize
  // is deliberately left alone so an open drawer is never yanked shut mid-use.
  useEffect(() => {
    if (isSmallScreen) {
      setNavVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No offer on arrival. The gate opens only for a REFUSAL (quota spent, session
  // lapsed, preview unavailable) — a signed-out visitor lands in the product and
  // stays uninterrupted until something is actually denied. The sidebar foot's
  // Log in / Sign up carries the standing invitation.

  // Global health check - runs once per authenticated session
  useHealthCheck(isAuthenticated);

  const assistantsMap = useAssistantsMap({ isAuthenticated });
  const agentsMap = useAgentsMap({ isAuthenticated });
  const fileMap = useFileMap({ isAuthenticated });

  const { data: config } = useGetStartupConfig();
  const { data: termsData } = useUserTermsQuery({
    enabled: isAuthenticated && config?.interface?.termsOfService?.modalAcceptance === true,
  });

  useSearchEnabled(isAuthenticated);

  useEffect(() => {
    if (termsData) {
      setShowTerms(!termsData.termsAccepted);
    }
  }, [termsData]);

  const handleAcceptTerms = () => {
    setShowTerms(false);
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    logout();
  };

  if (!authChecked) {
    // Show minimal loading while checking auth (prevents landing page flash)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--main-surface-primary, #050505)',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: 'rgba(255,255,255,0.5)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // LAST RESORT, not the front door. The fix for "hanzo.chat shows a brochure" is
  // upstream of here — silent SSO adopts a hanzo.id session (utils/login.ts) and
  // the guest mint is no longer rate-limited out — so `showChat` is now true for
  // anyone who has any path to chat at all. This branch survives only for the
  // visitor who has NONE, because `ChatRoute` renders `null` when it cannot chat:
  // dropping the branch outright traded a brochure for a BLANK PANE in exactly
  // the state that was already broken. Something must always paint.
  //
  // This used to `return <LandingPage/>` whenever `isAuthenticated || isGuest` was
  // false, for EVERY route. Two independent failures then read as a design choice:
  // a signed-in hanzo.id user is anonymous here on first paint (different
  // registrable domains cannot share a cookie, and chat runs no `prompt=none`
  // authorize), and the guest-token mint answers 429 once its per-IP limiter is
  // spent. Either one alone downgraded the whole product to a marketing page and
  // swallowed deep links like `/c/new?q=…&submit=true` — the `q`/`submit` params
  // never reached AnswerEngine. A failure in an AUXILIARY token mint must never
  // decide what product the visitor sees.
  //
  // LandingPage also keeps an explicit home at /welcome, the way chatgpt.com/pricing
  // does, so marketing is reachable rather than only a failure state.
  // ...and ONLY at the root. A visitor sitting on /c/<id> has already expressed
  // intent; answering that URL with a brochure is wrong even as a last resort,
  // and it is what happened when a session expired mid-conversation — the page
  // silently became marketing under someone who was reading their own thread.
  // Everywhere else the shell renders and LoginGate asks for a session, which is
  // the honest thing to do with a route that names something specific.
  //
  // The gate comes WITH it. Reaching here at all means something was refused —
  // most often the guest mint's per-IP limiter — and a marketing page is not an
  // answer to that. `acquireGuest` names the reason (`unavailable`) and the gate
  // is the one component that says it; without it mounted here, the refusal was
  // dispatched into an empty room and the visitor saw a site with no composer and
  // no error.
  // ...and only for the tenant whose page it is. LandingPage carries Hanzo's
  // wordmark, Hanzo's copy and @hanzogui/shell's cross-app header and footer, and
  // one image serves every brand — so on lux.chat this branch answered a Lux
  // visitor with "Meet Hanzo · Hanzo Chat — Every Model, One Interface", 21 times
  // the word Hanzo and not once the word Lux. Guest chat is off there, which makes
  // `showChat` false for EVERY anonymous visitor, so the brochure was not a last
  // resort on that host: it was the front door.
  //
  // The org comes from the same runtime value the login SDK signs in against
  // (`window.__IAM__`), because a build-time constant would pin one brand
  // into an image two brands share. Falling through hands the visitor the chat
  // shell, which is this app's answer for every tenant.
  //
  // It briefly ALSO went to /login from there, and that was worse than the
  // brochure it replaced. `useAuthRedirect` navigated any visitor with no path
  // to chat to `/login`, which redirects to the issuer on sight — so a Lux
  // visitor got ~3s of empty canvas and then left the product entirely, having
  // seen none of it. Measured at 1440 and 390 against production. The hook is
  // deleted; a visitor who cannot chat stays here, and the sidebar foot's
  // Log in / Sign up is the offer. Seeing the product must not require a token.
  if (!showChat && location.pathname === '/' && IAM_ORG === 'hanzo') {
    return (
      <>
        <LandingPage />
        <LoginGate />
      </>
    );
  }

  return (
    <SetConvoProvider>
      <FileMapContext.Provider value={fileMap}>
        <AssistantsMapContext.Provider value={assistantsMap}>
          <AgentsMapContext.Provider value={agentsMap}>
            <PromptGroupsProvider>
              <ProjectBanner />
              {/* Mounted for every not-signed-in visitor, not just a minted guest:
                  a lapsed or unminted guest token is exactly the case that needs
                  the gate. */}
              {!isAuthenticated && <LoginGate />}
              {/* Mounted for everyone: a guest is served free on their first
                  send, and a signed-in visitor is offered free when the paid
                  route cannot serve. Both wait on the same consent. */}
              <Consent />
              <Banner onHeightChange={setBannerHeight} />
              <div className="flex" style={{ height: `calc(100dvh - ${bannerHeight}px)` }}>
                <div className="relative z-0 flex h-full w-full overflow-hidden">
                  {/* The backdrop paints behind the WHOLE app — sidebar included.
                      It used to mount inside Presentation, which put it BESIDE
                      the sidebar rather than under it, so the sidebar's glass
                      had nothing to show through and read as an opaque panel.
                      The scene composites on its own layer (a YouTube iframe),
                      so the content column below carries an explicit z-10 —
                      z-auto loses to a composited layer in a real (headed)
                      browser even though DOM order suggests otherwise; the
                      sidebar holds its own place (`.nav` is z-110). */}
                  <Backdrop />
                  <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
                  {/* The rail OVERLAYS on a phone — `.nav` is `position: fixed`
                      at z-110 — so the content underneath must not also be
                      pushed aside. Doing both drew one boolean twice: the
                      drawer covered the page AND slid it 320px right, which put
                      the hero at x=332 of a 390px viewport with `scrollWidth`
                      still 390. Clipped, not scrollable, so the text was simply
                      gone. A drawer that overlays is the whole treatment. */}
                  <div className="relative z-10 flex h-full max-w-full flex-1 flex-col overflow-hidden">
                    <MobileNav navVisible={navVisible} setNavVisible={setNavVisible} />
                    <Outlet context={{ navVisible, setNavVisible } satisfies ContextType} />
                  </div>
                </div>
              </div>
              {/* ⌘K, from any screen and at any width — which is why it hangs
                  here rather than off the sidebar that used to own the key. */}
              <Palette />
              {showSettings && (
                <Suspense fallback={null}>
                  <Settings open={showSettings} onOpenChange={setShowSettings} />
                </Suspense>
              )}
            </PromptGroupsProvider>
          </AgentsMapContext.Provider>
          {config?.interface?.termsOfService?.modalAcceptance === true && (
            <TermsAndConditionsModal
              open={showTerms}
              onOpenChange={setShowTerms}
              onAccept={handleAcceptTerms}
              onDecline={handleDeclineTerms}
              title={config.interface.termsOfService.modalTitle}
              modalContent={config.interface.termsOfService.modalContent}
            />
          )}
        </AssistantsMapContext.Provider>
      </FileMapContext.Provider>
    </SetConvoProvider>
  );
}
