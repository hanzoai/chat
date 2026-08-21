import { pinned } from '@hanzo/ui/chat';
import { useEffect, useState } from 'react';

interface UseAutoScrollProps {
  ref: React.RefObject<HTMLElement | null>;
  content: string;
  isSubmitting: boolean;
}

export const useAutoScroll = ({ ref, content, isSubmitting }: UseAutoScrollProps) => {
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    const scrollContainer = ref.current;
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      setUserScrolled(
        !pinned({ offset: scrollTop, viewport: clientHeight, content: scrollHeight }),
      );
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [ref]);

  useEffect(() => {
    const scrollContainer = ref.current;
    if (!scrollContainer || !isSubmitting || userScrolled) {
      return;
    }

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [content, isSubmitting, userScrolled, ref]);

  return { userScrolled };
};
