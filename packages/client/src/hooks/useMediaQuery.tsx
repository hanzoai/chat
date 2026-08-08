import { useEffect, useState } from 'react';

/**
 * Answers the query from the FIRST render. It used to start `false` and correct
 * itself in an effect, which made every phone paint a desktop frame first: the
 * drawer mounted inline, the control rail mounted expanded (340px into a 390px
 * viewport), and anything measuring the page in those frames — or racing the
 * effect from localStorage — saw desktop geometry at phone width.
 */
/**
 * "Small screen" — the complement of Tailwind's `md:`, to the pixel.
 *
 * Tailwind's `md` is `min-width: 768px`, so `max-width: 768px` does NOT
 * complement it: both match AT exactly 768, and the two halves of a layout then
 * disagree about which one is showing. That is not hypothetical. At exactly
 * 768px the nav took its mobile branch — a closed, fixed drawer — while
 * `md:hidden` had already hidden MobileNav, the only control on screen that
 * opens it. The sidebar was shut with no way in: measured `[false,false,false,
 * false]` across three clicks at 768, against `[false,true,false,true]` at 767.
 * That is the shape of defect that ships — invisible at 767 and at 769,
 * permanent at 768.
 *
 * One query, named once. The nineteen call sites that each spelled the magic
 * string by hand were nineteen chances to keep spelling it wrong.
 */
export const SMALL_SCREEN_QUERY = '(max-width: 767.98px)';

export function useIsSmallScreen() {
  return useMediaQuery(SMALL_SCREEN_QUERY);
}

export default function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
