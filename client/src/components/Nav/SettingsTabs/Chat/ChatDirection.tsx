import React from 'react';
import { useAtom } from 'jotai';
import { Button } from '@hanzochat/client';
import { useLocalize } from '~/hooks';
import store from '~/store';

const ChatDirection = () => {
  const [direction, setDirection] = useAtom(store.chatDirection);
  const localize = useLocalize();

  const toggleChatDirection = () => {
    setDirection((prev) => (prev === 'LTR' ? 'RTL' : 'LTR'));
  };

  // The readable phrase, for everyone. It was already translated into all 41
  // locales and already computed here — and then spent only on the aria-label,
  // while the visible face of the same control showed `direction.toLowerCase()`.
  // So a screen reader announced "Left to Right" and the screen said "ltr": the
  // untranslated internal token, sitting between two neighbours that read
  // "Medium" and "Video".
  const label =
    direction === 'LTR'
      ? localize('chat_direction_left_to_right')
      : localize('chat_direction_right_to_left');

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span id="chat-direction-label">{localize('com_nav_chat_direction')}</span>
      </div>
      <Button
        variant="outline"
        aria-label={localize('com_nav_chat_direction_selected', { direction: label })}
        onClick={toggleChatDirection}
        data-testid="chatDirection"
      >
        {label}
      </Button>
    </div>
  );
};

export default ChatDirection;
