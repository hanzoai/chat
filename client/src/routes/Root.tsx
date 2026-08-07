import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useIsSmallScreen, SMALL_SCREEN_QUERY } from '@hanzochat/client';
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
import { Nav, MobileNav, NAV_WIDTH } from '~/components/Nav';
import { TermsAndConditionsModal } from '~/components/ui';
import { useHealthCheck } from '~/data-provider';
import { Banner } from '~/components/Banners';
import Backdrop from '~/components/Chat/Backdrop';
import LandingPage from '~/components/Landing/LandingPage';
import LoginGate from '~/components/Auth/LoginGate';
import ProjectBanner from '~/components/Chat/ProjectBanner';

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  // The drawer's first-visit default is decided HERE, once, from the viewport:
  // canvas on desktop, chrome on a phone. It used to default `true` everywhere
  // and let an effect in Nav toggle phones closed after mount — an open→closed
  // flash at best, and at worst the effect re-ran before the first toggle's
  // localStorage write landed and toggled BACK, leaving a fresh phone with the
  // drawer open over the pushed-aside chat. A default is not a choice, so
  // nothing is written to localStorage until the user actually toggles.
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    if (savedNavVisible !== null) {
      return JSON.parse(savedNavVisible);
    }
    return !window.matchMedia(SMALL_SCREEN_QUERY).matches;
  });

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
    logout('/login?redirect=false');
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
  if (!showChat && location.pathname === '/') {
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
                  <div
                    className="relative z-10 flex h-full max-w-full flex-1 flex-col overflow-hidden"
                    style={
                      isSmallScreen
                        ? {
                            transform: navVisible
                              ? `translateX(${NAV_WIDTH.MOBILE}px)`
                              : 'translateX(0)',
                            transition: 'transform 0.2s ease-out',
                          }
                        : undefined
                    }
                  >
                    <MobileNav navVisible={navVisible} setNavVisible={setNavVisible} />
                    <Outlet context={{ navVisible, setNavVisible } satisfies ContextType} />
                  </div>
                </div>
              </div>
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
