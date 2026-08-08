import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import throttle from 'lodash/throttle';
import { useAtomValue, useSetAtom } from 'jotai';
import { getConfigDefaults } from '@hanzochat/data-provider';
import { ResizablePanel, ResizablePanelGroup, useMediaQuery } from '@hanzochat/client';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useGetStartupConfig } from '~/data-provider';
import ArtifactsPanel from './ArtifactsPanel';
import Dock from '~/components/Chat/Dock/Dock';
import { normalizeLayout, cn } from '~/utils';
import SidePanel from './SidePanel';
import store from '~/store';

interface SidePanelProps {
  defaultLayout?: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize?: number;
  fullPanelCollapse?: boolean;
  artifacts?: React.ReactNode;
  children: React.ReactNode;
}

const defaultMinSize = 20;
const defaultInterface = getConfigDefaults().interface;

const SidePanelGroup = memo(
  ({
    defaultLayout = [97, 3],
    defaultCollapsed = false,
    fullPanelCollapse = false,
    navCollapsedSize = 3,
    artifacts,
    children,
  }: SidePanelProps) => {
    const { data: startupConfig } = useGetStartupConfig();
    const interfaceConfig = useMemo(
      () => startupConfig?.interface ?? defaultInterface,
      [startupConfig],
    );

    const panelRef = useRef<ImperativePanelHandle>(null);
    const [minSize, setMinSize] = useState(defaultMinSize);
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [fullCollapse, setFullCollapse] = useState(fullPanelCollapse);
    const [collapsedSize, setCollapsedSize] = useState(navCollapsedSize);
    const [shouldRenderArtifacts, setShouldRenderArtifacts] = useState(artifacts != null);

    const isSmallScreen = useMediaQuery('(max-width: 767px)');
    // The dock needs room for BOTH panes, which is a higher bar than 'not a
    // phone'. At 1024 a 30% dock left the conversation 357px — narrower than
    // the 390px phone layout the messages are designed for, with the starter
    // chips wrapping to two rows. Below this the dock is not shown at all
    // rather than shown badly.
    const hasRoomForDock = useMediaQuery('(min-width: 1280px)');
    const hideSidePanel = useAtomValue(store.hideSidePanel);
    const showDock = useAtomValue(store.showDock);
    const setSidePanelOpen = useSetAtom(store.sidePanelOpen);

    const calculateLayout = useCallback(() => {
      if (artifacts == null) {
        // The nav is the LAST size in the saved layout, because it is the last
        // panel (SidePanel is order 4, above every sibling). Reading it by a
        // fixed index — `length === 2 ? [1] : [2]` — assumed the only thing that
        // could sit between the messages and the nav was the artifacts panel.
        // Once the dock could too, index 2 was the DOCK, so the nav rail was
        // seeded with the dock's 30% and grew on every reload: 50px -> 272px ->
        // 352px, and it SURVIVED turning the dock off, because by then the
        // poisoned width had been saved as the nav's own. It also slipped the
        // `layout[last] <= 40` guard, since 30 is a legal nav width — the value
        // was plausible, it just belonged to another panel.
        const navSize = defaultLayout[defaultLayout.length - 1];
        return [100 - navSize, navSize];
      } else {
        const navSize = 0;
        const remainingSpace = 100 - navSize;
        const newMainSize = Math.floor(remainingSpace / 2);
        const artifactsSize = remainingSpace - newMainSize;
        return [newMainSize, artifactsSize, navSize];
      }
    }, [artifacts, defaultLayout]);

    const currentLayout = useMemo(() => normalizeLayout(calculateLayout()), [calculateLayout]);

    const throttledSaveLayout = useMemo(
      () =>
        throttle((sizes: number[]) => {
          const normalizedSizes = normalizeLayout(sizes);
          localStorage.setItem('react-resizable-panels:layout', JSON.stringify(normalizedSizes));
        }, 350),
      [],
    );

    useEffect(() => {
      if (isSmallScreen) {
        setIsCollapsed(true);
        setCollapsedSize(0);
        setMinSize(defaultMinSize);
        setFullCollapse(true);
        localStorage.setItem('fullPanelCollapse', 'true');
        panelRef.current?.collapse();
        return;
      } else {
        setIsCollapsed(defaultCollapsed);
        setCollapsedSize(navCollapsedSize);
        setMinSize(defaultMinSize);
      }
    }, [isSmallScreen, defaultCollapsed, navCollapsedSize, fullPanelCollapse]);

    const minSizeMain = useMemo(() => (artifacts != null ? 15 : 30), [artifacts]);

    /** The backdrop closes the panel the same way every other control does. */
    const handleClosePanel = useCallback(() => setSidePanelOpen(false), [setSidePanelOpen]);

    return (
      <>
        {/* No background on the group: the canvas is painted once, by
            Presentation's wrapper — an opaque sheet here sits ABOVE the
            Backdrop layer and was exactly what hid the ambient video. */}
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={(sizes) => throttledSaveLayout(sizes)}
          className="relative h-full w-full flex-1 overflow-auto"
        >
          <ResizablePanel
            defaultSize={currentLayout[0]}
            minSize={minSizeMain}
            order={1}
            id="messages-view"
          >
            {children}
          </ResizablePanel>

          {!isSmallScreen && (
            <ArtifactsPanel
              artifacts={artifacts}
              currentLayout={currentLayout}
              minSizeMain={minSizeMain}
              shouldRender={shouldRenderArtifacts}
              onRenderChange={setShouldRenderArtifacts}
            />
          )}

          {/* The dock is a sibling of the artifacts panel, not a layer over the
              chat: one group owns the horizontal split, so chat, artifacts and
              dock resize against each other and one saved layout describes the
              row. Wide screens only (see hasRoomForDock) — a dock that leaves
              the conversation narrower than a phone is worse than no dock. */}
          {hasRoomForDock && showDock && (
            <Dock defaultSize={30} minSizeMain={minSizeMain} />
          )}

          {!hideSidePanel && interfaceConfig.sidePanel === true && (
            <SidePanel
              panelRef={panelRef}
              minSize={minSize}
              setMinSize={setMinSize}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              collapsedSize={collapsedSize}
              setCollapsedSize={setCollapsedSize}
              fullCollapse={fullCollapse}
              setFullCollapse={setFullCollapse}
              interfaceConfig={interfaceConfig}
              hasArtifacts={shouldRenderArtifacts}
              defaultSize={currentLayout[currentLayout.length - 1]}
            />
          )}
        </ResizablePanelGroup>
        {artifacts != null && isSmallScreen && (
          <div className="fixed inset-0 z-[100]">{artifacts}</div>
        )}
        {!hideSidePanel && interfaceConfig.sidePanel === true && (
          <button
            onClick={handleClosePanel}
            aria-label="Close right side panel"
            className={cn('sidenav-mask', !isCollapsed ? 'active' : '')}
          />
        )}
      </>
    );
  },
);

SidePanelGroup.displayName = 'SidePanelGroup';

export default SidePanelGroup;
