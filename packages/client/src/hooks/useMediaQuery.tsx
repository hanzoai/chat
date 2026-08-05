import { useEffect, useState } from 'react';

/**
 * Answers the query from the FIRST render. It used to start `false` and correct
 * itself in an effect, which made every phone paint a desktop frame first: the
 * drawer mounted inline, the control rail mounted expanded (340px into a 390px
 * viewport), and anything measuring the page in those frames — or racing the
 * effect from localStorage — saw desktop geometry at phone width.
 */
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
