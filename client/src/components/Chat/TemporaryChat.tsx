import React, { useCallback } from 'react';
import { TooltipAnchor } from '@hanzochat/client';
import { MessageCircleDashed } from 'lucide-react';
import { useAtom } from 'jotai';
import { useChatContext } from '~/Providers';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export function TemporaryChat() {
  const localize = useLocalize();
  const [isTemporary, setIsTemporary] = useAtom(store.isTemporary);
  const { conversation, isSubmitting } = useChatContext();

  const temporaryBadge = {
    id: 'temporary',
    atom: store.isTemporary,
    isAvailable: true,
  };

  const handleBadgeToggle = useCallback(() => {
    setIsTemporary(!isTemporary);
  }, [isTemporary, setIsTemporary]);

  if (
    (Array.isArray(conversation?.messages) && conversation.messages.length >= 1) ||
    isSubmitting
  ) {
    return null;
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <TooltipAnchor
        description={localize('com_ui_temporary')}
        render={
          <button
            onClick={handleBadgeToggle}
            aria-label={localize('com_ui_temporary')}
            aria-pressed={isTemporary}
            className={cn(CONTROL, isTemporary && 'bg-surface-active')}
          >
            <MessageCircleDashed aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
