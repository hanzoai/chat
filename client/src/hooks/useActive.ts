import { useEffect, useRef, useState } from 'react';

/**
 * Whether the menu item this ref is attached to is the one the menu considers
 * active.
 *
 * Ariakit marks the active row with a `data-active-item` attribute rather than
 * handing it down as a prop, so watching the attribute is the only way to read
 * it. Both rows in the model menu need the answer for the same reason: a pin
 * button nested inside a row must be reachable by Tab only when its row is the
 * active one, or every row in a long list becomes a tab stop.
 */
export default function useActive<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const read = () => setIsActive(element.hasAttribute('data-active-item'));
    const observer = new MutationObserver(read);
    observer.observe(element, { attributes: true, attributeFilter: ['data-active-item'] });
    read();

    return () => observer.disconnect();
  }, []);

  return { ref, isActive };
}
