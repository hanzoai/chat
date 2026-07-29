import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useMediaQuery } from '@hanzochat/client';
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
import LoginGate from '~/components/Auth/LoginGate';
import ProjectBanner from '~/components/Chat/ProjectBanner';

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    return savedNavVisible !== null ? JSON.parse(savedNavVisible) : true;
  });

  const { isAuthenticated, logout, token } = useAuthContext();
  const [authChecked, setAuthChecked] = useState(false);

  // Guests get the chat UI without a full session. Capability-scoped hooks below
  // stay gated on `isAuthenticated`, so guests never query agents/files/search —
  // and so does an anonymous visitor, who now reaches this shell too.

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
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

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

  // NO front-door branch. The app IS the landing (ChatGPT's shape): an anonymous
  // visitor gets the composer, not a brochure, and `LoginGate` — already mounted
  // for every `!isAuthenticated` visitor — asks for a session at the moment they
  // submit, which is the first moment one is actually needed.
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
  // LandingPage is not deleted: it is marketing, and marketing keeps a home at an
  // explicit route the way chatgpt.com/pricing does. It is simply no longer what
  // answers `/`.

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
                  <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
                  <div
                    className="relative flex h-full max-w-full flex-1 flex-col overflow-hidden"
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
