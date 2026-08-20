import { QueryKeys } from '@hanzochat/data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircleDashed } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { TooltipAnchor, Button, NewChatIcon } from '@hanzochat/client';
import { useChatContext } from '~/Providers';
import { clearMessagesCache, cn } from '~/utils';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * Starting a conversation — and the one choice you make while starting it.
 *
 * Private used to live at the FAR RIGHT of the header, in the cluster of things
 * that act on the open conversation. It does not act on the open conversation;
 * it decides what the NEXT one is, which is why it hid itself the moment a
 * thread had a message in it. So it was a control about starting, seated among
 * controls about continuing, at the opposite end of the row from the button
 * that starts things. It sits next to New chat now, which is where the decision
 * is actually made.
 *
 * It appears ON HOVER and holds its seat when it doesn't. The slot is always
 * there — the button is only transparent — so nothing in the row moves when the
 * pointer arrives, which is the whole reason this is a neighbouring button
 * rather than a menu: a menu here would have to be portalled (the header row is
 * `overflow-x-auto` and would clip it), and a portalled menu opened by hover has
 * to keep a hover chain across a portal boundary, which is a lot of machinery to
 * reveal one control.
 *
 * `pointer-events` follow the opacity. An invisible button that can still be
 * clicked is a trap, and this one sits a thumb's width from New chat.
 */
export default function HeaderNewChat() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { conversation, newConversation } = useChatContext();
  const setIsTemporary = useSetAtom(store.isTemporary);

  const fresh = () => {
    clearMessagesCache(queryClient, conversation?.conversationId);
    queryClient.invalidateQueries([QueryKeys.messages]);
    newConversation();
  };

  const clickHandler: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      window.open('/', '_blank');
      return;
    }
    setIsTemporary(false);
    fresh();
  };

  return (
    <div className="group/new flex items-center gap-0.5">
      <TooltipAnchor
        description={localize('com_ui_new_chat')}
        render={
          <Button
            size="icon"
            variant="outline"
            data-testid="wide-header-new-chat-button"
            aria-label={localize('com_ui_new_chat')}
            className={cn(CONTROL, 'max-md:hidden')}
            onClick={clickHandler}
          >
            <NewChatIcon />
          </Button>
        }
      />
      <TooltipAnchor
        description={localize('com_ui_temporary')}
        render={
          <Button
            size="icon"
            variant="outline"
            data-testid="header-private-chat-button"
            aria-label={localize('com_ui_temporary')}
            className={cn(
              CONTROL,
              'max-md:hidden',
              'pointer-events-none opacity-0 transition-opacity',
              'group-hover/new:pointer-events-auto group-hover/new:opacity-100',
              'group-focus-within/new:pointer-events-auto group-focus-within/new:opacity-100',
            )}
            onClick={() => {
              setIsTemporary(true);
              fresh();
            }}
          >
            <MessageCircleDashed aria-hidden="true" />
          </Button>
        }
      />
    </div>
  );
}
