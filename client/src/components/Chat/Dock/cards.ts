/**
 * The dock's catalog — plain data, no components.
 *
 * A card is one embedded surface pinned beside the conversation: a live feed,
 * a world widget, an app preview. Adding one is adding a ROW here, never a
 * directory, so the dock and anything that lists its contents read the same
 * list. Same shape the commerce admin uses for its resources.
 *
 * `src` is loaded in an iframe, so every host here has to be allowed by the
 * server's CSP `frame-src` (api/server/csp.js). A card whose origin is not
 * allowed renders an empty frame and nothing says why — the guard is
 * cards.spec.ts, which fails if a card names an origin the policy omits.
 */
export type DockCard = {
  /** Stable key: the settings and the saved stack refer to a card by this. */
  id: string;
  label: string;
  /** One line, shown under the label — say what the card is FOR. */
  note: string;
  src: string;
  /** Height in the stack. Video wants 16:9; a widget wants to be taller. */
  aspect: 'video' | 'tall';
};

/** The origin of a card, for the CSP check. */
export const originOf = (src: string): string => new URL(src).origin;

export const DOCK_CARDS: DockCard[] = [
  {
    id: 'reef',
    label: 'Ambient reef',
    note: 'The canvas backdrop, docked — same footage, its own frame.',
    src: 'https://www.youtube.com/embed/6lZ3CookYNg?autoplay=1&mute=1&controls=0&loop=1&playlist=6lZ3CookYNg&rel=0&playsinline=1',
    aspect: 'video',
  },
  // world.hanzo.ai is HELD until it boots inside a partitioned cross-site
  // frame: it stores to IndexedDB, which third-party-storage partitioning
  // denies by default (Brave/Safari/Firefox-ETP/Chrome-incognito), so the
  // card rendered a permanent black box — the frame's own console throws
  // "The user denied permission to access the database." Origin-in-frame-src
  // is not the same as "it paints"; re-add it as a link-out card, or once the
  // embed survives partitioned storage.
];
