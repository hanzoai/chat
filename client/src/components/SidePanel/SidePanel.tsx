import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { getEndpointField } from '@hanzochat/data-provider';
import { useUserKeyQuery } from '@hanzochat/data-provider/react-query';
import { ResizableHandleAlt, ResizablePanel, useMediaQuery } from '@hanzochat/client';
import type { TEndpointsConfig, TInterfaceConfig } from '@hanzochat/data-provider';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import { useLocalStorage, useLocalize } from '~/hooks';
import { useGetEndpointsQuery } from '~/data-provider';
import NavToggle from '~/components/Nav/NavToggle';
import { useSidePanelContext } from '~/Providers';
import { cn } from '~/utils';
import store from '~/store';
import Nav from './Nav';

const defaultMinSize = 20;

const SidePanel = ({
  defaultSize,
  panelRef,
  navCollapsedSize = 3,
  hasArtifacts,
  minSize,
  setMinSize,
  collapsedSize,
  setCollapsedSize,
  isCollapsed,
  setIsCollapsed,
  fullCollapse,
  setFullCollapse,
  interfaceConfig,
}: {
  defaultSize?: number;
  hasArtifacts: boolean;
  navCollapsedSize?: number;
  minSize: number;
  setMinSize: React.Dispatch<React.SetStateAction<number>>;
  collapsedSize: number;
  setCollapsedSize: React.Dispatch<React.SetStateAction<number>>;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  fullCollapse: boolean;
  setFullCollapse: React.Dispatch<React.SetStateAction<boolean>>;
  panelRef: React.RefObject<ImperativePanelHandle | null>;
  interfaceConfig: TInterfaceConfig;
}) => {
  const localize = useLocalize();
  const { endpoint } = useSidePanelContext();
  const [isHovering, setIsHovering] = useState(false);
  const [newUser, setNewUser] = useLocalStorage('newUser', true);
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const isSmallScreen = useMediaQuery('(max-width: 767px)');

  /* Member-only route: a guest bearer is refused, so asking as one only logs a 401. */
  const isAuthenticated = useAtomValue<boolean>(store.isAuthenticated);
  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '', {
    enabled: isAuthenticated,
  });

  const defaultActive = useMemo(() => {
    const activePanel = localStorage.getItem('side:active-panel');
    return typeof activePanel === 'string' ? activePanel : undefined;
  }, []);

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );
  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  /**
   * `store.sidePanelOpen` is the truth about whether this panel is open, and
   * these two drive the imperative panel to match it. It used to live in this
   * subtree's React state, so the only controls that could reach it were the
   * ones rendered inside it.
   */
  const [sidePanelOpen, setSidePanelOpen] = useAtom(store.sidePanelOpen);

  const showPanel = useCallback(() => {
    setIsCollapsed(false);
    setMinSize(defaultMinSize);
    setCollapsedSize(navCollapsedSize);
    setFullCollapse(false);
    localStorage.setItem('fullPanelCollapse', 'false');
    panelRef.current?.expand();
  }, [panelRef, setMinSize, setIsCollapsed, setFullCollapse, setCollapsedSize, navCollapsedSize]);

  const hidePanel = useCallback(() => {
    setIsCollapsed(true);
    setCollapsedSize(0);
    setMinSize(defaultMinSize);
    setFullCollapse(true);
    localStorage.setItem('fullPanelCollapse', 'true');
    panelRef.current?.collapse();
  }, [panelRef, setMinSize, setIsCollapsed, setFullCollapse, setCollapsedSize]);

  /* A small screen collapses the panel unconditionally (SidePanelGroup), so
     reconciling there would fight it and reopen a panel that covers the chat. */
  useEffect(() => {
    if (isSmallScreen) {
      return;
    }
    if (sidePanelOpen) {
      showPanel();
    } else {
      hidePanel();
    }
  }, [sidePanelOpen, isSmallScreen, showPanel, hidePanel]);

  const closePanel = useCallback(() => setSidePanelOpen(false), [setSidePanelOpen]);

  const Links = useSideNavLinks({
    endpoint,
    hidePanel: closePanel,
    keyProvided,
    endpointType,
    interfaceConfig,
    endpointsConfig,
  });

  const toggleNavVisible = useCallback(() => {
    if (newUser) {
      setNewUser(false);
    }
    setSidePanelOpen((prev) => !prev);
  }, [newUser, setNewUser, setSidePanelOpen]);

  return (
    <>
      {/* The chevron is hover-revealed (opacity 0 at rest), so on a touch width
          it is an invisible control — and `fixed` inside the translated content
          column, it leaves the viewport whenever the drawer opens (x=670 at
          390px). A control nobody can see or reach is not rendered at all. */}
      {!isSmallScreen && (
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="relative flex w-px items-center justify-center"
        >
          <NavToggle
            navVisible={!isCollapsed}
            isHovering={isHovering}
            onToggle={toggleNavVisible}
            setIsHovering={setIsHovering}
            className={cn(
              'fixed top-1/2',
              (isCollapsed && (minSize === 0 || collapsedSize === 0)) || fullCollapse
                ? 'mr-9'
                : 'mr-16',
            )}
            translateX={false}
            side="right"
          />
        </div>
      )}
      {(!isCollapsed || minSize > 0) && !isSmallScreen && !fullCollapse && (
        <ResizableHandleAlt withHandle className="bg-transparent text-text-primary" />
      )}
      <ResizablePanel
        tagName="nav"
        id="controls-nav"
        // ALWAYS LAST, and fixed rather than conditional. Panels are laid out in
        // `order`, and the saved layout is an array of sizes in that same order,
        // so "the nav is the last element" is the contract SidePanelGroup reads
        // sizes back through. Expressing it as `hasArtifacts ? 3 : 2` made that
        // contract depend on WHICH other panels happened to be mounted: add a
        // third panel (the dock, order 3) with the artifacts panel closed and
        // the nav sorts to the MIDDLE, so the restore read the dock's width as
        // the nav's and the rail grew every reload. A constant above every other
        // panel cannot be overtaken by a panel added later.
        order={4}
        aria-label={localize('com_ui_controls')}
        role="navigation"
        collapsedSize={collapsedSize}
        defaultSize={defaultSize}
        collapsible={true}
        minSize={minSize}
        maxSize={40}
        ref={panelRef}
        style={{
          overflowY: 'auto',
          transition: 'width 0.2s ease, visibility 0s linear 0.2s',
        }}
        onExpand={() => {
          if (isCollapsed && (fullCollapse || collapsedSize === 0)) {
            return;
          }
          setIsCollapsed(false);
          localStorage.setItem('react-resizable-panels:collapsed', 'false');
        }}
        onCollapse={() => {
          setIsCollapsed(true);
          localStorage.setItem('react-resizable-panels:collapsed', 'true');
        }}
        className={cn(
          'sidenav hide-scrollbar glass hz-column border-l border-border-light py-1 transition-opacity',
          isCollapsed ? 'min-w-[50px]' : 'min-w-[340px] sm:min-w-[352px]',
          (isSmallScreen && isCollapsed && (minSize === 0 || collapsedSize === 0)) || fullCollapse
            ? 'hidden min-w-0'
            : 'opacity-100',
        )}
      >
        <Nav
          resize={panelRef.current?.resize}
          isCollapsed={isCollapsed}
          defaultActive={defaultActive}
          links={Links}
        />
      </ResizablePanel>
    </>
  );
};

export default memo(SidePanel);
