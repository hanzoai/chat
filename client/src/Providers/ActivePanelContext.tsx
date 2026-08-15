import { createContext, useContext, useState, ReactNode } from 'react';

/** Where the sidebar's choice is kept between visits. */
const STORAGE_KEY = 'side:active-panel';

/** The panel a visitor lands on before choosing one. */
export const DEFAULT_PANEL = 'conversations';

interface ActivePanelContextType {
  active: string;
  setActive: (id: string) => void;
}

const ActivePanelContext = createContext<ActivePanelContextType | undefined>(undefined);

export function ActivePanelProvider({
  children,
  defaultActive,
}: {
  children: ReactNode;
  defaultActive?: string;
}) {
  // The stored choice first: setActive has always written it, and nothing ever
  // read it back, so the sidebar forgot which panel you were on at every reload.
  const [active, _setActive] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? defaultActive ?? DEFAULT_PANEL,
  );

  const setActive = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    _setActive(id);
  };

  return (
    <ActivePanelContext.Provider value={{ active, setActive }}>
      {children}
    </ActivePanelContext.Provider>
  );
}

export function useActivePanel() {
  const context = useContext(ActivePanelContext);
  if (context === undefined) {
    throw new Error('useActivePanel must be used within an ActivePanelProvider');
  }
  return context;
}

/**
 * The panel to actually show, given the one that was chosen and the ones on
 * offer.
 *
 * A stored choice outlives the panel it names — a link is removed, or a visitor
 * loses access to it — and rendering that name selects nothing, leaving the
 * sidebar with every link inactive and no content. So an unrecognized choice
 * falls back to the first link on offer.
 *
 * With no links at all there is nothing to fall back TO, and the chosen name is
 * returned untouched: an empty list means the links have not arrived yet, and
 * overwriting the choice there would discard it before it could be honored.
 */
export function resolveActivePanel(active: string, links: Array<{ id: string }>): string {
  if (!links.length) {
    return active;
  }
  return links.some((link) => link.id === active) ? active : links[0].id;
}
